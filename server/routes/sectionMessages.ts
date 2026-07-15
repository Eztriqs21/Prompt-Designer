import { Router } from 'express';
import {
  getSectionMessages,
  saveSectionMessage,
  deleteSectionMessages,
  getChatSessionById,
} from '../db/store.js';

const router = Router();

const VALID_SECTION_TYPES = ['coding', 'ui-ux', 'audit'];

// GET /api/section-messages/:chatId/:sectionType — list messages
router.get('/:chatId/:sectionType', (req, res) => {
  const { chatId, sectionType } = req.params;
  const chat = getChatSessionById(chatId);
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }
  if (!VALID_SECTION_TYPES.includes(sectionType)) {
    res.status(400).json({ error: 'Invalid section type' });
    return;
  }
  const messages = getSectionMessages(chatId, sectionType);
  res.json(messages);
});

// POST /api/section-messages/:chatId/:sectionType — save a message
router.post('/:chatId/:sectionType', (req, res) => {
  const { chatId, sectionType } = req.params;
  const chat = getChatSessionById(chatId);
  if (!chat) {
    res.status(404).json({ error: 'Chat not found' });
    return;
  }
  if (!VALID_SECTION_TYPES.includes(sectionType)) {
    res.status(400).json({ error: 'Invalid section type' });
    return;
  }
  const { role, content } = req.body ?? {};
  if (!role || !content) {
    res.status(400).json({ error: 'role and content are required' });
    return;
  }
  if (role !== 'user' && role !== 'assistant') {
    res.status(400).json({ error: 'role must be "user" or "assistant"' });
    return;
  }
  const msg = saveSectionMessage({ chatId, sectionType, role, content });
  res.status(201).json(msg);
});

// DELETE /api/section-messages/:chatId — delete all section messages for a chat
router.delete('/:chatId', (req, res) => {
  const deleted = deleteSectionMessages(req.params.chatId);
  res.json({ success: deleted });
});

export default router;
