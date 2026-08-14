import { z } from 'zod';
import yaml from 'js-yaml';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = join(__dirname, '../profiles');

// ─────────────────────────────────────────────────────────
// Default Config Object
// ─────────────────────────────────────────────────────────

export const DEFAULT_PROFILE_CONFIG = {
  search: {
    title_keywords_positive: [],
    title_keywords_negative: [],
    relevant_tech: [],
    jsearch_queries: [],
  },
  scoring: {
    experience_target: 'any',
    min_score_to_store: 25,
    weights: { title: 35, tech: 35, experience: 15, signal: 15 },
    core_tech: [],
  },
  location: {
    region_positive: [],
    region_negative: [],
  },
  outreach: {
    candidate_name: '',
    bio_short: '',
    dm_short_template: '',
    dm_long_template: '',
    recipient_email: '',
  },
  email: {
    daily_hour: 9,
    daily_jobs_count: 15,
  },
};

// ─────────────────────────────────────────────────────────
// Zod Validation Schema
// ─────────────────────────────────────────────────────────

const ProfileConfigSchema = z.object({
  search: z.object({
    title_keywords_positive: z.array(z.string()).default([]),
    title_keywords_negative: z.array(z.string()).default([]),
    relevant_tech: z.array(z.string()).default([]),
    jsearch_queries: z.array(z.object({
      query: z.string(),
      country: z.string().optional(),
      date_posted: z.string().optional(),
    })).default([]),
  }).passthrough().default({}),
  scoring: z.object({
    experience_target: z.enum(['fresher', 'junior', 'mid', 'senior', 'any']).default('any'),
    min_score_to_store: z.number().int().min(0).max(100).default(25),
    weights: z.object({
      title: z.number(),
      tech: z.number(),
      experience: z.number(),
      signal: z.number(),
    }).default({ title: 35, tech: 35, experience: 15, signal: 15 }),
    core_tech: z.array(z.string()).default([]),
  }).passthrough().default({}),
  location: z.object({
    region_positive: z.array(z.string()).default([]),
    region_negative: z.array(z.string()).default([]),
  }).passthrough().default({}),
  outreach: z.object({
    candidate_name: z.string().default(''),
    bio_short: z.string().default(''),
    dm_short_template: z.string().default(''),
    dm_long_template: z.string().default(''),
    recipient_email: z.string().default(''),
  }).passthrough().default({}),
  email: z.object({
    daily_hour: z.number().int().min(0).max(23).default(9),
    daily_jobs_count: z.number().int().min(1).max(50).default(15),
  }).passthrough().default({}),
}).passthrough().superRefine((data, ctx) => {
  const email = data?.outreach?.recipient_email;
  if (email && email.length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outreach', 'recipient_email'],
        message: 'Must be a valid email address or empty string',
      });
    }
  }
});

// ─────────────────────────────────────────────────────────
// Deep Merge (FR-15)
// Arrays replaced wholesale; unknown keys preserved
// ─────────────────────────────────────────────────────────

export function mergeWithDefaults(partialConfig) {
  return deepMerge(DEFAULT_PROFILE_CONFIG, partialConfig ?? {});
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (
      typeof override[key] === 'object' &&
      override[key] !== null &&
      !Array.isArray(override[key]) &&
      typeof base[key] === 'object' &&
      base[key] !== null &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────
// In-Memory Active Profile Cache
// ─────────────────────────────────────────────────────────

let _activeProfileCache = null;

export function getActiveProfile() {
  return _activeProfileCache;
}

export function refreshActiveProfileCache() {
  const db = getDb();
  const row = db.prepare('SELECT * FROM profiles WHERE is_active = 1 LIMIT 1').get();
  if (row) {
    const rawConfig = JSON.parse(row.config);
    _activeProfileCache = {
      id: row.id,
      name: row.name,
      config: mergeWithDefaults(rawConfig),
    };
  } else {
    _activeProfileCache = null;
  }
}

// ─────────────────────────────────────────────────────────
// Validation helper
// ─────────────────────────────────────────────────────────

function validateConfig(rawConfig) {
  const result = ProfileConfigSchema.safeParse(rawConfig ?? {});
  if (!result.success) {
    const formatted = result.error.flatten();
    throw Object.assign(new Error('Invalid profile config'), {
      status: 400,
      validationError: formatted,
    });
  }
  return result.data;
}

// ─────────────────────────────────────────────────────────
// CRUD Functions
// ─────────────────────────────────────────────────────────

export function listProfiles() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM profiles ORDER BY created_at ASC').all();
  return rows.map(row => ({ ...row, config: JSON.parse(row.config) }));
}

export function getProfile(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
  if (!row) return null;
  return { ...row, config: JSON.parse(row.config) };
}

export function getActiveProfileRow() {
  const db = getDb();
  const row = db.prepare('SELECT * FROM profiles WHERE is_active = 1 LIMIT 1').get();
  if (!row) return null;
  return { ...row, config: JSON.parse(row.config) };
}

export function createProfile({ name, config }) {
  const db = getDb();
  validateConfig(config);
  const merged = mergeWithDefaults(config ?? {});
  const result = db.prepare(
    `INSERT INTO profiles (name, config, is_active) VALUES (?, ?, 0)`
  ).run(name, JSON.stringify(merged));
  return getProfile(result.lastInsertRowid);
}

export function updateProfile(id, { name, config }) {
  const db = getDb();
  const existing = getProfile(id);
  if (!existing) return null;

  validateConfig(config);
  const merged = mergeWithDefaults(config ?? {});

  db.prepare(
    `UPDATE profiles SET name = ?, config = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(name ?? existing.name, JSON.stringify(merged), id);

  // Refresh cache if we just updated the active profile
  if (existing.is_active) {
    refreshActiveProfileCache();
  }

  return getProfile(id);
}

export function activateProfile(id) {
  const db = getDb();
  const existing = getProfile(id);
  if (!existing) return null;

  // Single transaction: deactivate all, activate target
  const activate = db.transaction(() => {
    db.prepare('UPDATE profiles SET is_active = 0').run();
    db.prepare('UPDATE profiles SET is_active = 1 WHERE id = ?').run(id);
  });
  activate();

  refreshActiveProfileCache();
  return getProfile(id);
}

export function duplicateProfile(id) {
  const db = getDb();
  const existing = getProfile(id);
  if (!existing) return null;

  const result = db.prepare(
    `INSERT INTO profiles (name, config, is_active) VALUES (?, ?, 0)`
  ).run(`${existing.name} (copy)`, JSON.stringify(existing.config));

  return getProfile(result.lastInsertRowid);
}

export function deleteProfile(id) {
  const db = getDb();
  const existing = getProfile(id);
  if (!existing) return null;

  if (existing.is_active) {
    const err = new Error('Cannot delete the active profile. Activate a different profile first.');
    err.status = 409;
    throw err;
  }

  db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
  return { deleted: true, id };
}

// ─────────────────────────────────────────────────────────
// YAML Import / Export
// ─────────────────────────────────────────────────────────

export function exportProfileToYaml(id) {
  const profile = getProfile(id);
  if (!profile) return null;
  return yaml.dump(profile.config, { lineWidth: -1 });
}

export function importProfileFromYamlFile(presetSlug, { activate = false } = {}) {
  const filePath = join(PROFILES_DIR, `${presetSlug}.yaml`);
  let rawContent;
  try {
    rawContent = readFileSync(filePath, 'utf8');
  } catch {
    const err = new Error(`Preset not found: ${presetSlug}`);
    err.status = 404;
    throw err;
  }

  const parsed = yaml.load(rawContent);
  const profile = createProfile({ name: presetSlug, config: parsed });

  if (activate) {
    return activateProfile(profile.id);
  }
  return profile;
}

export function listAvailablePresets() {
  try {
    return readdirSync(PROFILES_DIR)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map(f => f.replace(/\.(yaml|yml)$/, ''));
  } catch {
    return [];
  }
}
