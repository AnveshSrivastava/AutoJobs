/**
 * JSearch Source (RapidAPI)
 * Aggregates LinkedIn, Indeed, Glassdoor.
 * Requires JSEARCH_API_KEY in environment.
 * Metered API: 200 requests/month free tier.
 */

import { stripHtml, fetchWithTimeout } from '../core/utils.js';
import { trackApiUsage } from '../core/collector.js';

const TIMEOUT = 20000;
const QUOTA = 200; // purely informational for status, API handles actual block

export async function fetchJobs(queries = []) {
  const apiKey = process.env.JSEARCH_API_KEY;

  if (!apiKey) {
    console.warn('[jsearch] Skipping: JSEARCH_API_KEY not configured.');
    return [];
  }

  if (!queries || queries.length === 0) {
    console.warn('[jsearch] Skipping: No queries defined in active profile.');
    return [];
  }

  const allJobs = [];

  for (const q of queries) {
    const queryStr = q.query || 'software engineer';
    const country = q.country || 'us';
    const dateRange = q.recency_days ? (q.recency_days === 1 ? 'today' : '3days') : 'all';

    const searchStr = encodeURIComponent(`${queryStr} remote in ${country}`);
    const url = `https://jsearch.p.rapidapi.com/search?query=${searchStr}&date_posted=${dateRange}&num_pages=1`;

    try {
      trackApiUsage('jsearch');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        },
        signal: AbortSignal.timeout(TIMEOUT)
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit or quota exceeded (429)');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Unexpected response shape from JSearch');
      }

      for (const j of data.data) {
        allJobs.push({
          title:       String(j.job_title ?? '').trim(),
          company:     String(j.employer_name ?? '').trim(),
          location:    j.job_is_remote ? 'Remote' : String(j.job_city || j.job_state || j.job_country || '').trim(),
          description: stripHtml(j.job_description ?? ''),
          url:         String(j.job_apply_link ?? j.job_google_link ?? '').trim(),
          salary:      j.job_min_salary ? `${j.job_min_salary} - ${j.job_max_salary} ${j.job_salary_currency}` : null,
          source:      'jsearch'
        });
      }
    } catch (err) {
      throw new Error(`[jsearch] fetch failed on query "${queryStr}": ${err.message}`);
    }
  }

  // Filter out any invalid jobs
  return allJobs.filter(j => j.title && j.company && j.url);
}
