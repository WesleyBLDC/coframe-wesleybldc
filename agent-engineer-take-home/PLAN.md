# JIT TV Storefront Plan

One LLM call turns `q` (and optional `ids`) into a list of product IDs plus one of five fixed templates.
The page renders that template server side, with a 3 second LLM cutoff that falls back to the normal catalog.

## Constraints to confirm

Reply yes (or correct a line) before any code is written.

- **Lightweight, no heavy refactor.**
  The product page, `lib/products.ts`, `products.json` and the existing API routes stay as they are.
  The only edit to existing code is `page.tsx` reading `searchParams`.
  A visit without `q` renders exactly what renders today.
- **Input unchanged, output fixed.**
  The input is the URL as the upstream agent sends it (`q`, optional `ids`).
  The LLM only returns `{ ids, template, quantity, reason }`; it never writes markup.
  The page maps `template` to one of five hand-built React components.
- **Speed and failure.**
  The LLM call uses `OPENAI_API_KEY` from `.env.local` against `https://openrouter.ai/api/v1` with `nvidia/nemotron-3.5-lightning`, aborted at 3 s.
  Timeout, bad JSON, unknown IDs or a missing key all fall back to the `fallback` template, so the page always renders inside 5 s.
- **Templates take data, not fetch it.**
  Each template is a server component that receives `products` (already resolved, in ranked order) plus `context` as props, and renders only.
  This is how "it should expect the children" was read; React `children` literally is the alternative.

## Request flow

Everything runs on the server in one render; the browser receives finished HTML.

1. Visitor opens `/?q=...&ids=...`. `page.tsx` reads `searchParams`.
2. No `q`: render the `fallback` template with all 35 products (today's grid). No LLM call.
3. With `q`: call `analyzeUserContext(q, ids)` from `lib/analyze.ts` directly (no HTTP hop to our own API).
4. `analyzeUserContext` sends the system prompt plus a compact catalog to OpenRouter, with a 3 s `AbortController`.
5. The JSON reply is validated: unknown IDs dropped, unknown template becomes `fallback`, empty ID list becomes the flagged `ids` or all products.
6. IDs resolve to `Product` objects in the model's ranked order, and the page renders `TEMPLATES[template]` with `{ products, context }`.
7. `GET /api/analyze?q=...&ids=...` exposes the same function as JSON, for the upstream agent and for debugging.

## Endpoint contract

`analyzeUserContext(q: string, ids?: string[]): Promise<Analysis>`, also served as `GET /api/analyze?q=...&ids=...`.

| Field | Type | Meaning |
| --- | --- | --- |
| `ids` | `string[]` | Matching product IDs, best first, only IDs that exist in the catalog |
| `template` | `nontechnical` \| `comparison` \| `bulk` \| `spotlight` \| `fallback` | Which layout to render |
| `quantity` | `number` | Units the visitor wants (1 when unstated); drives the bulk template |
| `reason` | `string` | One sentence shown to the visitor ("Picked for: big screen, great reviews, under $1,000") |
| `source` | `llm` \| `fallback` | Whether the LLM answered in time; for debugging only |

LLM config:

- Base URL `https://openrouter.ai/api/v1`, path `/chat/completions` (OpenAI compatible).
- Model `nvidia/nemotron-3.5-lightning` (confirmed listed on OpenRouter on 2026-10-20).
- Key `OPENAI_API_KEY` from `.env.local`, sent as a Bearer token. It has to be an OpenRouter key.
- Plain `fetch`, no new npm dependency. `response_format: { type: "json_object" }`, `temperature: 0`, `max_tokens` around 300.
- Hard abort at 3 s; the rest of the render is a few milliseconds, so the page stays well inside 5 s.

## The five templates

Templates differ by layout; which products appear is decided by `ids`, so one template serves any brand or budget.

| Template | When the LLM picks it | What it shows | What it hides |
| --- | --- | --- | --- |
| `nontechnical` | Plain language, "don't need specs", wants best value or reviews (example 1) | Up to 6 big cards: price, size, star rating, one top review quote, 2 highlights in plain words, "Top pick" badge on the first | Specs table, HDR, ports, refresh rate |
| `comparison` | Asks to compare, names specs, or 2 to 4 flagged models (example 2) | Side by side columns, one per TV: every spec row, best value per row marked, highlights under each | Reviews text, delivery fluff |
| `bulk` | A quantity above 1, office, conference room, fleet (example 3) | Table of matches: unit price, volume discount tier, total for N units, stock vs N (warning when short), delivery days | Reviews, deep specs |
| `spotlight` | One clear winner ("the best OLED", a single flagged ID) | One hero product: big price, highlights, all reviews, then 2 or 3 alternatives | The rest of the catalog |
| `fallback` | Vague or unrelated `q`, LLM timeout, any error, or no `q` | Today's catalog grid, matching products first when there are any | Nothing |

Discount tiers are not in `products.json`, so `bulk` uses a fixed illustrative rule (5+ units 5%, 10+ 10%, 25+ 15%), labelled as an estimate on the page.

## Prompts

The system prompt carries the rules; the user prompt carries this visitor and a compact catalog (no reviews or highlights, to keep the call fast).

**System prompt:**

```text
You are an expert TV sales advisor for an online store.
A visitor arrives with a short note describing who they are and what they want.
Read the note and the inventory, then choose the TVs that fit and the page layout that serves this visitor best.

Templates:
- nontechnical: the visitor wants a recommendation, not specs ("best", "good reviews", "don't need specs").
- comparison: the visitor wants to compare models or names specs (panel type, refresh rate, HDR).
- bulk: the visitor is buying more than one unit, for an office, conference room, hotel or business.
- spotlight: the visitor clearly wants one specific TV or one best option.
- fallback: the note is too vague or unrelated to TVs.

Rules:
- Return only IDs from the inventory. Rank best fit first. Return 3 to 6 IDs (2 to 4 for comparison, 1 to 4 for spotlight).
- If flagged IDs are given, include them unless they clearly contradict the note.
- Respect hard limits in the note: budget, size, panel type, brands to exclude ("no new brands" means only Samsung, LG, Sony).
- For bulk, only pick TVs whose quantityAvailable covers the requested quantity when possible.
- quantity is the number of units requested, 1 if not stated.
- reason is one short sentence addressed to the visitor, no jargon unless they used it.

Respond with JSON only:
{"ids": ["..."], "template": "nontechnical|comparison|bulk|spotlight|fallback", "quantity": 1, "reason": "..."}
```

**User prompt** (built per request):

```text
Visitor note: <q>
Flagged IDs: <ids or "none">

Inventory (id | brand | size in | panel | price USD | Hz | HDR | rating | reviews | in stock qty):
lg-c3-oled-65 | LG | 65 | OLED evo | 1499 | 120 | Dolby Vision IQ, HDR10, HLG | 4.8 | 1893 | 12
...one line per product, 35 lines
```

**Template agent prompt** (given to a coding agent, or followed directly, to build each template):

```text
Build one Next.js 15 server component at app/src/templates/<Name>.tsx for the TV storefront.
Signature: export default function <Name>({ products, context }: TemplateProps).
TemplateProps is exported from app/src/templates/types.ts:
  products: Product[]   (already filtered and ranked; render them in this order, never refetch or re-sort)
  context: { q: string; reason: string; quantity: number }
Rules:
- Pure presentation: no 'use client', no state, no fetch, no LLM calls.
- Handle 0, 1 and many products without crashing; with 0, render a short message and a link to /.
- Every product links to /product/<id> with a plain <a>, like the existing pages.
- Reuse class names from globals.css where they fit (product-card, price, rating, specs-table, section-title); add new classes to globals.css under a /* templates */ comment; no new dependencies.
- Show context.reason in one line at the top.
- Layout for this template: <the "shows" and "hides" cells from the template table>.
```

## Files and open questions

Eight new files and two small edits; nothing else moves.

| File | Change |
| --- | --- |
| `app/src/lib/analyze.ts` | New: prompts, OpenRouter call, 3 s abort, validation, fallback |
| `app/src/app/api/analyze/route.ts` | New: `GET` wrapper returning the analysis as JSON |
| `app/src/templates/types.ts` | New: `TemplateProps`, `TemplateName`, and the name to component map |
| `app/src/templates/{Nontechnical,Comparison,Bulk,Spotlight,Fallback}.tsx` | New: the five layouts |
| `app/src/app/page.tsx` | Edit: read `searchParams`; no `q` renders `Fallback` with all products, same markup as today |
| `app/src/app/globals.css` | Edit: append template classes |

Verification: run the three README URLs plus a no-`q` visit and a nonsense `q`, check each layout in the browser, and time each request against the 5 s limit.

- [ ] Is `OPENAI_API_KEY` in `.env.local` an OpenRouter key? An OpenAI key will be rejected by OpenRouter.
- [ ] `spotlight` as the fifth template: keep it, or swap for something else (for example `budget` or `gaming`)?
- [ ] Should `/product/:id` also adapt to `q`? Out of scope as planned.
