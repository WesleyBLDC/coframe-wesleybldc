import type { Product } from '@/lib/products';

// Deterministic side of the pipeline: classifiers describe what the visitor wants, this code
// decides which products that means. Nothing here calls the LLM.

export type Sort = 'price_asc' | 'size_desc' | 'rating_desc';

export interface Filters {
  brands?: string[];
  excludeBrands?: string[];
  panels?: string[];
  minSize?: number;
  maxSize?: number;
  maxPrice?: number;
  minRefreshRate?: number;
  hdr?: string[];
  minRating?: number;
  minStock?: number;
  sort?: Sort;
}

const BRANDS = ['Samsung', 'LG', 'Sony', 'TCL', 'Hisense', 'Vizio'];
const HDR = ['Dolby Vision', 'HDR10+'];
// Panel families map the words shoppers use onto the catalog's displayType values.
const PANELS: Record<string, string[]> = {
  OLED: ['OLED', 'OLED evo', 'QD-OLED'],
  'QD-OLED': ['QD-OLED'],
  'Mini LED': ['Mini LED', 'QLED Mini LED', 'Mini LED ULED', 'Neo QLED'],
  QLED: ['QLED', 'Neo QLED', 'QLED Mini LED'],
  LED: ['LED', 'Full Array LED'],
};
const SORTS: Sort[] = ['price_asc', 'size_desc', 'rating_desc'];

function pick(value: unknown, allowed: string[]): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = allowed.filter(a => value.some(v => typeof v === 'string' && v.toLowerCase() === a.toLowerCase()));
  return out.length ? out : undefined;
}

function positive(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Keep only recognised values; models send 0 or [] for "no preference", which must mean no filter.
export function cleanFilters(raw: Record<string, unknown>): Filters {
  const f: Filters = {
    brands: pick(raw.brands, BRANDS),
    excludeBrands: pick(raw.excludeBrands, BRANDS),
    panels: pick(raw.panels, Object.keys(PANELS)),
    minSize: positive(raw.minSize),
    maxSize: positive(raw.maxSize),
    maxPrice: positive(raw.maxPrice),
    minRefreshRate: positive(raw.minRefreshRate),
    hdr: pick(raw.hdr, HDR),
    minRating: positive(raw.minRating),
    sort: SORTS.includes(raw.sort as Sort) ? (raw.sort as Sort) : undefined,
  };
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as Filters;
}

type CheckKey = Exclude<keyof Filters, 'sort'>;

// Ordered softest first: when nothing matches, constraints are dropped in this order.
// The last three are the visitor's hard asks and are never dropped.
const CHECKS: [CheckKey, (p: Product, f: Filters) => boolean][] = [
  ['minRating', (p, f) => p.rating >= f.minRating!],
  ['minRefreshRate', (p, f) => p.refreshRate >= f.minRefreshRate!],
  ['hdr', (p, f) => f.hdr!.some(h => p.hdr.some(x => x.startsWith(h)))],
  ['minStock', (p, f) => p.quantityAvailable >= f.minStock!],
  ['minSize', (p, f) => p.size >= f.minSize!],
  ['maxSize', (p, f) => p.size <= f.maxSize!],
  ['maxPrice', (p, f) => p.price <= f.maxPrice!],
  ['panels', (p, f) => f.panels!.some(fam => PANELS[fam].includes(p.displayType))],
  ['brands', (p, f) => f.brands!.includes(p.brand)],
  ['excludeBrands', (p, f) => !f.excludeBrands!.includes(p.brand)],
];
const RELAXABLE = CHECKS.slice(0, 7).map(([key]) => key);

/** Number of set filters this product fails; 0 means a full match. */
export function misses(p: Product, f: Filters): number {
  return CHECKS.filter(([key, test]) => f[key] !== undefined && !test(p, f)).length;
}

function compare(sort: Sort | undefined) {
  return (a: Product, b: Product) => {
    if (sort === 'price_asc') return a.price - b.price || b.rating - a.rating;
    if (sort === 'size_desc') return b.size - a.size || b.rating - a.rating;
    return b.rating - a.rating || b.reviewCount - a.reviewCount;
  };
}

/** Whole catalog, best first: full matches, then fewest misses, each group in the requested sort. */
export function rank(products: Product[], f: Filters): Product[] {
  const byMisses = new Map(products.map(p => [p.id, misses(p, f)]));
  const cmp = compare(f.sort);
  return [...products].sort((a, b) => byMisses.get(a.id)! - byMisses.get(b.id)! || cmp(a, b));
}

/**
 * Splits the catalog into what the template shows and the ranked rest.
 * Flagged products always lead. If no product passes every filter, soft filters are dropped one
 * at a time until something does, so the page is never empty.
 */
export function select(products: Product[], f: Filters, flagged: Product[], count: number, flaggedOnly: boolean) {
  const ranked = rank(products, f);
  let relaxed = f;
  let pool = ranked.filter(p => misses(p, relaxed) === 0);
  for (const key of RELAXABLE) {
    if (pool.length) break;
    relaxed = { ...relaxed, [key]: undefined };
    pool = ranked.filter(p => misses(p, relaxed) === 0);
  }
  if (!pool.length) pool = ranked;

  const lead = flaggedOnly ? flagged : [...flagged, ...pool];
  const shown = [...new Map(lead.map(p => [p.id, p])).values()].slice(0, Math.max(count, flagged.length));
  const shownIds = new Set(shown.map(p => p.id));
  return { shown, rest: ranked.filter(p => !shownIds.has(p.id)) };
}

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim().split(' ').filter(Boolean);
}

/**
 * Resolves flagged IDs that may not be exact ("LG C3 65", "lg_c3_oled_65") to catalog products.
 * Exact or normalised ID first; otherwise the product whose id, brand, model and size contain every
 * token, preferring the most reviewed when several do. Unmatched IDs are dropped.
 */
export function matchIds(raw: string[], products: Product[]): Product[] {
  const found: Product[] = [];
  for (const input of raw) {
    const t = tokens(input);
    if (!t.length) continue;
    const slug = t.join('-');
    const exact = products.find(p => p.id === input || p.id === slug);
    const fuzzy = exact ?? products
      .filter(p => {
        const have = new Set(tokens(`${p.id} ${p.brand} ${p.model} ${p.size}`));
        return t.every(x => have.has(x));
      })
      .sort((a, b) => b.reviewCount - a.reviewCount)[0];
    if (fuzzy && !found.includes(fuzzy)) found.push(fuzzy);
    else if (!fuzzy) console.warn(`[match] no product for flagged id "${input}"`);
  }
  return found;
}
