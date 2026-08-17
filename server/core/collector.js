/**
 * collector.js — Orchestrates the full fetch → score → filter → dedup → store pipeline.
 *
 * Design rules (per spec):
 *  - All sources run concurrently via Promise.allSettled — one failure never blocks others.
 *  - first_seen, status, mark_for_email are NEVER overwritten on an existing job.
 *  - Every run returns a structured summary (fetched / inserted / updated / filtered / perSource).
 */

import { getDb } from './database.js';
import { getActiveProfile } from './profile.js';
import { scoreJob } from './scorer.js';
import { computeFingerprint, todayIso } from './utils.js';

import * as remotiveSource  from '../sources/remotive.js';
import * as remoteokSource  from '../sources/remoteok.js';
import * as arbeitnowSource from '../sources/arbeitnow.js';

const SOURCES = [remotiveSource, remoteokSource, arbeitnowSource];

// ─── API usage tracking ───────────────────────────────────────────────────────

function trackApiUsage(source) {
  const db   = getDb();
  const today = todayIso();
  const row  = db.prepare(
    'SELECT id FROM api_usage WHERE source = ? AND date = ?'
  ).get(source, today);

  if (row) {
    db.prepare('UPDATE api_usage SET call_count = call_count + 1 WHERE id = ?').run(row.id);
  } else {
    db.prepare('INSERT INTO api_usage (source, date, call_count) VALUES (?, ?, 1)').run(source, today);
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

const INSERT_JOB = `
  INSERT INTO jobs (
    id, title, company, location, description, url, salary, source,
    relevance_score, tech_stack, experience_level, india_friendly, location_note,
    status, mark_for_email, first_seen, last_seen
  ) VALUES (
    @id, @title, @company, @location, @description, @url, @salary, @source,
    @relevance_score, @tech_stack, @experience_level, @india_friendly, @location_note,
    'new', 0, datetime('now'), datetime('now')
  )
`;

const UPDATE_JOB = `
  UPDATE jobs SET
    last_seen       = datetime('now'),
    relevance_score = @relevance_score,
    tech_stack      = @tech_stack,
    experience_level = @experience_level,
    india_friendly  = @india_friendly,
    location_note   = @location_note
  WHERE id = @id
`;

// ─── Main collection run ──────────────────────────────────────────────────────

/**
 * runCollection()
 *
 * @returns {object} summary — { totalFetched, inserted, updated, filtered, perSource, durationMs }
 */
export async function runCollection() {
  const start = Date.now();
  const activeProfile = getActiveProfile();

  if (!activeProfile) {
    throw new Error('No active profile. Import and activate one before collecting.');
  }

  const profileConfig = activeProfile.config;
  const minScore      = profileConfig?.scoring?.min_score_to_store ?? 25;
  const db            = getDb();

  // ── 1. Fetch from all sources concurrently ─────────────────────────────────
  console.log(`[collector] Starting collection run — active profile: "${activeProfile.name}" (min_score: ${minScore})`);

  const settled = await Promise.allSettled(
    SOURCES.map(source => source.fetchJobs())
  );

  // ── 2. Gather per-source results ───────────────────────────────────────────
  const allJobs    = [];
  const perSource  = {};

  for (let i = 0; i < SOURCES.length; i++) {
    const { name } = SOURCES[i];
    const result   = settled[i];

    if (result.status === 'fulfilled') {
      const jobs = Array.isArray(result.value) ? result.value : [];
      allJobs.push(...jobs);
      perSource[name] = { fetched: jobs.length, status: 'ok' };
      console.log(`[${name}] fetched ${jobs.length} jobs`);
      trackApiUsage(name);
    } else {
      perSource[name] = { fetched: 0, status: 'error', error: result.reason?.message ?? 'unknown error' };
      console.error(`[${name}] FAILED: ${result.reason?.message ?? result.reason}`);
    }
  }

  // ── 3. Score → filter → dedup → store (all in a single transaction) ───────
  let totalFetched = allJobs.length;
  let inserted     = 0;
  let updated      = 0;
  let filtered     = 0;

  const insertStmt = db.prepare(INSERT_JOB);
  const updateStmt = db.prepare(UPDATE_JOB);
  const existsStmt = db.prepare('SELECT id FROM jobs WHERE id = ?');

  const storeAll = db.transaction(() => {
    for (const job of allJobs) {
      // Score against active profile
      const scored = scoreJob(job, profileConfig);

      // Drop below threshold
      if (scored.relevanceScore < minScore) {
        filtered++;
        continue;
      }

      const id       = computeFingerprint(job.company, job.title, job.location);
      const existing = existsStmt.get(id);

      const payload = {
        id,
        title:            String(job.title       ?? '').slice(0, 500),
        company:          String(job.company     ?? '').slice(0, 200),
        location:         String(job.location    ?? '').slice(0, 200),
        description:      String(job.description ?? '').slice(0, 50000),
        url:              String(job.url         ?? '').slice(0, 1000),
        salary:           job.salary ? String(job.salary).slice(0, 200) : null,
        source:           String(job.source      ?? '').slice(0, 50),
        relevance_score:  scored.relevanceScore,
        tech_stack:       scored.techStack.join(', '),
        experience_level: scored.experienceLevel,
        india_friendly:   scored.indiaFriendly,
        location_note:    scored.locationNote,
      };

      if (!existing) {
        insertStmt.run(payload);
        inserted++;
      } else {
        updateStmt.run(payload);
        updated++;
      }
    }
  });

  storeAll();

  const durationMs = Date.now() - start;

  const summary = {
    totalFetched,
    inserted,
    updated,
    filtered,
    survived: inserted + updated,
    durationMs,
    perSource,
  };

  console.log(
    `[collector] Done in ${durationMs}ms — ` +
    `fetched:${totalFetched} inserted:${inserted} updated:${updated} filtered:${filtered}`
  );

  return summary;
}
