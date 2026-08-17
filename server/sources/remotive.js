/**
 * Remotive source — https://remotive.com/api/remote-jobs
 * No API key required. Returns remote tech jobs in a clean JSON shape.
 */

import { stripHtml, fetchWithTimeout } from '../core/utils.js';

const API_URL  = 'https://remotive.com/api/remote-jobs';
const SOURCE   = 'remotive';
const TIMEOUT  = 15000;

export const name = SOURCE;

/**
 * Fetch and normalize up to 100 jobs from Remotive.
 * Returns [] on any error (logged, not thrown).
 * @returns {Promise<object[]>}
 */
export async function fetchJobs() {
  let data;
  try {
    data = await fetchWithTimeout(`${API_URL}?limit=100`, {}, TIMEOUT);
  } catch (err) {
    console.error(`[${SOURCE}] fetch failed: ${err.message}`);
    return [];
  }

  const raw = data?.jobs;
  if (!Array.isArray(raw)) {
    console.error(`[${SOURCE}] unexpected response shape — "jobs" array missing`);
    return [];
  }

  return raw
    .filter(j => j && typeof j === 'object')
    .map(j => ({
      title:       String(j.title        ?? '').trim(),
      company:     String(j.company_name ?? '').trim(),
      location:    String(j.candidate_required_location ?? '').trim(),
      description: stripHtml(j.description ?? ''),
      url:         String(j.url          ?? '').trim(),
      salary:      j.salary ? String(j.salary).trim() : null,
      source:      SOURCE,
    }))
    .filter(j => j.title && j.company); // drop ghost listings
}
