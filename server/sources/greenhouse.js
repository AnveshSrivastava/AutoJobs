/**
 * Greenhouse ATS Source
 * https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
 */

import { stripHtml, fetchWithTimeout } from '../core/utils.js';

const TIMEOUT = 15000;

export async function fetchJobs(company) {
  const slug = company.ats_slug;
  if (!slug) return [];

  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
  
  let data;
  try {
    data = await fetchWithTimeout(url, {}, TIMEOUT);
  } catch (err) {
    throw new Error(`[greenhouse:${slug}] fetch failed: ${err.message}`);
  }

  const raw = data?.jobs;
  if (!Array.isArray(raw)) {
    throw new Error(`[greenhouse:${slug}] unexpected response shape`);
  }

  return raw
    .filter(j => j && typeof j === 'object')
    .map(j => {
      // Greenhouse puts salary in metadata sometimes, we don't have a strict schema for it, but let's try to extract if present
      let salary = null;
      
      return {
        title:       String(j.title ?? '').trim(),
        company:     company.name,
        location:    String(j.location?.name ?? '').trim(),
        description: stripHtml(j.content ?? ''),
        url:         String(j.absolute_url ?? '').trim(),
        salary,
        source:      `greenhouse:${slug}`,
      };
    })
    .filter(j => j.title && j.company && j.url);
}
