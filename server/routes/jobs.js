import { Router } from 'express';
import { getDb } from '../core/database.js';
import { runCollection, reScoreAll } from '../core/collector.js';
import { todayIso } from '../core/utils.js';

const router = Router();

// ─── GET /api/jsearch/status ──────────────────────────────────────────────────
router.get('/jsearch/status', (req, res) => {
  try {
    const db = getDb();
    const today = todayIso();
    const currentMonth = today.substring(0, 7); // YYYY-MM
    
    const todayUsage = db.prepare('SELECT SUM(call_count) as count FROM api_usage WHERE source = ? AND date = ?').get('jsearch', today).count || 0;
    const monthUsage = db.prepare('SELECT SUM(call_count) as count FROM api_usage WHERE source = ? AND date LIKE ?').get('jsearch', `${currentMonth}-%`).count || 0;
    
    const quota = 200;
    res.json({
      calls_today: todayUsage,
      calls_this_month: monthUsage,
      quota,
      remaining: Math.max(0, quota - monthUsage),
      has_key: !!process.env.JSEARCH_API_KEY
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/jobs/rescore ───────────────────────────────────────────────────
router.post('/jobs/rescore', (req, res) => {
  try {
    const { delete_below_min } = req.body;
    const summary = reScoreAll(!!delete_below_min);
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/collect ────────────────────────────────────────────────────────
// Trigger a manual collection run. Returns the run summary.
router.post('/collect', async (req, res) => {
  try {
    const summary = await runCollection();
    res.json({ success: true, summary });
  } catch (err) {
    console.error('[POST /api/collect]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/jobs ────────────────────────────────────────────────────────────
// List stored jobs with filtering and pagination.
// Query params: source, status, min_score, search, india_friendly, tech, limit, offset
router.get('/jobs', (req, res) => {
  try {
    const db = getDb();
    const {
      source,
      status,
      india_friendly,
      search,
      tech,
      min_score,
      limit   = 50,
      offset  = 0,
    } = req.query;

    const conditions = [];
    const params     = [];

    if (source)        { conditions.push('source = ?');           params.push(source); }
    if (status)        { conditions.push('status = ?');           params.push(status); }
    if (india_friendly){ conditions.push('india_friendly = ?');   params.push(india_friendly); }
    if (min_score !== undefined && min_score !== '') {
      const ms = parseInt(min_score, 10);
      if (!isNaN(ms)) { conditions.push('relevance_score >= ?'); params.push(ms); }
    }
    if (search) {
      conditions.push('(title LIKE ? OR company LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (tech) {
      conditions.push('tech_stack LIKE ?');
      params.push(`%${tech}%`);
    }

    const where   = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitN  = Math.min(Math.max(parseInt(limit,  10) || 50, 1), 200);
    const offsetN = Math.max(parseInt(offset, 10) || 0, 0);

    const jobs  = db.prepare(
      `SELECT * FROM jobs ${where} ORDER BY relevance_score DESC LIMIT ? OFFSET ?`
    ).all(...params, limitN, offsetN);

    const total = db.prepare(
      `SELECT COUNT(*) as count FROM jobs ${where}`
    ).get(...params).count;

    res.json({
      jobs,
      total,
      limit:  limitN,
      offset: offsetN,
      filters: { source, status, india_friendly, search, tech, min_score },
    });
  } catch (err) {
    console.error('[GET /api/jobs]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/jobs/:id ───────────────────────────────────────────────────────
router.get('/jobs/:id', (req, res) => {
  try {
    const db  = getDb();
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: `Job ${req.params.id} not found` });
    res.json(job);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/jobs/:id/status ──────────────────────────────────────────────
router.patch('/jobs/:id/status', (req, res) => {
  try {
    const db     = getDb();
    const { status } = req.body;
    const valid  = ['new', 'reviewed', 'applied', 'stale'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${valid.join(', ')}` });
    }
    const result = db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ id: req.params.id, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/jobs/:id/mark-for-email ──────────────────────────────────────
router.patch('/jobs/:id/mark-for-email', (req, res) => {
  try {
    const db    = getDb();
    const mark  = req.body.mark_for_email ? 1 : 0;
    const result = db.prepare('UPDATE jobs SET mark_for_email = ? WHERE id = ?').run(mark, req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ id: req.params.id, mark_for_email: !!mark });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/stats ──────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const total      = db.prepare('SELECT COUNT(*) as n FROM jobs').get().n;
    const byStatus   = db.prepare('SELECT status, COUNT(*) as n FROM jobs GROUP BY status').all();
    const bySource   = db.prepare('SELECT source, COUNT(*) as n FROM jobs GROUP BY source').all();
    const byRegion   = db.prepare('SELECT india_friendly, COUNT(*) as n FROM jobs GROUP BY india_friendly').all();
    const avgScore   = db.prepare('SELECT ROUND(AVG(relevance_score),1) as avg FROM jobs').get().avg;
    const topScored  = db.prepare('SELECT id, title, company, relevance_score FROM jobs ORDER BY relevance_score DESC LIMIT 5').all();

    res.json({ total, avgScore, byStatus, bySource, byRegion, topScored });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/sources ────────────────────────────────────────────────────────
router.get('/sources', (req, res) => {
  try {
    const db   = getDb();
    const rows = db.prepare('SELECT DISTINCT source FROM jobs ORDER BY source').all();
    res.json({ sources: rows.map(r => r.source) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

import { isSheetsConfigured, exportJobsToSheet } from '../core/sheets.js';

// ─── GET /api/sheets/status ──────────────────────────────────────────────────
router.get('/sheets/status', (req, res) => {
  try {
    res.json({ configured: isSheetsConfigured() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/sheets/export ─────────────────────────────────────────────────
router.post('/sheets/export', async (req, res) => {
  try {
    const db = getDb();
    const {
      source,
      status,
      india_friendly,
      search,
      tech,
      min_score,
      limit = 500, // higher limit for export
      offset = 0
    } = req.body; // usually POST receives data in body

    const conditions = [];
    const params     = [];

    if (source)        { conditions.push('source = ?');           params.push(source); }
    if (status)        { conditions.push('status = ?');           params.push(status); }
    if (india_friendly){ conditions.push('india_friendly = ?');   params.push(india_friendly); }
    if (min_score !== undefined && min_score !== '') {
      const ms = parseInt(min_score, 10);
      if (!isNaN(ms)) { conditions.push('relevance_score >= ?'); params.push(ms); }
    }
    if (search) {
      conditions.push('(title LIKE ? OR company LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (tech) {
      conditions.push('tech_stack LIKE ?');
      params.push(`%${tech}%`);
    }

    const where   = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitN  = Math.min(Math.max(parseInt(limit,  10) || 500, 1), 10000);
    const offsetN = Math.max(parseInt(offset, 10) || 0, 0);

    const jobs  = db.prepare(
      `SELECT * FROM jobs ${where} ORDER BY relevance_score DESC LIMIT ? OFFSET ?`
    ).all(...params, limitN, offsetN);

    const result = await exportJobsToSheet(jobs);
    res.json(result);
  } catch (err) {
    console.error('[POST /api/sheets/export]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
