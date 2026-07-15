import { Router } from 'express';
import { generateWithFallback } from '../geminiClient.js';
import { checkRateLimit } from '../middleware/rateLimit.js';
import { savePrompt, saveMessage, updateChatSession, getChatSessionById, savePromptVersion, getPromptVersionsByChatId } from '../db/store.js';
import { buildFullMetaPrompt } from '../prompts/metaPrompt.js';
import type { MasterPromptRequest, Message } from '../src/types/index.js';

const router = Router();

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
        resetTime: rateCheck.resetTime,
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
      res.status(400).json({ error: 'Missing idea or conversation history in request body.' });
      return;
    }

    if (idea && idea.length > 10000) {
      res.status(400).json({ error: 'Idea exceeds maximum length (10000 characters).' });
      return;
    }

    const conversationSummary = buildConversationSummary(conversationHistory as Message[] || []);

    // Build structured user content with labeled blocks
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

    // Build meta-prompt with preset-specific instructions
    const systemPrompt = buildFullMetaPrompt(presetKey, metadata);

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
      }
    );

    const raw = result.content;

    let parsed: { summary: string; analysis: string; masterPrompt: string };
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.error('Failed to parse JSON from OpenCode:', parseErr);
      console.error('Raw response (first 500 chars):', raw.slice(0, 500));
      parsed = {
        summary: '',
        analysis: '',
        masterPrompt: raw || 'Failed to generate master prompt.',
      };
    }

    const title = idea
      ? idea.slice(0, 80) + (idea.length > 80 ? '...' : '')
      : 'Untitled Prompt';

    const saved = savePrompt(title, parsed.summary ?? '', parsed.masterPrompt ?? '', chatId);

    // Save versioned prompt record
    let versionedRecord = null;
    if (chatId) {
      const existingVersions = getPromptVersionsByChatId(chatId);
      const isFirstVersion = existingVersions.length === 0;
      versionedRecord = savePromptVersion({
        chatId,
        title,
        summary: parsed.summary ?? '',
        analysis: parsed.analysis ?? '',
        masterPrompt: parsed.masterPrompt ?? '',
        isPinned: isFirstVersion,
      });
    }

    // Save assistant message to chat if chatId provided
    if (chatId) {
      saveMessage({
        chatId,
        role: 'assistant',
        content: `Here's your master prompt:\n\n${(parsed.masterPrompt ?? '').slice(0, 500)}${(parsed.masterPrompt ?? '').length > 500 ? '...' : ''}`,
      });
      // Update chat title if it was default
      const chat = getChatSessionById(chatId);
      if (chat && chat.isDefaultTitle) {
        updateChatSession(chatId, { title, isDefaultTitle: false });
      }
    }

    res.json({
      id: saved.id,
      chatId,
      promptId: versionedRecord?.id ?? null,
      version: versionedRecord?.version ?? null,
      isPinned: versionedRecord?.isPinned ?? null,
      summary: parsed.summary ?? '',
      analysis: parsed.analysis ?? '',
      masterPrompt: parsed.masterPrompt ?? '',
      timestamp: saved.timestamp,
      remaining: rateCheck.remaining,
    });
  } catch (error: any) {
    console.error('Error in /api/master-prompt:', error);
    res.status(500).json({
      error: 'Failed to generate master prompt',
    });
  }
});

export default router;
