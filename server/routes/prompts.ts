import { Router } from 'express';
import { savePrompt, getAllPrompts, getPromptById, deletePrompt } from '../db/store.js';

const router = Router();

router.get('/', (_req, res) => {
  const prompts = getAllPrompts();
  res.json(prompts);
});

router.get('/:id', (req, res) => {
  const prompt = getPromptById(req.params.id);
  if (!prompt) {
    res.status(404).json({ error: 'Prompt not found' });
    return;
  }
  res.json(prompt);
});

router.post('/', (req, res) => {
  const { title, summary, masterPrompt, chatId } = req.body;
  if (!title || !masterPrompt) {
    res.status(400).json({ error: 'title and masterPrompt are required' });
    return;
  }
  const saved = savePrompt(title, summary || '', masterPrompt, chatId);
  res.status(201).json(saved);
});

router.delete('/:id', (req, res) => {
  const deleted = deletePrompt(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Prompt not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
