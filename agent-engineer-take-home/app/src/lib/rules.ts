import type { TemplateResult } from '@/lib/classifiers';
import type { Filters } from '@/lib/match';

// Keyword fallback for when a classifier times out, errors, or the free quota is spent.
// Cruder than the LLM, but instant and still personalizes the page.

const TV_WORDS = /\b(tvs?|television|screens?|oled|qled|led|hdr|inch|4k|hz|samsung|lg|sony|tcl|hisense|vizio)\b/;

export function templateByRules(q: string, flaggedCount: number): TemplateResult {
  const text = q.toLowerCase();
  const units = Number(text.match(/(\d+)\s*(?:units?|tvs?|screens?|sets?)\b/)?.[1]) || 1;
  if (!TV_WORDS.test(text) && flaggedCount === 0) return { template: 'fallback', quantity: 1, reason: '' };
  if (units > 1 || /\b(office|conference|hotel|business|bulk|fleet|classroom)\b/.test(text)) {
    return { template: 'bulk', quantity: units, reason: '' };
  }
  // "Don't need specs" is a plain-language shopper, not a spec reader.
  const asks = text.replace(/\b(?:don'?t|do not|no)\s+(?:need|want|care about)?\s*(?:the\s+)?specs?\b/g, '');
  if (flaggedCount >= 2 || /compar|side by side|\bvs\b|versus|specs?\b|refresh|hdr/.test(asks)) {
    return { template: 'comparison', quantity: 1, reason: '' };
  }
  if (flaggedCount === 1) return { template: 'spotlight', quantity: 1, reason: '' };
  return { template: 'nontechnical', quantity: 1, reason: '' };
}

export function filtersByRules(q: string): Filters {
  const text = q.toLowerCase();
  const f: Filters = {};

  if (/no new brands/.test(text)) f.brands = ['Samsung', 'LG', 'Sony'];
  else {
    const named = ['Samsung', 'LG', 'Sony', 'TCL', 'Hisense', 'Vizio'].filter(b => new RegExp(`\\b${b.toLowerCase()}\\b`).test(text));
    if (named.length) f.brands = named;
  }

  const panels: string[] = [];
  if (/qd-?\s?oled/.test(text)) panels.push('QD-OLED');
  if (/(^|[^-\w])oled/.test(text.replace(/qd-?\s?oled/g, ''))) panels.push('OLED');
  if (/mini\s?-?led/.test(text)) panels.push('Mini LED');
  if (/\bqled\b/.test(text)) panels.push('QLED');
  if (panels.length) f.panels = panels;

  const size = Number(text.match(/(\d{2})\s*(?:"|-?\s?inch|in\b)/)?.[1]);
  if (size) {
    f.minSize = size;
    f.maxSize = size;
  }
  const price = Number(text.match(/(?:under|below|less than|max|up to)\s*\$?\s*(\d[\d,]*)/)?.[1]?.replace(/,/g, ''));
  if (price) f.maxPrice = price;
  const hz = Number(text.match(/(\d{3})\s*hz/)?.[1]);
  if (hz) f.minRefreshRate = hz;

  if (/biggest|largest|huge/.test(text)) f.sort = 'size_desc';
  else if (/cheap|budget|best price|affordable|lowest price/.test(text)) f.sort = 'price_asc';
  else if (/reviews?|top rated|best rated/.test(text)) f.sort = 'rating_desc';
  return f;
}
