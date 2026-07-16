import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import masterPromptRoutes from './routes/masterPrompt.js';
import promptsRoutes from './routes/prompts.js';
import chatsRoutes from './routes/chats.js';
import promptVersionRoutes from './routes/promptVersions.js';
import sectionPromptsRoutes from './routes/sectionPrompts.js';
import sectionMessagesRoutes from './routes/sectionMessages.js';
import auditRoutes from './routes/audit.js';
import workspacesRoutes from './routes/workspaces.js';
import runsRoutes from './routes/runs.js';
import agentRoutes from './routes/agent.js';
import vibeloopAuditRoutes from './routes/vibeloopAudit.js';
import summaryRoutes from './routes/summary.js';
import vibeloopHistoryRoutes from './routes/vibeloopHistory.js';
import { loadSectionBlueprints } from './prompts/sectionBlueprints.js';

const app = express();
const PORT = process.env.PORT || 3001;

loadSectionBlueprints();

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : [
      'http://localhost:5173',
      'http://localhost:3001',
      'https://eztriqs21.github.io',
      'https://eztriqs21.github.io/Prompt-Designer',
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api/master-prompt', masterPromptRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/chats', promptVersionRoutes);
app.use('/api/prompt', promptVersionRoutes);
app.use('/api/sections', sectionPromptsRoutes);
app.use('/api/section-messages', sectionMessagesRoutes);
app.use('/api/audit', auditRoutes);

// VibeLoop routes
app.use('/api', workspacesRoutes);
app.use('/api', runsRoutes);
app.use('/api', agentRoutes);
app.use('/api', vibeloopAuditRoutes);
app.use('/api', summaryRoutes);
app.use('/api', vibeloopHistoryRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
