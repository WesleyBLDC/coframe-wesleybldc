import { completeJson } from '@/lib/llm';
import { cleanFilters, type Filters } from '@/lib/match';

export const TEMPLATE_NAMES = ['nontechnical', 'comparison', 'bulk', 'spotlight', 'fallback'] as const;
export type TemplateName = (typeof TEMPLATE_NAMES)[number];

export interface TemplateResult {
  template: TemplateName;
  quantity: number;
  reason: string;
}

// Neither prompt carries the catalog: the model reads the note, code does the matching.

const TEMPLATE_SYSTEM = `Classify a TV store visitor's note into one page layout. Reply with JSON only: {"template": "...", "quantity": ..., "reason": "..."}
Layouts:
- nontechnical: wants a recommendation in plain terms and does not ask for specs.
- comparison: wants to compare models, or asks about specs such as panel type, refresh rate or HDR.
- bulk: buying more than one unit, or buying for an office, conference room, hotel or business.
- spotlight: names one specific model, or exactly one product is flagged.
- fallback: the note is not about buying a TV.
quantity: number of units the visitor will buy; 1 when not stated. It is never the number of flagged products.
reason: one short sentence speaking to the visitor as "you" about what they asked for. No prices, counts or brand names.`;

const FILTER_SYSTEM = `Extract shopping filters from a TV store visitor's note. Reply with a JSON object containing only the keys the note states or clearly implies; leave every other key out.
Keys:
- brands: array from Samsung, LG, Sony, TCL, Hisense, Vizio. "No new brands" means ["Samsung", "LG", "Sony"].
- excludeBrands: array, same names.
- panels: array from OLED, QD-OLED, Mini LED, QLED, LED.
- minSize, maxSize: screen size in inches.
- maxPrice: price per unit in USD.
- minRefreshRate: refresh rate in Hz.
- hdr: array from Dolby Vision, HDR10+.
- minRating: star rating from 1 to 5.
- sort: price_asc (cheap, budget, best price), size_desc (biggest, largest) or rating_desc (best reviews, top rated). When the visitor wants the biggest TV, sort is size_desc even if they also mention price.`;

export async function classifyTemplate(q: string, flaggedCount: number, signal: AbortSignal): Promise<TemplateResult> {
  const r = await completeJson(TEMPLATE_SYSTEM, `Note: ${q}\nFlagged products: ${flaggedCount}`, { maxTokens: 120, signal });
  if (!TEMPLATE_NAMES.includes(r.template as TemplateName)) throw new Error(`unknown template ${String(r.template)}`);
  return {
    template: r.template as TemplateName,
    quantity: Math.max(1, Math.round(Number(r.quantity)) || 1),
    reason: typeof r.reason === 'string' ? r.reason.slice(0, 200) : '',
  };
}

export async function extractFilters(q: string, signal: AbortSignal): Promise<Filters> {
  return cleanFilters(await completeJson(FILTER_SYSTEM, `Note: ${q}`, { maxTokens: 150, signal }));
}
