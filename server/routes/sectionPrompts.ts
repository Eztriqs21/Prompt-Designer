import { Router } from 'express';
import { generateWithFallback } from '../geminiClient.js';
import { getSectionBlueprint } from '../prompts/sectionBlueprints.js';
import type { SectionType, Message } from '../src/types/index.js';

const router = Router();

const VALID_SECTION_TYPES: SectionType[] = ['coding', 'ui-ux', 'audit'];

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

const SECTION_LABELS: Record<SectionType, string> = {
  coding: 'CODING',
  'ui-ux': 'UI/UX',
  audit: 'AUDIT',
};

router.post('/:sectionType', async (req, res) => {
  try {
    const { sectionType } = req.params;

    if (!VALID_SECTION_TYPES.includes(sectionType as SectionType)) {
      res.status(400).json({
        error: `Invalid section type: ${sectionType}. Must be one of: ${VALID_SECTION_TYPES.join(', ')}`,
      });
      return;
    }

    const { chatId, masterPrompt, userRequest, conversationHistory } = req.body ?? {};

    if (!masterPrompt) {
      res.status(400).json({ error: 'Missing masterPrompt in request body.' });
      return;
    }

    const blueprint = getSectionBlueprint(sectionType as SectionType);
    const conversationSummary = buildConversationSummary(conversationHistory || []);
    const sectionLabel = SECTION_LABELS[sectionType as SectionType];

    const userContent = [
      `MASTER PROMPT CONTEXT:`,
      masterPrompt,
      '',
      `${sectionLabel} REQUEST:`,
      userRequest || '(generate based on the master prompt context)',
      '',
      'MEMORY CONTEXT:',
      chatId ? `Current workspace ID: ${chatId}` : '(no workspace ID)',
      '',
      'CONVERSATION SUMMARY:',
      conversationSummary,
    ].join('\n');

    const result = await generateWithFallback(
      [
        { role: 'system', content: blueprint },
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
      console.error(`Failed to parse JSON for ${sectionType} section:`, parseErr);
      console.error('Raw response (first 500 chars):', raw.slice(0, 500));
      parsed = {
        summary: '',
        analysis: '',
        masterPrompt: raw || `Failed to generate ${sectionType} section prompt.`,
      };
    }

    res.json({
      summary: parsed.summary ?? '',
      analysis: parsed.analysis ?? '',
      masterPrompt: parsed.masterPrompt ?? '',
    });
  } catch (error: any) {
    console.error(`Error in /api/sections/${req.params.sectionType}:`, error);
    res.status(500).json({
      error: 'Failed to generate section prompt',
      details: error?.message ?? 'Unknown error',
    });
  }
});

export default router;
