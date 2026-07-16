import { Router } from 'express';
import { randomUUID } from 'crypto';
import { generateWithFallback, logStep } from '../geminiClient.js';
import { checkRateLimit } from '../middleware/rateLimit.js';
import { savePrompt, saveMessage, updateChatSession, getChatSessionById, savePromptVersion, getPromptVersionsByChatId } from '../db/store.js';
import { buildFullMetaPrompt } from '../prompts/metaPrompt.js';
import type { MasterPromptRequest, Message, MasterPromptSpec, SectionSpec } from '../src/types/index.js';

const router = Router();

/**
 * Derive SectionSpec[] from a master prompt string by splitting on the
 * `=== SECTION N: NAME ===` headers the LLM is instructed to emit.
 * Anything before the first header becomes an implicit intro section.
 */
function splitSections(prompt: string): SectionSpec[] {
  if (!prompt) return [];
  const headerRe = /^=== SECTION \s*(\d+)\s*:\s*(.+?)\s*===\s*$/gim;
  const sections: SectionSpec[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let first = true;

  while ((match = headerRe.exec(prompt)) !== null) {
    const start = match.index;
    if (first) {
      const intro = prompt.slice(0, start).trim();
      if (intro) {
        sections.push({ id: randomUUID(), title: 'Overview', body: intro });
      }
      first = false;
    } else if (start > lastIndex) {
      const body = prompt.slice(lastIndex, start).trim();
      if (body) sections[sections.length - 1].body += `\n\n${body}`;
    }
    sections.push({ id: randomUUID(), title: match[2].trim(), body: '' });
    lastIndex = headerRe.lastIndex;
  }

  if (sections.length === 0) return [];
  const tail = prompt.slice(lastIndex).trim();
  if (tail) {
    if (sections.length > 0) sections[sections.length - 1].body += `\n\n${tail}`;
  }
  return sections;
}


function getClientIp(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

function buildConversationSummary(messages: Message[]): string {
  if (!messages || messages.length === 0) return '(no prior conversation)';

  const recent = messages.slice(-10);
  return recent
    .map((m) => {
      const label = m.role === 'user' ? 'User' : 'Designer';
      const preview = m.content.length > 300 ? m.content.slice(0, 300) + '...' : m.content;
      return `${label}: ${preview}`;
    })
    .join('\n');
}

router.post('/', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const rateCheck = checkRateLimit(ip);

    if (!rateCheck.allowed) {
      res.status(429).json({
        error: 'Daily limit reached. You can generate up to 5 master prompts per day.',
        code: 'RATE_LIMIT',
        resetTime: rateCheck.resetTime,
        remaining: rateCheck.remaining,
      });
      return;
    }

    const { chatId, presetKey, metadata, idea, conversationHistory } = (req.body ?? {}) as MasterPromptRequest & {
      chatId?: string;
      presetKey?: string;
      metadata?: {
        websiteType?: string;
        audience?: string;
        goal?: string;
        preferredStack?: string;
        style?: string;
      };
    };

    if (!idea && (!conversationHistory || conversationHistory.length === 0)) {
      res.status(400).json({ error: 'Missing idea or conversation history in request body.', code: 'INVALID_REQUEST' });
      return;
    }

    if (idea && idea.length > 10000) {
      res.status(400).json({ error: 'Idea exceeds maximum length (10000 characters).', code: 'INVALID_REQUEST' });
      return;
    }

    const conversationSummary = buildConversationSummary(conversationHistory as Message[] || []);

    const userContent = [
      'USER IDEA:',
      idea || '(not provided)',
      '',
      'USER PREFERENCES (FORM):',
      metadata
        ? JSON.stringify(metadata, null, 2)
        : '(none specified — use defaults)',
      '',
      'CONVERSATION HIGHLIGHTS:',
      conversationSummary,
    ].join('\n');

    const systemPrompt = buildFullMetaPrompt(presetKey, metadata);

    let raw: string;
    let spec: MasterPromptSpec;
    let meta: any = undefined;
    const requestId = (req.body?.requestId as string | undefined) || undefined;
    try {
      const result = await generateWithFallback(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        {
          temperature: 0.6,
          topP: 0.9,
          maxTokens: 8192,
          responseFormat: { type: 'json_object' },
        },
        requestId,
      );

      raw = result.content;
      meta = result.meta;
      logStep('master', 'generation-done', {
        requestId,
        chatId,
        contentLen: raw.length,
      });
    } catch (genErr: any) {
      console.error('OpenCode generation failed:', genErr);
      const isRateLimit = genErr?.message?.includes('rate limit') || genErr?.message?.includes('429');
      res.status(isRateLimit ? 429 : 502).json({
        error: isRateLimit
          ? 'Upstream rate limit exceeded. Please try again later.'
          : 'Failed to generate response from AI service.',
        code: isRateLimit ? 'UPSTREAM_RATE_LIMIT' : 'UPSTREAM_ERROR',
        remaining: rateCheck.remaining,
        // Always surface per-model attempts so the client knows what happened.
        attempts: genErr?.attempts ?? meta?.attempts ?? [],
      });
      return;
    }

    // ── Normalize the raw LLM output into the structured MasterPromptSpec ──
    // Robust migration: accept both the new `prompt` key and the legacy
    // `masterPrompt` key; fall back to the whole string if JSON parse fails.
    let parsedObj: any = null;
    try {
      parsedObj = JSON.parse(raw);
    } catch (parseErr) {
      console.error('Failed to parse JSON from OpenCode:', parseErr);
      console.error('Raw response (first 500 chars):', raw.slice(0, 500));
    }

    const promptText: string =
      (parsedObj && (parsedObj.prompt ?? parsedObj.masterPrompt)) ||
      raw ||
      'Failed to generate master prompt.';
    const summaryText: string = (parsedObj && parsedObj.summary) || '';
    const analysisText: string = (parsedObj && parsedObj.analysis) || '';

    const id = randomUUID();
    spec = {
      id,
      summary: summaryText,
      analysis: analysisText,
      prompt: promptText,
      sections: splitSections(promptText),
      createdAt: new Date().toISOString(),
      meta,
    };

    const title = idea
      ? idea.slice(0, 80) + (idea.length > 80 ? '...' : '')
      : 'Untitled Prompt';

    let saved, versionedRecord;
    try {
      // DB still stores the prompt string under `masterPrompt`.
      saved = savePrompt(title, spec.summary, spec.prompt, chatId);
      logStep('master', 'saved-prompt', { requestId, chatId, promptId: saved?.id });
    } catch (dbErr) {
      console.error('DB savePrompt failed:', dbErr);
    }

    try {
      if (chatId) {
        const existingVersions = getPromptVersionsByChatId(chatId);
        const isFirstVersion = existingVersions.length === 0;
        versionedRecord = savePromptVersion({
          chatId,
          title,
          summary: spec.summary,
          analysis: spec.analysis,
          masterPrompt: spec.prompt,
          isPinned: isFirstVersion,
        });
        logStep('master', 'saved-version', {
          requestId,
          chatId,
          versionId: versionedRecord?.id,
          version: versionedRecord?.version,
        });
      }
    } catch (dbErr) {
      console.error('DB savePromptVersion failed:', dbErr);
    }

    try {
      if (chatId) {
        // Compact server-side mirror; the rich panel lives in the frontend bubble.
        saveMessage({
          chatId,
          role: 'assistant',
          content: 'Master prompt generated.',
        });
        logStep('master', 'saved-assistant-msg', { requestId, chatId });
        const chat = getChatSessionById(chatId);
        if (chat && chat.isDefaultTitle) {
          updateChatSession(chatId, { title, isDefaultTitle: false });
        }
      }
    } catch (dbErr) {
      console.error('DB saveMessage/updateChatSession failed:', dbErr);
    }

    logStep('master', 'sending-response', {
      requestId,
      chatId,
      status: 200,
      hasMeta: Boolean(meta),
      hasPrompt: Boolean(spec.prompt),
      sections: spec.sections.length,
      attempts: meta?.attempts?.length,
    });
    res.json({
      ...spec,
      chatId,
      promptId: versionedRecord?.id ?? null,
      version: versionedRecord?.version ?? null,
      isPinned: versionedRecord?.isPinned ?? null,
      timestamp: saved?.timestamp ?? Date.now(),
      remaining: rateCheck.remaining,
    });
  } catch (error: any) {
    console.error('Error in /api/master-prompt:', error);
    const isRateLimit = error?.message?.includes('rate limit') || error?.message?.includes('429');
    res.status(isRateLimit ? 429 : 500).json({
      error: error?.message || 'Failed to generate master prompt',
      code: isRateLimit ? 'RATE_LIMIT' : 'SERVER_ERROR',
      remaining: rateCheck?.remaining ?? 0,
    });
  }
});

export default router;