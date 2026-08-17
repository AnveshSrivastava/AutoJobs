// ─────────────────────────────────────────────────────────────────────────────
// scorer.js — Pure, stateless scoring engine
// Consumes: raw job object + active profile config section
// Produces: relevanceScore, techStack, experienceLevel, indiaFriendly, reasons, redFlags
// Never throws — degrades gracefully on any missing field
// ─────────────────────────────────────────────────────────────────────────────

// ─── Keyword Matching ─────────────────────────────────────────────────────────
// Word-boundary aware, case-insensitive.
// Handles special-char keywords (c++, c#, .net) via includes() fallback.

function matchKeyword(text, keyword) {
  if (!text || !keyword) return false;
  const lowerText = text.toLowerCase();
  const lowerKw   = keyword.toLowerCase();

  // Keywords starting with a non-alpha char (.net) or containing +/# (c++, c#)
  // can't use \b — fall back to plain includes.
  if (/^[^a-z0-9]/.test(lowerKw) || /[+#]/.test(lowerKw)) {
    return lowerText.includes(lowerKw);
  }

  try {
    // Escape dots (node.js) and other regex specials, then use \b
    const escaped = lowerKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  } catch {
    return lowerText.includes(lowerKw); // safety fallback
  }
}

// ─── Experience Detection ─────────────────────────────────────────────────────
// Returns 'fresher' | 'junior' | 'mid' | 'senior' | null (= genuinely ambiguous)

const LEVEL_ORDER = ['fresher', 'junior', 'mid', 'senior'];

function detectExperienceLevel(text) {
  if (!text) return null;
  const t = text.toLowerCase();

  // Explicit level words — checked top-down, first match wins.
  // Order matters: check senior-range words before junior-range to handle
  // edge cases like "senior associate" correctly.
  if (/\b(intern|internship|trainee)\b/.test(t))                 return 'fresher';
  if (/\b(fresher)\b/.test(t))                                    return 'fresher';
  if (/\bentry.?level\b/.test(t))                                 return 'fresher';
  if (/\b(principal|architect)\b/.test(t))                        return 'senior';
  if (/\bstaff\s+engineer\b/.test(t))                             return 'senior';
  if (/\b(senior|sr\.?)\b/.test(t))                              return 'senior';
  if (/\blead\s+(?:engineer|developer|dev|software)\b/.test(t))  return 'senior';
  if (/\b(mid.?level|intermediate)\b/.test(t))                   return 'mid';
  if (/\b(junior|jr\.?|associate)\b/.test(t))                    return 'junior';
  if (/\b(graduate)\b/.test(t))                                   return 'junior';

  // Year-range patterns — parse the minimum years, then bucket
  const yearPatterns = [
    /\b(\d+)\+\s*years?\b/i,
    /\b(\d+)\s*(?:to|-|–)\s*\d+\s*years?\b/i,
    /\b(\d+)\s*years?\s+(?:of\s+)?(?:experience|exp)\b/i,
  ];
  for (const pat of yearPatterns) {
    const m = t.match(pat);
    if (m) {
      const yrs = parseInt(m[1], 10);
      if (yrs <= 1)  return 'fresher';
      if (yrs <= 3)  return 'junior';
      if (yrs <= 5)  return 'mid';
      return 'senior';
    }
  }

  return null; // genuinely ambiguous — not the same as a mismatch
}

// ─── Component 1: Title ───────────────────────────────────────────────────────
// Score the job title against profile positive/negative keyword lists.
// Negative keywords can drag the component to 0 even with positive hits.

function scoreTitleComponent(title, positiveKws, negativeKws) {
  if (!title) {
    return { score: 0, positiveHits: [], negativeHits: [] };
  }

  const positiveHits = positiveKws.filter(kw => matchKeyword(title, kw));
  const negativeHits = negativeKws.filter(kw => matchKeyword(title, kw));

  // If no positive keywords defined → neutral (50), can't evaluate
  const positiveScore = positiveKws.length === 0
    ? 50
    : Math.min(100, positiveHits.length * 40);

  // Each negative hit is a hard subtraction; two negatives kill the component
  const negativeReduction = negativeHits.length * 60;

  const score = Math.max(0, positiveScore - negativeReduction);
  return { score, positiveHits, negativeHits };
}

// ─── Component 2: Tech Stack ──────────────────────────────────────────────────
// Matches profile's known tech list against title+description.
// Core tech matches outweigh peripheral ones 2.5:1.

function scoreTechComponent(fullText, relevantTech, coreTech) {
  if (!relevantTech || relevantTech.length === 0) {
    return { score: 50, coreMatches: [], nonCoreMatches: [] };
  }

  const coreSet = new Set(coreTech.map(t => t.toLowerCase()));

  const coreMatches    = coreTech.filter(t => matchKeyword(fullText, t));
  const nonCoreMatches = relevantTech
    .filter(t => !coreSet.has(t.toLowerCase()))
    .filter(t => matchKeyword(fullText, t));

  const score = Math.min(100, coreMatches.length * 25 + nonCoreMatches.length * 10);
  return { score, coreMatches, nonCoreMatches };
}

// ─── Component 3: Experience ─────────────────────────────────────────────────
// Compare detected experience level against profile's target.
// Ambiguous (no signal) → neutral 50, never punished.

function scoreExperienceComponent(title, description, target) {
  const combined = `${title ?? ''} ${description ?? ''}`.trim();
  const detected  = detectExperienceLevel(combined);

  if (target === 'any') {
    return { score: 70, detected, note: 'Profile targets any experience level' };
  }

  if (!detected) {
    return { score: 50, detected: null, note: 'No experience signal — ambiguous' };
  }

  if (detected === target) {
    return { score: 100, detected, note: `Experience level matches target (${target})` };
  }

  const tIdx = LEVEL_ORDER.indexOf(target);
  const dIdx = LEVEL_ORDER.indexOf(detected);
  const diff  = Math.abs(tIdx - dIdx);

  if (diff === 1) {
    return {
      score: 35,
      detected,
      note: `Experience adjacent to target — detected ${detected}, wanted ${target}`,
    };
  }
  return {
    score: 5,
    detected,
    note: `Experience mismatch — detected ${detected}, wanted ${target}`,
  };
}

// ─── Component 4: Domain Signal ───────────────────────────────────────────────
// Checks how many of the profile's title_keywords appear in the description
// (independently of the title component). Acts as a role-context check.

function scoreSignalComponent(description, signalKws) {
  if (!signalKws || signalKws.length === 0) {
    return { score: 50, hits: [] };
  }
  if (!description) {
    return { score: 0, hits: [] };
  }

  const hits  = signalKws.filter(kw => matchKeyword(description, kw));
  const score = Math.min(100, hits.length * 20);
  return { score, hits };
}

// ─── Region Classification ────────────────────────────────────────────────────
// yes / maybe / no.  Negative keywords are authoritative — no override.

function classifyRegion(location, regionPositive, regionNegative) {
  const loc = (location ?? '').toLowerCase();

  if (!loc) {
    return { classification: 'maybe', note: 'No location provided' };
  }

  // Disqualifying — checked first, wins unconditionally
  for (const kw of (regionNegative ?? [])) {
    if (loc.includes(kw.toLowerCase())) {
      return { classification: 'no', note: `Disqualifying keyword: "${kw}"` };
    }
  }

  // Friendly signals
  for (const kw of (regionPositive ?? [])) {
    if (loc.includes(kw.toLowerCase())) {
      return { classification: 'yes', note: `Friendly keyword: "${kw}"` };
    }
  }

  return { classification: 'maybe', note: 'Location not matched to any region rule' };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * scoreJob(job, profileConfig) → result
 *
 * @param {object} job           - Raw job. Any field may be null/undefined/missing.
 * @param {object} profileConfig - Merged profile config (from profile.js mergeWithDefaults).
 * @returns {object}             - See typedef below.
 *
 * Return shape:
 * {
 *   relevanceScore : number (0–100, integer)
 *   techStack      : string[] (subset of relevant_tech found in job text)
 *   experienceLevel: 'fresher'|'junior'|'mid'|'senior'|'unknown'
 *   indiaFriendly  : 'yes'|'maybe'|'no'
 *   locationNote   : string
 *   reasons        : string[]
 *   redFlags       : string[]
 *   components     : { title, tech, experience, signal } — internal sub-scores for debugging
 * }
 */
export function scoreJob(job, profileConfig) {
  // ── Normalize inputs — never trust callers to have validated ──────────────
  const title       = String(job?.title       ?? '').trim();
  const description = String(job?.description ?? '').trim();
  const location    = String(job?.location    ?? '').trim();
  const fullText    = `${title} ${description}`.trim();

  const search    = profileConfig?.search   ?? {};
  const scoring   = profileConfig?.scoring  ?? {};
  const locCfg    = profileConfig?.location ?? {};

  const positiveKws = search.title_keywords_positive ?? [];
  const negativeKws = search.title_keywords_negative ?? [];
  const relevantTech = search.relevant_tech           ?? [];
  const coreTech    = scoring.core_tech               ?? [];
  const target      = scoring.experience_target       ?? 'any';
  const weights     = {
    title:      scoring.weights?.title      ?? 35,
    tech:       scoring.weights?.tech       ?? 35,
    experience: scoring.weights?.experience ?? 15,
    signal:     scoring.weights?.signal     ?? 15,
  };

  // Signal keywords = title_keywords_positive (domain-role context check)
  const signalKws = positiveKws;

  // ── Compute four components ───────────────────────────────────────────────
  const titleResult  = scoreTitleComponent(title, positiveKws, negativeKws);
  const techResult   = scoreTechComponent(fullText, relevantTech, coreTech);
  const expResult    = scoreExperienceComponent(title, description, target);
  const signalResult = scoreSignalComponent(description, signalKws);

  // ── Weighted combination — normalize by actual weight sum (FR-NFR) ────────
  const weightSum = weights.title + weights.tech + weights.experience + weights.signal;

  const rawScore =
    (titleResult.score  * weights.title  +
     techResult.score   * weights.tech   +
     expResult.score    * weights.experience +
     signalResult.score * weights.signal) / weightSum;

  const relevanceScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  // ── Region classification (independent of score) ──────────────────────────
  const regionResult = classifyRegion(location, locCfg.region_positive, locCfg.region_negative);

  // ── Assembled detected tech ───────────────────────────────────────────────
  const techStack = [...new Set([...techResult.coreMatches, ...techResult.nonCoreMatches])];

  // ── Human-readable reasoning ──────────────────────────────────────────────
  const reasons   = [];
  const redFlags  = [];

  if (titleResult.positiveHits.length > 0) {
    reasons.push(`Title keywords matched: ${titleResult.positiveHits.join(', ')}`);
  }
  if (titleResult.negativeHits.length > 0) {
    redFlags.push(`Negative title keywords: ${titleResult.negativeHits.join(', ')}`);
  }
  if (techResult.coreMatches.length > 0) {
    reasons.push(`Core tech matched: ${techResult.coreMatches.join(', ')}`);
  }
  if (techResult.nonCoreMatches.length > 0) {
    reasons.push(`Relevant tech matched: ${techResult.nonCoreMatches.join(', ')}`);
  }
  if (expResult.note) {
    if (expResult.score >= 70) {
      reasons.push(expResult.note);
    } else if (expResult.score < 40) {
      redFlags.push(expResult.note);
    } else {
      reasons.push(expResult.note); // neutral notes go in reasons, not red flags
    }
  }
  if (signalResult.hits.length > 0) {
    reasons.push(`Domain signals in description: ${signalResult.hits.join(', ')}`);
  }
  if (regionResult.classification === 'no') {
    redFlags.push(`Region: ${regionResult.note}`);
  }

  return {
    relevanceScore,
    techStack,
    experienceLevel: expResult.detected ?? 'unknown',
    indiaFriendly:  regionResult.classification,
    locationNote:   regionResult.note,
    reasons,
    redFlags,
    components: {
      title:      { score: titleResult.score,  positiveHits: titleResult.positiveHits, negativeHits: titleResult.negativeHits },
      tech:       { score: techResult.score,   coreMatches: techResult.coreMatches, nonCoreMatches: techResult.nonCoreMatches },
      experience: { score: expResult.score,    detected: expResult.detected },
      signal:     { score: signalResult.score, hits: signalResult.hits },
    },
  };
}
