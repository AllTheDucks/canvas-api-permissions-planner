import type { Endpoint, HttpMethod } from '../types';
import { isHttpMethod } from '../types';

const SIS_ID_PREFIXES = [
  'sis_course_id',
  'sis_user_id',
  'sis_login_id',
  'sis_section_id',
  'sis_account_id',
  'sis_term_id',
  'sis_group_id',
] as const;

const SIS_ID_REGEX = new RegExp(
  `^(${SIS_ID_PREFIXES.join('|')}):.+$`
);

function normalisePath(raw: string): { method: HttpMethod | null; tokens: string[] } {
  let input = raw.trim();

  // Strip leading HTTP method if present
  let method: HttpMethod | null = null;
  const leadingWord = input.match(/^(\S+)\s+/);
  if (leadingWord) {
    const upper = leadingWord[1].toUpperCase();
    if (isHttpMethod(upper)) {
      method = upper;
      input = input.slice(leadingWord[0].length);
    }
  }

  // Strip protocol + host
  try {
    const url = new URL(input, 'https://placeholder.invalid');
    input = url.pathname;
  } catch {
    // Not a valid URL — treat as path-only
    const qIdx = input.indexOf('?');
    if (qIdx !== -1) input = input.slice(0, qIdx);
  }

  // Tokenise by /
  const tokens = input.split('/').filter(Boolean);

  // Replace numeric-only tokens and SIS ID tokens with :id
  const normalised = tokens.map((token) => {
    if (/^\d+$/.test(token)) return ':id';
    if (SIS_ID_REGEX.test(token)) return ':id';
    if (token.startsWith(':')) return ':id';
    return token;
  });

  return { method, tokens: normalised };
}

function tokeniseKnownPath(path: string): string[] {
  return path.split('/').filter(Boolean).map((token) =>
    token.startsWith(':') ? ':id' : token
  );
}

export function matchEndpoints(line: string, endpoints: Endpoint[]): Endpoint[] {
  const { method: inputMethod, tokens: inputTokens } = normalisePath(line);

  if (inputTokens.length === 0) return [];

  let bestScore = -1;
  const scored: Array<{ endpoint: Endpoint; score: number }> = [];

  for (const endpoint of endpoints) {
    const knownTokens = tokeniseKnownPath(endpoint.path);
    if (knownTokens.length !== inputTokens.length) continue;

    let score = 0;
    let disqualified = false;
    for (let i = 0; i < inputTokens.length; i++) {
      const a = inputTokens[i];
      const b = knownTokens[i];
      if (a === b) {
        score += 2;
      } else if (a === ':id' || b === ':id') {
        score += 1;
      } else {
        disqualified = true;
        break;
      }
    }
    if (disqualified) continue;

    if (score > bestScore) bestScore = score;
    scored.push({ endpoint, score });
  }

  if (bestScore < 0) return [];

  const topCandidates = scored
    .filter((s) => s.score === bestScore)
    .map((s) => s.endpoint);

  if (inputMethod !== null) {
    const match = topCandidates.find((e) => e.method === inputMethod);
    return match ? [match] : [];
  }

  return topCandidates;
}
