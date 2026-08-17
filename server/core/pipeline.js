import { getDb } from './database.js';
import { runCollection } from './collector.js';
import { generateOutreach } from './outreach.js';
import { renderEmailDigest } from './email_renderer.js';
import { sendDigest } from './mailer.js';
import { getActiveProfile } from './profile.js';
import { settings } from '../config/settings.js';

/**
 * Runs the full AntiGravity daily pipeline.
 * Collect -> Score -> Outreach -> Email
 * @param {boolean} dryRun - If true, builds email but skips actual SMTP send.
 */
export async function runFullPipeline(dryRun = false) {
  const db = getDb();
  const profile = getActiveProfile();
  
  if (!profile) {
    throw new Error('Pipeline failed: No active profile set.');
  }

  const { email, scoring } = profile.config;
  const targetCount = email?.daily_jobs_count || 15;
  const minScore = scoring?.min_score_to_store || 25;

  let collectionSummary = null;
  let outreachSummary = null;
  let sendResult = null;
  let errorDetail = null;

  try {
    // 1. Run Collection
    collectionSummary = await runCollection(true, true);

    // 2. Generate Outreach
    outreachSummary = generateOutreach(targetCount, minScore);

    // 3. Gather Outreach Items (Pending)
    const pendingOutreach = db.prepare(`
      SELECT o.*, 
             j.title, j.company, j.location, j.relevance_score, j.tech_stack, j.salary, j.url
      FROM outreach o
      JOIN jobs j ON o.job_id = j.id
      WHERE o.status = 'pending' AND o.emailed = 0
      ORDER BY j.relevance_score DESC, o.created_at DESC
      LIMIT ?
    `).all(targetCount);

    // Group into records shaped for email_renderer
    const outreachRecords = pendingOutreach.map(r => ({
      ...r,
      job: {
        title: r.title,
        company: r.company,
        location: r.location,
        relevance_score: r.relevance_score,
        tech_stack: r.tech_stack,
        salary: r.salary,
        url: r.url
      }
    }));

    // 4. Render Email
    const html = renderEmailDigest(outreachRecords);

    // 5. Resolve Recipient
    const recipient = profile.config.outreach?.recipient_email || settings.defaultEmailRecipient;
    if (!recipient) {
      throw new Error('No recipient email resolved. Set recipient_email in profile config or DEFAULT_EMAIL_RECIPIENT env.');
    }

    // 6. Send Email
    try {
      sendResult = await sendDigest(html, recipient, outreachRecords.length, dryRun);
      
      if (!dryRun && sendResult.success) {
        // Mark as emailed only if actual send succeeds!
        const markEmailed = db.prepare(`UPDATE outreach SET emailed = 1, status = 'messaged' WHERE id = ?`);
        db.transaction(() => {
          for (const item of pendingOutreach) {
            markEmailed.run(item.id);
          }
        })();
      }
    } catch (sendErr) {
      errorDetail = sendErr.message;
      throw sendErr; // rethrow to be caught by outer block for email_log
    }

    // Log success
    db.prepare(`
      INSERT INTO email_log (status, recipient, job_count, error)
      VALUES (?, ?, ?, ?)
    `).run(dryRun ? 'dry_run' : 'success', recipient, outreachRecords.length, null);

  } catch (err) {
    // Log failure
    try {
      db.prepare(`
        INSERT INTO email_log (status, recipient, job_count, error)
        VALUES (?, ?, ?, ?)
      `).run('failed', 'unknown', 0, err.message);
    } catch (logErr) {
      console.error('[pipeline] Failed to write to email_log:', logErr.message);
    }
    
    return {
      success: false,
      error: err.message,
      collection: collectionSummary,
      outreach: outreachSummary
    };
  }

  return {
    success: true,
    collection: collectionSummary,
    outreach: outreachSummary,
    email: sendResult
  };
}
