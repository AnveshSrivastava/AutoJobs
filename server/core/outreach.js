import { getDb } from './database.js';
import { getActiveProfile } from './profile.js';
import { runCollection } from './collector.js';

// ─── 1. LinkedIn URL Generation ───────────────────────────────────────────────

const ROLE_CATEGORIES = {
  Engineering: ['Engineering Manager', 'Tech Lead', 'Head of Engineering'],
  Executive: ['CTO', 'CEO', 'Founder'], // using CTO, CEO, Founder for the 3 executive options, but spec implies CEO/Founder. If CEO/Founder is 1, let's use "Founder". We need exactly 7. So: Eng(3), Exec(CTO, CEO), HR(Tech Recruiter, HR Manager) = 7.
  HR: ['Technical Recruiter', 'HR Manager']
};

export function generateLinkedInUrls(companyName) {
  const cleanCompany = String(companyName).trim();
  const urls = {};
  
  // Using exact quotes around company and role to improve LinkedIn search accuracy
  const buildUrl = (role) => {
    const query = `"${cleanCompany}" "${role}"`;
    return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
  };

  urls.Engineering = ROLE_CATEGORIES.Engineering.map(role => ({ role, url: buildUrl(role) }));
  
  // Executive exactly 2 to hit 7 total
  urls.Executive = ['CTO', 'Founder'].map(role => ({ role, url: buildUrl(role) }));
  
  urls.HR = ROLE_CATEGORIES.HR.map(role => ({ role, url: buildUrl(role) }));

  return urls;
}

// ─── 2. Template Substitution ─────────────────────────────────────────────────

function substituteTemplate(template, data) {
  if (!template) return '';
  
  return template.replace(/\{([^}]+)\}/g, (match, token) => {
    const key = token.trim();
    if (data[key] === undefined || data[key] === null) {
      return ''; // Graceful degradation for unresolved tokens
    }
    return String(data[key]);
  });
}

function truncateSensibly(text, limit) {
  if (text.length <= limit) return text;
  
  // Find the last space within the limit
  const truncated = text.slice(0, limit - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

export function generateDMs(job, profileConfig) {
  const outreachConfig = profileConfig.outreach || {};
  
  const templateData = {
    company: job.company || '',
    title: job.title || '',
    tech_stack: job.tech_stack || '',
    candidate_name: outreachConfig.candidate_name || '',
    bio_short: outreachConfig.bio_short || '',
    achievements: outreachConfig.achievements || '',
    greeting: 'Hi'
  };

  let shortDm = substituteTemplate(outreachConfig.dm_short_template, templateData);
  let longDm = substituteTemplate(outreachConfig.dm_long_template, templateData);

  // Short DM limit ~300 chars per LinkedIn constraints
  shortDm = truncateSensibly(shortDm, 300);

  return { shortDm, longDm };
}

// ─── 3. Outreach Generation ───────────────────────────────────────────────────

/**
 * Generate outreach for top jobs.
 * Policy: Skip jobs that already have an outreach record to avoid duplicate noise.
 */
export function generateOutreach(targetCount = 15, minScore = 30) {
  const db = getDb();
  const activeProfile = getActiveProfile();
  
  if (!activeProfile) {
    throw new Error('No active profile found.');
  }

  // Find top N eligible jobs that don't already have outreach
  const eligibleJobs = db.prepare(`
    SELECT j.* 
    FROM jobs j
    LEFT JOIN outreach o ON j.id = o.job_id
    WHERE j.relevance_score >= ?
      AND o.id IS NULL
    ORDER BY j.relevance_score DESC, j.first_seen DESC
    LIMIT ?
  `).all(minScore, targetCount);

  let generatedCount = 0;
  
  const insertOutreach = db.prepare(`
    INSERT INTO outreach (job_id, linkedin_urls, dm_short, dm_long)
    VALUES (?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const job of eligibleJobs) {
      try {
        const urls = generateLinkedInUrls(job.company);
        const { shortDm, longDm } = generateDMs(job, activeProfile.config);
        
        insertOutreach.run(
          job.id, 
          JSON.stringify(urls), 
          shortDm, 
          longDm
        );
        generatedCount++;
      } catch (err) {
        console.error(`[outreach] Failed to generate for job ${job.id}:`, err.message);
        // Continue with the batch even if one fails
      }
    }
  })();

  return {
    targetCount,
    minScore,
    eligibleFound: eligibleJobs.length,
    generatedCount
  };
}

/**
 * Refresh variant: runs collection first, then generates outreach.
 */
export async function refreshAndGenerateOutreach(targetCount = 15, minScore = 30) {
  const collectionSummary = await runCollection(true, true);
  const outreachSummary = generateOutreach(targetCount, minScore);
  
  return {
    collection: collectionSummary,
    outreach: outreachSummary
  };
}
