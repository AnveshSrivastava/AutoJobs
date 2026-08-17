import { createHash } from 'crypto';

/**
 * Lightweight HTML → plain-text strip.
 * Not a full sanitizer — just removes the most common tags and entities
 * that otherwise clutter tech-stack keyword matching in the scorer.
 */
export function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetch with AbortController-based timeout.
 * Throws on non-2xx or timeout — caller is responsible for catching.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * MD5 fingerprint for job deduplication.
 * Normalizes company + title + location before hashing so whitespace/casing
 * differences between collection runs don't produce spurious duplicates.
 */
export function computeFingerprint(company, title, location) {
  const normalized = [
    String(company ?? '').trim().toLowerCase(),
    String(title   ?? '').trim().toLowerCase(),
    String(location ?? '').trim().toLowerCase(),
  ].join('|');
  return createHash('md5').update(normalized).digest('hex');
}

/** ISO date string for today — used to key api_usage rows */
export function todayIso() {
  return new Date().toISOString().split('T')[0];
}
