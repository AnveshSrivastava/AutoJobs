import express from 'express';
import { settings } from './config/settings.js';
import { getDb } from './core/database.js';
import { refreshActiveProfileCache } from './core/profile.js';
import profilesRouter from './routes/profiles.js';
import jobsRouter from './routes/jobs.js';
import companiesRouter from './routes/companies.js';

const app = express();
app.use(express.json());

// Initialize DB and run migrations before accepting any traffic
const db = getDb();

// Prime the active profile cache from DB on startup
refreshActiveProfileCache();

// ─── Routes ──────────────────────────────────────────────
app.use('/api/profiles', profilesRouter);
app.use('/api/companies', companiesRouter);
app.use('/api', jobsRouter);          // covers /api/collect, /api/jobs, /api/stats, /api/sources

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbConnected: !!db });
});

app.listen(settings.port, '127.0.0.1', () => {
  console.log(`Server listening on http://127.0.0.1:${settings.port}`);
});
