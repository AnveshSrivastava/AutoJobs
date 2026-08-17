/**
 * Arbeitnow source — https://www.arbeitnow.com/api/job-board-api
 * No API key required. European-skewing remote/hybrid board.
 * Response: { data: [...], meta: {...}, links: {...} }
 * Many listings will be EU-targeted → expect india_friendly: maybe/no for most.
 */

import { stripHtml, fetchWithTimeout } from '../core/utils.js';

const API_URL = 'https://www.arbeitnow.com/api/job-board-api';
const SOURCE  = 'arbeitnow';
const TIMEOUT = 15000;

export const name = SOURCE;

/**
 * @returns {Promise<object[]>}
 */
export async function fetchJobs() {
  let data;
  try {
    data = await fetchWithTimeout(API_URL, {}, TIMEOUT);
  } catch (err) {
    console.error(`[${SOURCE}] fetch failed: ${err.message}`);
    return [];
  }

  const raw = data?.data;
  if (!Array.isArray(raw)) {
    console.error(`[${SOURCE}] unexpected response — "data" array missing`);
    return [];
  }

  return raw
    .filter(j => j && typeof j === 'object')
    .map(j => {
      const tags = Array.isArray(j.tags) ? j.tags : [];
      const baseDesc  = stripHtml(j.description ?? '');
      const tagsBlock = tags.length > 0 ? `\n\nTech: ${tags.join(', ')}` : '';

      // Arbeitnow has a boolean `remote` flag — incorporate into location string
      // so the region classifier in the scorer can detect it
      let location = String(j.location ?? '').trim();
      if (j.remote === true && !location.toLowerCase().includes('remote')) {
        location = location ? `${location} (Remote)` : 'Remote';
      }

      return {
        title:       String(j.title        ?? '').trim(),
        company:     String(j.company_name ?? '').trim(),
        location,
        description: (baseDesc + tagsBlock).trim(),
        url:         String(j.url          ?? '').trim(),
        salary:      j.salary ? String(j.salary).trim() : null,
        source:      SOURCE,
      };
    })
    .filter(j => j.title && j.company);
}
