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

import * as greenhouseSource from '../sources/greenhouse.js';
import * as leverSource from '../sources/lever.js';
import * as ashbySource from '../sources/ashby.js';
import * as jsearchSource from '../sources/jsearch.js';

const SOURCES = [remotiveSource, remoteokSource, arbeitnowSource];

const ATS_SOURCES = {
  greenhouse: greenhouseSource,
  lever: leverSource,
  ashby: ashbySource
};

// ─── API usage tracking ───────────────────────────────────────────────────────

export function trackApiUsage(source) {
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

const CLEANUP_STALE_JOBS = `
  DELETE FROM jobs 
  WHERE status = 'new' 
    AND mark_for_email = 0 
    AND last_seen < datetime('now', '-14 days')
`;

// ─── Concurrent Company Crawler ─────────────────────────────────────────────────

async function crawlCompanies(companies) {
  const concurrency = 5;
  const results = [];
  let inFlight = 0;
  let index = 0;

  const db = getDb();
  const updateSuccess = db.prepare("UPDATE companies SET last_crawled_at = datetime('now'), crawl_status = 'active' WHERE id = ?");
  const updateFailure = db.prepare("UPDATE companies SET crawl_status = 'failed', last_crawled_at = datetime('now') WHERE id = ?");

  return new Promise((resolve) => {
    const enqueue = () => {
      if (index >= companies.length && inFlight === 0) {
        resolve(results);
        return;
      }
      
      while (inFlight < concurrency && index < companies.length) {
        const company = companies[index++];
        const sourceModule = ATS_SOURCES[company.ats_platform];

        if (!sourceModule || !company.ats_slug) {
          // Log missing info and skip
          console.warn(`[company-crawler] Skipping ${company.name}: missing platform or slug`);
          continue;
        }

        inFlight++;
        
        sourceModule.fetchJobs(company)
          .then(jobs => {
            updateSuccess.run(company.id);
            trackApiUsage(`${company.ats_platform}:${company.ats_slug}`);
            results.push({ company, jobs, status: 'ok' });
          })
          .catch(err => {
            console.error(`[company-crawler] Failed ${company.name}: ${err.message}`);
            updateFailure.run(company.id);
            results.push({ company, jobs: [], status: 'error', error: err.message });
          })
          .finally(() => {
            inFlight--;
            enqueue();
          });
      }
    };
    enqueue();
  });
}

// ─── Main collection run ──────────────────────────────────────────────────────

/**
 * runCollection()
 *
 * @param {boolean} includeBoards - Fetch from free job boards & JSearch
 * @param {boolean} includeCompanies - Fetch from active companies
 * @param {Array} specificCompanies - Run for only specific companies (used for single crawl test)
 * @returns {object} summary — { totalFetched, inserted, updated, filtered, perSource, durationMs, staleDeleted }
 */
export async function runCollection(includeBoards = true, includeCompanies = true, specificCompanies = null) {
  const start = Date.now();
  const activeProfile = getActiveProfile();

  if (!activeProfile) {
    throw new Error('No active profile. Import and activate one before collecting.');
  }

  const profileConfig = activeProfile.config;
  const minScore      = profileConfig?.scoring?.min_score_to_store ?? 25;
  const db            = getDb();

  console.log(`[collector] Starting collection run — active profile: "${activeProfile.name}" (min_score: ${minScore})`);

  let allJobs = [];
  let perSource = {};

  // 1. Fetch from Job Boards (Remotive, RemoteOK, Arbeitnow, JSearch)
  if (includeBoards) {
    const activeSources = [...SOURCES];
    // Add JSearch config to its module fetch call (we wrap it here so it fits the Promise.allSettled pattern)
    activeSources.push({
      name: 'jsearch',
      fetchJobs: () => jsearchSource.fetchJobs(profileConfig?.search?.jsearch_queries)
    });

    const settled = await Promise.allSettled(
      activeSources.map(source => source.fetchJobs())
    );
    for (let i = 0; i < activeSources.length; i++) {
      const { name } = activeSources[i];
      const result   = settled[i];

      if (result.status === 'fulfilled') {
        const jobs = Array.isArray(result.value) ? result.value : [];
        allJobs.push(...jobs);
        perSource[name] = { fetched: jobs.length, status: 'ok' };
        console.log(`[${name}] fetched ${jobs.length} jobs`);
        
        // Tracking JSearch happens inside jsearch.js now per query, but for free boards we track once here
        if (name !== 'jsearch') {
          trackApiUsage(name);
        }
      } else {
        perSource[name] = { fetched: 0, status: 'error', error: result.reason?.message ?? 'unknown error' };
        console.error(`[${name}] FAILED: ${result.reason?.message ?? result.reason}`);
      }
    }
  }

  // 2. Fetch from Companies ATS
  if (includeCompanies || specificCompanies) {
    let targetCompanies = specificCompanies;
    if (!targetCompanies) {
      targetCompanies = db.prepare("SELECT * FROM companies WHERE crawl_status != 'paused'").all();
    }
    
    console.log(`[collector] Crawling ${targetCompanies.length} companies...`);
    const companyResults = await crawlCompanies(targetCompanies);

    let companyFetchedCount = 0;
    let companySuccessCount = 0;
    let companyFailedCount = 0;

    for (const res of companyResults) {
       const srcName = `${res.company.ats_platform}:${res.company.ats_slug}`;
       perSource[srcName] = { 
         fetched: res.jobs.length, 
         status: res.status, 
         error: res.error 
       };
       allJobs.push(...res.jobs);
       companyFetchedCount += res.jobs.length;
       if (res.status === 'ok') companySuccessCount++;
       else companyFailedCount++;
    }
    console.log(`[collector] Company crawl done: ${companySuccessCount} ok, ${companyFailedCount} failed. Fetched ${companyFetchedCount} jobs.`);
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
      const scored = scoreJob(job, profileConfig);

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

  // ── 4. Stale-Job Cleanup ──────────────────────────────────────────────────
  const cleanupResult = db.prepare(CLEANUP_STALE_JOBS).run();
  const staleDeleted = cleanupResult.changes;

  const durationMs = Date.now() - start;

  const summary = {
    totalFetched,
    inserted,
    updated,
    filtered,
    survived: inserted + updated,
    staleDeleted,
    durationMs,
    perSource,
  };

  console.log(
    `[collector] Done in ${durationMs}ms — ` +
    `fetched:${totalFetched} inserted:${inserted} updated:${updated} filtered:${filtered} stale_deleted:${staleDeleted}`
  );

  return summary;
}

// ─── Re-Score All ─────────────────────────────────────────────────────────────

/**
 * reScoreAll()
 * Retroactively score all jobs based on active profile, option to delete below threshold
 * @param {boolean} deleteBelowMin 
 */
export function reScoreAll(deleteBelowMin = false) {
  const activeProfile = getActiveProfile();
  if (!activeProfile) {
    throw new Error('No active profile. Import and activate one before re-scoring.');
  }

  const profileConfig = activeProfile.config;
  const minScore      = profileConfig?.scoring?.min_score_to_store ?? 25;
  const db            = getDb();
  
  let rescored = 0;
  let deleted = 0;

  const updateStmt = db.prepare(`
    UPDATE jobs SET 
      relevance_score = @relevance_score,
      tech_stack = @tech_stack,
      experience_level = @experience_level,
      india_friendly = @india_friendly,
      location_note = @location_note
    WHERE id = @id
  `);

  const deleteStmt = db.prepare(`DELETE FROM jobs WHERE id = ?`);

  db.transaction(() => {
    // Only fetch fields needed for scoring to avoid loading huge descriptions if possible,
    // actually scoreJob requires everything (description etc) so fetch *
    const jobs = db.prepare(`SELECT * FROM jobs`).all();
    
    for (const job of jobs) {
      const scored = scoreJob(job, profileConfig);

      if (deleteBelowMin && scored.relevanceScore < minScore) {
        deleteStmt.run(job.id);
        deleted++;
      } else {
        updateStmt.run({
          id: job.id,
          relevance_score: scored.relevanceScore,
          tech_stack: scored.techStack.join(', '),
          experience_level: scored.experienceLevel,
          india_friendly: scored.indiaFriendly,
          location_note: scored.locationNote
        });
        rescored++;
      }
    }
  })();

  return { rescored, deleted, profile: activeProfile.name, minScore, deleteBelowMin };
}

