import { Router } from 'express';
import {
  getPromptVersionsByChatId,
  getPromptVersionById,
  pinPromptVersion,
  deletePromptVersion,
  savePromptVersion,
  saveChatSession,
  getChatSessionById,
} from '../db/store.js';

const router = Router();

// GET /api/chats/:chatId/prompts — list all prompt versions for a chat
router.get('/:chatId/prompts', (req, res) => {
  const { chatId } = req.params;
  const chat = getChatSessionById(chatId);
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }
  const versions = getPromptVersionsByChatId(chatId);
  res.json(versions);
});

// POST /api/chats/:chatId/prompts/:promptId/pin — pin a version as current
router.post('/:chatId/prompts/:promptId/pin', (req, res) => {
  const { chatId, promptId } = req.params;
  const chat = getChatSessionById(chatId);
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }
  const prompt = getPromptVersionById(promptId);
  if (!prompt || prompt.chatId !== chatId) {
    res.status(404).json({ error: 'Prompt version not found' });
    return;
  }
  const success = pinPromptVersion(chatId, promptId);
  if (!success) {
    res.status(500).json({ error: 'Failed to pin prompt' });
    return;
  }
  res.json({ success: true });
});

// POST /api/prompt/clone — clone a prompt into a new chat
router.post('/clone', (req, res) => {
  const { sourcePromptId, newChatTitle } = req.body ?? {};
  if (!sourcePromptId) {
    res.status(400).json({ error: 'sourcePromptId is required' });
    return;
  }

  const sourcePrompt = getPromptVersionById(sourcePromptId);
  if (!sourcePrompt) {
    res.status(404).json({ error: 'Source prompt not found' });
    return;
  }

  const sourceChat = getChatSessionById(sourcePrompt.chatId);
  if (!sourceChat) {
    res.status(404).json({ error: 'Source chat not found' });
    return;
  }

  // Create new chat with copied metadata
  const newChat = saveChatSession({
    title: newChatTitle || `${sourcePrompt.title} (Clone)`,
    presetKey: sourceChat.presetKey,
    metadata: sourceChat.metadata,
  });

  // Copy the prompt as version 1, pinned
  const newPrompt = savePromptVersion({
    chatId: newChat.id,
    title: sourcePrompt.title,
    summary: sourcePrompt.summary,
    analysis: sourcePrompt.analysis,
    masterPrompt: sourcePrompt.masterPrompt,
    isPinned: true,
  });

  res.status(201).json({ newChatId: newChat.id, prompt: newPrompt });
});

export default router;
