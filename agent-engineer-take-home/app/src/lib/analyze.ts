import { getAllProducts } from '@/lib/products';
import { classifyTemplate, extractFilters, type TemplateName } from '@/lib/classifiers';
import { matchIds, select, type Filters } from '@/lib/match';
import { filtersByRules, templateByRules } from '@/lib/rules';

export type { TemplateName } from '@/lib/classifiers';

type Source = 'llm' | 'rules' | 'cache';

export interface Analysis {
  template: TemplateName;
  quantity: number;
  reason: string;
  filters: Filters;
  /** Product IDs the template renders, in order. */
  shown: string[];
  /** Every other product, ranked by how closely it matches; shown under "Rest of the TV collection". */
  rest: string[];
  source: { template: Source; filters: Source };
}

const TIMEOUT_MS = 5000;
const COUNTS: Record<TemplateName, number> = { nontechnical: 6, comparison: 4, bulk: 6, spotlight: 4, fallback: Infinity };

// Repeat visits (README examples, demo reruns) skip the LLM entirely and spend no free requests.
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; value: Analysis }>();

export async function analyzeUserContext(q: string, ids: string[] = []): Promise<Analysis> {
  const products = getAllProducts();
  const flagged = matchIds(ids, products);
  const key = `${q.trim().toLowerCase()}|${flagged.map(p => p.id).join(',')}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.value, source: { template: 'cache', filters: 'cache' } };

  // Both classifiers run at once under one deadline; each falls back to keyword rules on its own.
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const [t, f] = await Promise.allSettled([classifyTemplate(q, flagged.length, signal), extractFilters(q, signal)]);
  if (t.status === 'rejected') console.warn(`[analyze] template classifier fell back to rules: ${String(t.reason)}`);
  if (f.status === 'rejected') console.warn(`[analyze] filter extractor fell back to rules: ${String(f.reason)}`);
  const tpl = t.status === 'fulfilled' ? t.value : templateByRules(q, flagged.length);
  // A note that is not about buying a TV has no meaningful filters, whatever the extractor guessed.
  const filters: Filters = tpl.template === 'fallback' ? {} : { ...(f.status === 'fulfilled' ? f.value : filtersByRules(q)) };
  // A bulk buyer needs enough stock for the whole order.
  if (tpl.template === 'bulk' && tpl.quantity > 1) filters.minStock = tpl.quantity;

  const flaggedOnly = tpl.template === 'comparison' && flagged.length >= 2;
  let { shown, rest } = select(products, filters, flagged, COUNTS[tpl.template], flaggedOnly);
  // The fallback grid is the whole catalog, best matches first, with no separate rest section.
  if (tpl.template === 'fallback') [shown, rest] = [[...shown, ...rest], []];
  const analysis: Analysis = {
    ...tpl,
    filters,
    shown: shown.map(p => p.id),
    rest: rest.map(p => p.id),
    source: { template: t.status === 'fulfilled' ? 'llm' : 'rules', filters: f.status === 'fulfilled' ? 'llm' : 'rules' },
  };

  // Only cache full LLM answers; a rules fallback from a transient failure should be retried.
  if (t.status === 'fulfilled' && f.status === 'fulfilled') {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), value: analysis });
  }
  return analysis;
}
