/**
 * test-scorer.js — Standalone scorer test harness (Step 3 verification)
 * Run:  node test-scorer.js
 * Does NOT start the server, does NOT write to the DB.
 * Loads backend-node.yaml directly for the first run, then switches to frontend-react.yaml.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { scoreJob } from './core/scorer.js';
import { mergeWithDefaults } from './core/profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load profile configs from YAML ───────────────────────────────────────────

function loadProfile(slug) {
  const raw = readFileSync(join(__dirname, 'profiles', `${slug}.yaml`), 'utf8');
  return mergeWithDefaults(yaml.load(raw));
}

const backendConfig  = loadProfile('backend-node');
const frontendConfig = loadProfile('frontend-react');

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE JOBS (10 cases)
// Pre-written expected score BAND and reasoning written before running.
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLES = [
  // ── 1. Perfect match ──────────────────────────────────────────────────────
  {
    label: '1. Perfect match — Node backend, mid-level, India remote',
    job: {
      title: 'Node.js Backend Engineer',
      description:
        'We are looking for a Node.js backend engineer with 3–5 years of experience. ' +
        'Must be proficient with Express, TypeScript, PostgreSQL, and Docker. ' +
        'You will build REST APIs and microservices. Fully remote. Server-side development.',
      location: 'Remote, India',
    },
    expectedBand: [75, 100],
    expectedRegion: 'yes',
    note: 'Strong title match (node+backend), 4 tech hits (3 core), exp=mid=target, signals hit',
  },

  // ── 2. Completely unrelated job ───────────────────────────────────────────
  {
    label: '2. Unrelated — Social Media Marketing Manager',
    job: {
      title: 'Social Media Marketing Manager',
      description:
        'We need a creative social media manager to grow our brand on Instagram, Facebook, and TikTok. ' +
        'Experience with content creation, analytics, and campaign management. No tech background required.',
      location: 'Mumbai, India',
    },
    expectedBand: [0, 15],
    expectedRegion: 'yes',
    note: 'Zero title/tech/signal matches. Only exp component contributes (ambiguous→50). Should be ~5-8.',
  },

  // ── 3. Right tech, wrong experience (principal/senior) ───────────────────
  {
    label: '3. Right tech, wrong experience — Principal Node Architect (10+ yrs)',
    job: {
      title: 'Principal Node.js Architect',
      description:
        'Looking for a principal software architect with 10+ years of Node.js experience. ' +
        'Deep expertise in Express, TypeScript, MongoDB required. Lead engineering strategy.',
      location: 'Bangalore, India',
    },
    expectedBand: [40, 60],
    expectedRegion: 'yes',
    note: 'Good title (node) + good tech, but experience=senior vs target=mid → big penalty. Experience component ~5.',
  },

  // ── 4. Great title, vague description ────────────────────────────────────
  {
    label: '4. Good title, vague description — no tech or detail',
    job: {
      title: 'Backend Developer',
      description: 'We are hiring a backend developer. Competitive salary. Great team culture. Apply now.',
      location: 'Remote',
    },
    expectedBand: [15, 35],
    expectedRegion: 'yes',
    note: 'Title hits "backend" (+40). Tech=0 (no tech in description). Signal=1 hit (backend). Exp=ambiguous(50).',
  },

  // ── 5. Disqualifying location — score stays high, region=no ──────────────
  {
    label: '5. Disqualifying location — "no visa sponsorship / US only"',
    job: {
      title: 'Node.js Backend Engineer',
      description:
        'Node.js engineer with Express and TypeScript skills. 3–5 years experience. ' +
        'REST API development. Exciting product company.',
      location: 'New York, NY — US Citizens Only. No visa sponsorship.',
    },
    expectedBand: [60, 90],
    expectedRegion: 'no',
    note: 'Relevance score stays high (good job match). Region=no is independent. Score must NOT drop to 0.',
  },

  // ── 6. Ambiguous location ─────────────────────────────────────────────────
  {
    label: '6. Ambiguous location — Auckland, New Zealand',
    job: {
      title: 'Node.js Developer',
      description:
        'Node.js developer with 2–4 years experience. TypeScript and Express. API development team.',
      location: 'Auckland, New Zealand',
    },
    expectedBand: [40, 65],
    expectedRegion: 'maybe',
    note: 'Location has no match in either list → maybe. Exp=2yrs→junior vs mid target → adjacent (-1 level).',
  },

  // ── 7. Null description ───────────────────────────────────────────────────
  {
    label: '7. Null description — only title survives',
    job: {
      title: 'Node.js Backend Engineer',
      description: null,
      location: 'Remote India',
    },
    expectedBand: [30, 55],
    expectedRegion: 'yes',
    note: 'Title and tech match on title only. Signal=0 (no description). Should not throw.',
  },

  // ── 8. Empty/null everything — pathological input ─────────────────────────
  {
    label: '8. All nulls — empty job object',
    job: {
      title: null,
      description: null,
      location: null,
    },
    expectedBand: [0, 15],
    expectedRegion: 'maybe',
    note: 'Title=0, tech=0, exp=ambiguous(50), signal=0. Final ~7. Must not throw.',
  },

  // ── 9a. Uppercase casing ──────────────────────────────────────────────────
  {
    label: '9a. Case insensitivity — UPPERCASE job',
    job: {
      title: 'BACKEND NODE.JS DEVELOPER',
      description: 'WE NEED A BACKEND NODE.JS DEVELOPER WITH EXPRESS AND TYPESCRIPT. 3+ YEARS. REST API DEVELOPMENT.',
      location: 'REMOTE INDIA',
    },
    expectedBand: [55, 85],
    expectedRegion: 'yes',
    note: 'Identical logical content to 9b just uppercased. Score must match 9b exactly.',
  },

  // ── 9b. Lowercase casing ──────────────────────────────────────────────────
  {
    label: '9b. Case insensitivity — lowercase job',
    job: {
      title: 'backend node.js developer',
      description: 'we need a backend node.js developer with express and typescript. 3+ years. rest api development.',
      location: 'remote india',
    },
    expectedBand: [55, 85],
    expectedRegion: 'yes',
    note: 'Identical logical content to 9a just lowercased. Score must match 9a exactly.',
  },

  // ── 10. Frontend job under backend profile — should score low ────────────
  {
    label: '10. Wrong domain — React Frontend role under backend profile',
    job: {
      title: 'React Frontend Developer',
      description:
        'We need a React developer with TypeScript, Redux, Tailwind CSS. Frontend UI development. 2–3 years experience.',
      location: 'Bangalore, India',
    },
    expectedBand: [0, 25],
    expectedRegion: 'yes',
    note: '"frontend" is a NEGATIVE keyword → title component=0. No signal hits. Low score expected.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Test runner
// ─────────────────────────────────────────────────────────────────────────────

function colorize(text, code) { return `\x1b[${code}m${text}\x1b[0m`; }
const GREEN  = (t) => colorize(t, 32);
const RED    = (t) => colorize(t, 31);
const YELLOW = (t) => colorize(t, 33);
const BOLD   = (t) => colorize(t, 1);
const DIM    = (t) => colorize(t, 2);

function inBand(score, [lo, hi]) { return score >= lo && score <= hi; }

function runSuite(label, profileConfig, samples, checks = []) {
  console.log('\n' + '═'.repeat(70));
  console.log(BOLD(`  SUITE: ${label}`));
  console.log('═'.repeat(70));

  let passed = 0;
  const results = [];

  for (const sample of samples) {
    let result;
    let threw = false;
    try {
      result = scoreJob(sample.job, profileConfig);
    } catch (err) {
      threw = true;
      result = { relevanceScore: -1, indiaFriendly: 'ERROR', components: {}, techStack: [], reasons: [], redFlags: [] };
      console.error(`  ${RED('THREW')} in "${sample.label}": ${err.message}`);
    }

    const scorePassed  = !threw && inBand(result.relevanceScore, sample.expectedBand);
    const regionPassed = !threw && result.indiaFriendly === sample.expectedRegion;
    const ok           = scorePassed && regionPassed && !threw;

    if (ok) passed++;

    const scoreStr = `${result.relevanceScore} (expected ${sample.expectedBand[0]}–${sample.expectedBand[1]})`;
    const regionStr = `${result.indiaFriendly} (expected ${sample.expectedRegion})`;

    console.log(`\n  ${ok ? GREEN('✓') : RED('✗')} ${sample.label}`);
    console.log(`    ${DIM('Note:')} ${sample.note}`);
    console.log(`    Score:  ${scorePassed ? GREEN(scoreStr) : RED(scoreStr)}`);
    console.log(`    Region: ${regionPassed ? GREEN(regionStr) : RED(regionStr)}`);
    console.log(`    Comps:  title=${result.components.title?.score} tech=${result.components.tech?.score} exp=${result.components.experience?.score} signal=${result.components.signal?.score}`);
    console.log(`    Tech:   [${(result.techStack ?? []).join(', ')}]`);
    if (result.reasons?.length)  console.log(`    ${GREEN('+')} ${result.reasons.join(' | ')}`);
    if (result.redFlags?.length) console.log(`    ${RED('-')} ${result.redFlags.join(' | ')}`);

    results.push({ label: sample.label, result, ok });
  }

  console.log(`\n  ${BOLD('Result:')} ${passed}/${samples.length} passed`);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check 1 & 2: Run all samples against backend-node profile
// ─────────────────────────────────────────────────────────────────────────────

const backendResults = runSuite('backend-node profile (all 10 samples)', backendConfig, SAMPLES);

// ─────────────────────────────────────────────────────────────────────────────
// Check 3: Case-insensitivity — 9a vs 9b must match exactly
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(70));
console.log(BOLD('  CHECK 3: Case-insensitivity (9a vs 9b must be identical)'));
console.log('─'.repeat(70));
const s9a = backendResults.find(r => r.label.startsWith('9a'));
const s9b = backendResults.find(r => r.label.startsWith('9b'));
const caseOk = s9a && s9b &&
  s9a.result.relevanceScore === s9b.result.relevanceScore &&
  JSON.stringify(s9a.result.techStack.sort()) === JSON.stringify(s9b.result.techStack.sort());
console.log(`  ${caseOk ? GREEN('✓') : RED('✗')} 9a score=${s9a?.result.relevanceScore}, 9b score=${s9b?.result.relevanceScore}`);
console.log(`  ${caseOk ? GREEN('✓') : RED('✗')} 9a tech=[${s9a?.result.techStack?.sort().join(',')}], 9b tech=[${s9b?.result.techStack?.sort().join(',')}]`);

// ─────────────────────────────────────────────────────────────────────────────
// Check 4: Profile switching — same jobs, frontend profile should score differently
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(70));
console.log(BOLD('  CHECK 4: Profile switching — run samples 1 & 10 on frontend profile'));
console.log('─'.repeat(70));

const frontendSamples = [SAMPLES[0], SAMPLES[9]]; // perfect backend match & frontend job
const frontendResults = runSuite('frontend-react profile (samples 1 & 10)', frontendConfig, [
  { ...SAMPLES[0], expectedBand: [0, 40],  expectedRegion: 'yes', note: 'Backend job should score LOWER under frontend profile' },
  {
    // Sample 10 — React Frontend Developer — should score HIGH on frontend profile
    label: '10-frontend. React Frontend Developer under frontend profile',
    job: {
      title: 'React Frontend Developer',
      description:
        'We need a React developer with TypeScript, Redux, and Tailwind CSS. ' +
        'Frontend UI component development. 2–3 years experience. Web application.',
      location: 'Bangalore, India',
    },
    expectedBand: [55, 100],
    expectedRegion: 'yes',
    note: 'Frontend job should score HIGHER under frontend profile (react+typescript in core_tech)',
  },
]);

// ─────────────────────────────────────────────────────────────────────────────
// Check 5: Weight normalization — all weights = 10 (sum=40, not 100)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(70));
console.log(BOLD('  CHECK 5: Weight normalization (all weights = 10, sum = 40)'));
console.log('─'.repeat(70));

const flatWeightConfig = mergeWithDefaults(
  JSON.parse(JSON.stringify({ // deep clone
    ...yaml.load(readFileSync(join(__dirname, 'profiles', 'backend-node.yaml'), 'utf8')),
    scoring: {
      ...yaml.load(readFileSync(join(__dirname, 'profiles', 'backend-node.yaml'), 'utf8'))?.scoring,
      weights: { title: 10, tech: 10, experience: 10, signal: 10 },
    },
  }))
);

const flatResult = scoreJob(SAMPLES[0].job, flatWeightConfig);
const flatOk = flatResult.relevanceScore >= 0 && flatResult.relevanceScore <= 100;
console.log(`  ${flatOk ? GREEN('✓') : RED('✗')} Score with weights=10 each (sum=40): ${flatResult.relevanceScore} — must be in [0,100]`);
console.log(`  Comps: title=${flatResult.components.title.score} tech=${flatResult.components.tech.score} exp=${flatResult.components.experience.score} signal=${flatResult.components.signal.score}`);

// ─────────────────────────────────────────────────────────────────────────────
// Check 6: Malformed input — none should throw
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(70));
console.log(BOLD('  CHECK 6: Malformed input — all must return without throwing'));
console.log('─'.repeat(70));

const malformedCases = [
  { label: 'null job object',      job: null },
  { label: 'missing all fields',   job: {} },
  { label: 'numeric title',        job: { title: 42, description: false, location: undefined } },
  { label: 'array title',          job: { title: ['node', 'backend'], description: null } },
  { label: 'html in description',  job: { title: 'Node Developer', description: '<p>Build <b>node.js</b> APIs &amp; microservices</p>', location: null } },
];

let malformedPassed = 0;
for (const { label, job } of malformedCases) {
  try {
    const r = scoreJob(job, backendConfig);
    console.log(`  ${GREEN('✓')} "${label}" → score=${r.relevanceScore}, region=${r.indiaFriendly}`);
    malformedPassed++;
  } catch (err) {
    console.log(`  ${RED('✗')} "${label}" THREW: ${err.message}`);
  }
}
console.log(`  Result: ${malformedPassed}/${malformedCases.length} survived`);

// ─────────────────────────────────────────────────────────────────────────────
// Check 7: Detailed attribution — experience mismatch & disqualifying region
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(70));
console.log(BOLD('  CHECK 7: Attribution — exp mismatch (sample 3) & region (sample 5)'));
console.log('─'.repeat(70));

const expMismatch = scoreJob(SAMPLES[2].job, backendConfig);
const expNote = expMismatch.redFlags.find(f => f.toLowerCase().includes('experience'));
console.log(`\n  Sample 3 (exp mismatch):`);
console.log(`    Experience comp score: ${expMismatch.components.experience.score} (expected ~5)`);
console.log(`    Detected level: ${expMismatch.components.experience.detected} (expected: senior)`);
console.log(`    ${expNote ? GREEN('✓') : RED('✗')} Red flag names the component: "${expNote ?? 'MISSING'}"`);

const regionDq = scoreJob(SAMPLES[4].job, backendConfig);
const regionNote = regionDq.redFlags.find(f => f.toLowerCase().includes('region') || f.toLowerCase().includes('disqualifying'));
console.log(`\n  Sample 5 (disqualifying region):`);
console.log(`    Relevance score: ${regionDq.relevanceScore} (should be > 0, NOT zeroed out)`);
console.log(`    Region: ${regionDq.indiaFriendly} (expected: no)`);
console.log(`    Location note: "${regionDq.locationNote}"`);
console.log(`    ${regionNote ? GREEN('✓') : RED('✗')} Red flag names the keyword: "${regionNote ?? 'MISSING'}"`);
console.log(`    ${regionDq.relevanceScore > 0 ? GREEN('✓') : RED('✗')} Score NOT zeroed by region classification`);

// ─────────────────────────────────────────────────────────────────────────────
// Final summary
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(70));
console.log(BOLD('  OVERALL SUMMARY'));
console.log('═'.repeat(70));

const backendPassed  = backendResults.filter(r => r.ok).length;
const frontendPassed = frontendResults.filter(r => r.ok).length;
console.log(`  Backend profile samples:   ${backendPassed}/${SAMPLES.length}`);
console.log(`  Frontend profile switch:   ${frontendPassed}/2`);
console.log(`  Case insensitivity:        ${caseOk ? GREEN('PASS') : RED('FAIL')}`);
console.log(`  Weight normalization:      ${flatOk ? GREEN('PASS') : RED('FAIL')}`);
console.log(`  Malformed input survival:  ${malformedPassed}/${malformedCases.length}`);
console.log('');
