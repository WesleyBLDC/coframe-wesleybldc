import { getAllProducts, type Product } from '@/lib/products';

export const TEMPLATE_NAMES = ['nontechnical', 'comparison', 'bulk', 'spotlight', 'fallback'] as const;
export type TemplateName = (typeof TEMPLATE_NAMES)[number];

export interface Analysis {
  ids: string[];
  template: TemplateName;
  quantity: number;
  reason: string;
  source: 'llm' | 'fallback';
}

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3.5-lightning';
const TIMEOUT_MS = 5000;
// Measured 2026-10-20 on a tiny prompt: DeepInfra ~0.8s, Darkbloom ~1.2s.
// OpenRouter's default routing picked Io Net, which took 8 to 10s and blew the budget.
const PROVIDERS = ['DeepInfra', 'Darkbloom'];

const SYSTEM_PROMPT = `You are an expert TV sales advisor for an online store.
A visitor arrives with a short note describing who they are and what they want.
Read the note and the inventory, then choose the TVs that fit and the page layout that serves this visitor best.

Templates:
- nontechnical: the visitor wants recommendations in plain language and does not want specs ("best", "good reviews", "don't need specs"). Prefer this for general shoppers.
- comparison: the visitor wants to compare models or names specs (panel type, refresh rate, HDR).
- bulk: the visitor is buying more than one unit, for an office, conference room, hotel or business.
- spotlight: only when the visitor names one specific model, or exactly one ID is flagged.
- fallback: the note does not describe wanting a TV (gibberish, unrelated topics). Return no IDs.

Rules:
- Return only IDs from the inventory. Rank best fit first. Return 3 to 6 IDs (2 to 4 for comparison, 1 to 4 for spotlight).
- Flagged IDs come from an agent that already profiled this visitor: always include all of them first, then add others that fit.
- Respect hard limits in the note: budget, size, panel type, excluded brands. "No new brands" means only Samsung, LG and Sony; never pick TCL, Hisense or Vizio then.
- For bulk, only pick TVs whose in stock qty covers the requested quantity when possible.
- quantity is the number of units requested, 1 if not stated.
- reason is one short sentence addressed to the visitor about what they asked for, no jargon unless they used it. Never state prices, counts or brand names in it; the page shows those.

Respond with JSON only:
{"ids": ["..."], "template": "nontechnical|comparison|bulk|spotlight|fallback", "quantity": 1, "reason": "..."}`;

function inventoryLine(p: Product): string {
  return [p.id, p.brand, p.size, p.displayType, p.price, p.refreshRate, p.hdr.join(', '), p.rating, p.reviewCount, p.quantityAvailable].join(' | ');
}

function userPrompt(q: string, flagged: string[]): string {
  return `Visitor note: ${q}
Flagged IDs: ${flagged.length ? flagged.join(', ') : 'none'}

Inventory (id | brand | size in | panel | price USD | Hz | HDR | rating | reviews | in stock qty):
${getAllProducts().map(inventoryLine).join('\n')}`;
}

function fallback(flagged: string[], why?: string): Analysis {
  if (why) console.warn(`[analyze] fallback: ${why}`);
  return { ids: flagged, template: 'fallback', quantity: 1, reason: '', source: 'fallback' };
}

// Coerce whatever the model returned into a valid Analysis; anything unusable degrades to the fallback.
function validate(raw: unknown, flagged: string[]): Analysis {
  if (!raw || typeof raw !== 'object') return fallback(flagged);
  const r = raw as Record<string, unknown>;
  const known = new Set(getAllProducts().map(p => p.id));
  const ids = Array.isArray(r.ids) ? r.ids.filter((id): id is string => typeof id === 'string' && known.has(id)) : [];
  let template = TEMPLATE_NAMES.includes(r.template as TemplateName) ? (r.template as TemplateName) : 'fallback';
  // The upstream agent's flagged IDs are trusted: always shown, always first.
  const picked = [...new Set([...flagged, ...ids])].slice(0, Math.max(6, flagged.length));
  if (!picked.length) template = 'fallback';
  const quantity = Math.max(1, Math.round(Number(r.quantity)) || 1);
  const reason = typeof r.reason === 'string' ? r.reason.slice(0, 200) : '';
  return { ids: picked, template, quantity, reason, source: 'llm' };
}

export async function analyzeUserContext(q: string, ids: string[] = []): Promise<Analysis> {
  const known = new Set(getAllProducts().map(p => p.id));
  const flagged = ids.filter(id => known.has(id));
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fallback(flagged, 'OPENAI_API_KEY not set');

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        provider: { order: PROVIDERS },
        reasoning: { enabled: false },
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt(q, flagged) },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) return fallback(flagged, `HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const json = content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1);
    return validate(JSON.parse(json), flagged);
  } catch (err) {
    return fallback(flagged, err instanceof Error ? err.message : String(err));
  }
}
