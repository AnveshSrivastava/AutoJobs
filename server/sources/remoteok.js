/**
 * RemoteOK source — https://remoteok.com/api
 * No API key required, but needs a User-Agent header or the API returns 403.
 * First element in the response array is a legal notice object — skip it.
 * Descriptions often contain HTML; stripped before storage.
 * Tags array is appended to description to improve tech-stack detection.
 */

import { stripHtml, fetchWithTimeout } from '../core/utils.js';

const API_URL = 'https://remoteok.com/api';
const SOURCE  = 'remoteok';
const TIMEOUT = 15000;

const HEADERS = {
  'User-Agent': 'JobScraper/1.0 (Personal Job Search Automation)',
  'Accept':     'application/json',
};

export const name = SOURCE;

/**
 * @returns {Promise<object[]>}
 */
export async function fetchJobs() {
  let data;
  try {
    data = await fetchWithTimeout(API_URL, { headers: HEADERS }, TIMEOUT);
  } catch (err) {
    console.error(`[${SOURCE}] fetch failed: ${err.message}`);
    return [];
  }

  if (!Array.isArray(data)) {
    console.error(`[${SOURCE}] unexpected response — expected array`);
    return [];
  }

  // First element is a legal notice `{ legal: "..." }` — drop it
  const raw = data.slice(1).filter(j => j && typeof j === 'object');

  return raw
    .map(j => {
      const tags = Array.isArray(j.tags) ? j.tags : [];
      // Append tags to description so the scorer can detect tech stack
      const baseDesc  = stripHtml(j.description ?? '');
      const tagsBlock = tags.length > 0 ? `\n\nTech: ${tags.join(', ')}` : '';

      const salaryParts = [j.salary_min, j.salary_max].filter(Boolean);
      const salary = salaryParts.length
        ? `${j.currency ?? 'USD'} ${salaryParts.join('–')}`
        : null;

      return {
        title:       String(j.position ?? '').trim(),
        company:     String(j.company  ?? '').trim(),
        location:    String(j.location ?? '').trim(),
        description: (baseDesc + tagsBlock).trim(),
        url:         String(j.url      ?? '').trim(),
        salary,
        source:      SOURCE,
      };
    })
    .filter(j => j.title && j.company);
}
