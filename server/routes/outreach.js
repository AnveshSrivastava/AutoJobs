import { Router } from 'express';
import { getDb } from '../core/database.js';
import { generateOutreach, refreshAndGenerateOutreach } from '../core/outreach.js';

const router = Router();

// ─── POST /api/outreach/generate ──────────────────────────────────────────────
router.post('/generate', (req, res) => {
  try {
    const { targetCount, minScore } = req.body;
    const summary = generateOutreach(
      targetCount ? parseInt(targetCount, 10) : 15,
      minScore ? parseInt(minScore, 10) : 30
    );
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/outreach/refresh ───────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { targetCount, minScore } = req.body;
    const summary = await refreshAndGenerateOutreach(
      targetCount ? parseInt(targetCount, 10) : 15,
      minScore ? parseInt(minScore, 10) : 30
    );
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/outreach ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0, batch } = req.query;
    const db = getDb();
    
    let query = `
      SELECT o.*, j.title, j.company, j.relevance_score, j.source
      FROM outreach o
      JOIN jobs j ON o.job_id = j.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }
    
    if (search) {
      query += ` AND (j.company LIKE ? OR j.title LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (batch === 'new') {
      // rough heuristic: created in the last 24h
      query += ` AND o.created_at >= datetime('now', '-1 day')`;
    } else if (batch === 'old') {
      query += ` AND o.created_at < datetime('now', '-1 day')`;
    }

    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const records = db.prepare(query).all(...params);

    // parse JSON for linkedin_urls
    for (const r of records) {
      if (r.linkedin_urls) {
        try { r.linkedin_urls = JSON.parse(r.linkedin_urls); } 
        catch (e) { r.linkedin_urls = {}; }
      }
    }

    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/outreach/stats ──────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`SELECT status, COUNT(*) as count FROM outreach GROUP BY status`).all();
    
    const stats = { pending: 0, messaged: 0, replied: 0, followed_up: 0, total: 0 };
    for (const r of rows) {
      if (stats[r.status] !== undefined) {
        stats[r.status] = r.count;
      }
      stats.total += r.count;
    }
    
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/outreach/:id/status ───────────────────────────────────────────
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'messaged', 'replied', 'followed_up'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const db = getDb();
    const result = db.prepare(`UPDATE outreach SET status = ? WHERE id = ?`).run(status, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/outreach/:id/notes ────────────────────────────────────────────
router.patch('/:id/notes', (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const db = getDb();
    const result = db.prepare(`UPDATE outreach SET notes = ? WHERE id = ?`).run(notes || '', id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json({ success: true, notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/outreach/bulk-delete ───────────────────────────────────────────
router.post('/bulk-delete', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    
    const db = getDb();
    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM outreach WHERE id IN (${placeholders})`).run(...ids);
    
    res.json({ success: true, deletedCount: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
