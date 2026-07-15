import { Router } from 'express';
import {
  saveChatSession,
  getAllChatSessions,
  getChatSessionById,
  deleteChatSession,
  getMessagesByChatId,
  getMasterPromptByChatId,
  saveMessage,
} from '../db/store.js';

const router = Router();

// List all chat sessions
router.get('/', (_req, res) => {
  const chats = getAllChatSessions();
  res.json(chats);
});

// Create new chat session
router.post('/', (req, res) => {
  const { title, presetKey, metadata } = req.body ?? {};
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const chat = saveChatSession({ title, presetKey, metadata });
  res.status(201).json(chat);
});

// Get single chat with messages and last master prompt
router.get('/:chatId', (req, res) => {
  const chat = getChatSessionById(req.params.chatId);
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }
  const messages = getMessagesByChatId(req.params.chatId);
  const lastPrompt = getMasterPromptByChatId(req.params.chatId);
  res.json({ ...chat, messages, lastPrompt: lastPrompt ?? null });
});

// Save a message to a chat
router.post('/:chatId/messages', (req, res) => {
  const chat = getChatSessionById(req.params.chatId);
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }
  const { role, content } = req.body ?? {};
  if (!role || !content) {
    res.status(400).json({ error: 'role and content are required' });
    return;
  }
  const msg = saveMessage({ chatId: req.params.chatId, role, content });
  res.status(201).json(msg);
});

// Delete chat session
router.delete('/:chatId', (req, res) => {
  const deleted = deleteChatSession(req.params.chatId);
  if (!deleted) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
