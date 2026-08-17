/**
 * Ashby ATS Source
 * https://api.ashbyhq.com/posting-api/job-board/{slug}
 */

import { stripHtml, fetchWithTimeout } from '../core/utils.js';

const TIMEOUT = 15000;

export async function fetchJobs(company) {
  const slug = company.ats_slug;
  if (!slug) return [];

  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
  
  let data;
  try {
    data = await fetchWithTimeout(url, {}, TIMEOUT);
  } catch (err) {
    throw new Error(`[ashby:${slug}] fetch failed: ${err.message}`);
  }

  const raw = data?.jobs;
  if (!Array.isArray(raw)) {
    throw new Error(`[ashby:${slug}] unexpected response shape`);
  }

  return raw
    .filter(j => j && typeof j === 'object')
    .map(j => {
      let location = String(j.locationName ?? '').trim();
      if (j.isRemote && !location.toLowerCase().includes('remote')) {
        location = location ? `${location} (Remote)` : 'Remote';
      }

      return {
        title:       String(j.title ?? '').trim(),
        company:     company.name,
        location,
        description: stripHtml(j.descriptionHtml ?? ''),
        url:         String(j.jobUrl ?? '').trim(),
        salary:      null,
        source:      `ashby:${slug}`,
      };
    })
    .filter(j => j.title && j.company && j.url);
}
