import { Router } from 'express';
import { getDb } from '../core/database.js';
import { runCollection } from '../core/collector.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// ─── GET /api/companies ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { platform, status, is_india_hq } = req.query;
    
    const conditions = [];
    const params = [];
    
    if (platform) { conditions.push('ats_platform = ?'); params.push(platform); }
    if (status) { conditions.push('crawl_status = ?'); params.push(status); }
    if (is_india_hq !== undefined) { conditions.push('is_india_hq = ?'); params.push(is_india_hq === 'true' || is_india_hq === '1' ? 1 : 0); }
    
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const companies = db.prepare(`SELECT * FROM companies ${where} ORDER BY name ASC`).all(...params);
    
    res.json({ companies, total: companies.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/companies/stats ──────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) as n FROM companies').get().n;
    const byPlatform = db.prepare('SELECT ats_platform, COUNT(*) as n FROM companies GROUP BY ats_platform').all();
    const byStatus = db.prepare('SELECT crawl_status, COUNT(*) as n FROM companies GROUP BY crawl_status').all();
    const byRegion = db.prepare('SELECT is_india_hq, COUNT(*) as n FROM companies GROUP BY is_india_hq').all();
    
    res.json({ total, byPlatform, byStatus, byRegion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/companies ───────────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { name, domain, ats_platform, ats_slug, is_india_hq } = req.body;
    
    if (!name) return res.status(400).json({ error: 'name is required' });
    
    const result = db.prepare(`
      INSERT INTO companies (name, domain, ats_platform, ats_slug, is_india_hq)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      name, 
      domain || null, 
      ats_platform || null, 
      ats_slug || null, 
      is_india_hq ? 1 : 0
    );
    
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(result.lastInsertRowid);
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/companies/:id ────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const { name, domain, ats_platform, ats_slug, is_india_hq } = req.body;
    
    if (!name) return res.status(400).json({ error: 'name is required' });
    
    const result = db.prepare(`
      UPDATE companies SET
        name = ?, domain = ?, ats_platform = ?, ats_slug = ?, is_india_hq = ?
      WHERE id = ?
    `).run(
      name, 
      domain || null, 
      ats_platform || null, 
      ats_slug || null, 
      is_india_hq ? 1 : 0,
      req.params.id
    );
    
    if (result.changes === 0) return res.status(404).json({ error: 'Company not found' });
    
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/companies/:id/status ───────────────────────────────────────────
router.patch('/:id/status', (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    
    if (!['active', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'status must be active or paused' });
    }
    
    const result = db.prepare('UPDATE companies SET crawl_status = ? WHERE id = ?').run(status, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Company not found' });
    
    res.json({ id: req.params.id, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/companies/seed ──────────────────────────────────────────────────
router.post('/seed', (req, res) => {
  try {
    const db = getDb();
    const seedPath = join(__dirname, '../core/company_seed.json');
    const companies = JSON.parse(readFileSync(seedPath, 'utf8'));
    
    let inserted = 0;
    const insert = db.prepare(`
      INSERT INTO companies (name, domain, ats_platform, ats_slug)
      VALUES (?, ?, ?, ?)
    `);
    
    db.transaction(() => {
      for (const c of companies) {
        // Skip if slug already exists for this platform
        const existing = db.prepare('SELECT id FROM companies WHERE ats_platform = ? AND ats_slug = ?').get(c.ats_platform, c.ats_slug);
        if (!existing) {
          insert.run(c.name, c.domain, c.ats_platform, c.ats_slug);
          inserted++;
        }
      }
    })();
    
    res.json({ success: true, inserted, totalProvided: companies.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/companies/crawl ─────────────────────────────────────────────────
// Crawl ALL active companies (no free job boards)
router.post('/crawl', async (req, res) => {
  try {
    const summary = await runCollection(false, true, null);
    res.json({ success: true, summary });
  } catch (err) {
    console.error('[POST /api/companies/crawl]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/companies/:id/crawl ─────────────────────────────────────────────
// Crawl ONE specific company
router.post('/:id/crawl', async (req, res) => {
  try {
    const db = getDb();
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    
    if (!company) return res.status(404).json({ error: 'Company not found' });
    
    const summary = await runCollection(false, false, [company]);
    res.json({ success: true, summary });
  } catch (err) {
    console.error(`[POST /api/companies/${req.params.id}/crawl]`, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
