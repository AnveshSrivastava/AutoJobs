import Database from 'better-sqlite3';
import { settings } from '../config/settings.js';

let db;

export function getDb() {
  if (db) return db;

  db = new Database(settings.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      config TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      domain TEXT,
      ats_platform TEXT,
      ats_slug TEXT,
      crawl_status TEXT NOT NULL DEFAULT 'active',
      is_india_hq INTEGER NOT NULL DEFAULT 0,
      last_crawled_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      description TEXT,
      url TEXT,
      salary TEXT,
      source TEXT NOT NULL,
      relevance_score INTEGER NOT NULL DEFAULT 0,
      tech_stack TEXT,
      experience_level TEXT,
      india_friendly TEXT,
      location_note TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      mark_for_email INTEGER NOT NULL DEFAULT 0,
      first_seen TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS outreach (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      linkedin_urls TEXT,
      dm_short TEXT,
      dm_long TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      emailed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS email_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL,
      recipient TEXT,
      job_count INTEGER,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      date TEXT NOT NULL,
      call_count INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(relevance_score);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_last_seen ON jobs(last_seen);
    CREATE INDEX IF NOT EXISTS idx_outreach_job_id ON outreach(job_id);
  `);
}
