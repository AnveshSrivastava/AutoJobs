import express from 'express';
import { settings } from './config/settings.js';
import { getDb } from './core/database.js';
import { refreshActiveProfileCache } from './core/profile.js';
import profilesRouter from './routes/profiles.js';
import jobsRouter from './routes/jobs.js';
import companiesRouter from './routes/companies.js';
import outreachRouter from './routes/outreach.js';
import pipelineRouter from './routes/pipeline.js';
import { initScheduler } from './core/scheduler.js';

const app = express();
app.use(express.json());

// Initialize DB and run migrations before accepting any traffic
const db = getDb();

// Prime the active profile cache from DB on startup
refreshActiveProfileCache();

// Initialize chron scheduler
initScheduler();

// ─── Routes ──────────────────────────────────────────────
app.use('/api/profiles', profilesRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/outreach', outreachRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api', jobsRouter);          // covers /api/collect, /api/jobs, /api/stats, /api/sources

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbConnected: !!db });
});

import path from 'path';
import { fileURLToPath } from 'url';

if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientBuildPath = path.join(__dirname, '../client/dist');
  
  app.use(express.static(clientBuildPath));
  
  // Client-side routing fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.listen(settings.port, '127.0.0.1', () => {
  console.log(`Server listening on http://127.0.0.1:${settings.port}`);
});
