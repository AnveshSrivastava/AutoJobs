import { Router } from 'express';
import { runFullPipeline } from '../core/pipeline.js';
import { getDb } from '../core/database.js';
import { settings } from '../config/settings.js';

const router = Router();

// ─── POST /api/pipeline/run ──────────────────────────────────────────────────
router.post('/run', async (req, res) => {
  try {
    const { dryRun } = req.body;
    const result = await runFullPipeline(!!dryRun);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/pipeline/status ────────────────────────────────────────────────
router.get('/status', (req, res) => {
  try {
    const db = getDb();
    
    const logs = db.prepare(`
      SELECT id, sent_at, status, recipient, job_count, error
      FROM email_log
      ORDER BY sent_at DESC
      LIMIT 10
    `).all();

    const isSmtpConfigured = !!(settings.smtp?.user && settings.smtp?.pass);

    res.json({
      success: true,
      smtpConfigured: isSmtpConfigured,
      recentLogs: logs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
