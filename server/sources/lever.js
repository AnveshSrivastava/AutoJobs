/**
 * Lever ATS Source
 * https://api.lever.co/v0/postings/{slug}?mode=json
 */

import { stripHtml, fetchWithTimeout } from '../core/utils.js';

const TIMEOUT = 15000;

export async function fetchJobs(company) {
  const slug = company.ats_slug;
  if (!slug) return [];

  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  
  let data;
  try {
    data = await fetchWithTimeout(url, {}, TIMEOUT);
  } catch (err) {
    throw new Error(`[lever:${slug}] fetch failed: ${err.message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error(`[lever:${slug}] unexpected response shape`);
  }

  return data
    .filter(j => j && typeof j === 'object')
    .map(j => {
      const title = String(j.text ?? '').trim();
      const location = String(j.categories?.location ?? '').trim();
      // Lever gives both descriptionPlain and description (html). We use descriptionPlain if available, else strip html.
      let description = '';
      if (j.descriptionPlain) {
        description = String(j.descriptionPlain).trim();
      } else {
        description = stripHtml(j.description ?? '');
      }

      // lists/additional paragraphs
      const lists = j.lists || [];
      const additional = j.additionalPlain || stripHtml(j.additional ?? '');
      
      let fullDesc = description;
      lists.forEach(l => {
         fullDesc += `\n${l.text}\n` + (l.content || '');
      });
      fullDesc += `\n${additional}`;

      return {
        title,
        company:     company.name,
        location,
        description: fullDesc.trim(),
        url:         String(j.applyUrl ?? j.hostedUrl ?? '').trim(),
        salary:      null,
        source:      `lever:${slug}`,
      };
    })
    .filter(j => j.title && j.company && j.url);
}
