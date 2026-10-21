# How I Built It

I built this with Claude Code.
I steered, it planned, coded and benchmarked, and every design change came from a measurement instead of a guess.

## 1. Prompt and plan

- **My ask**: read the repo, then design an endpoint that takes `q`, figures out what the buyer wants, and returns matching product ids plus a template.
- **Constraints I gave**: under 5s, OpenRouter with `nvidia/nemotron-3.5-lightning`, a small fixed set of templates, no heavy refactor.
- **Plan**: Claude restated the constraints, I approved, and it wrote `PLAN.md`.
- **Key decision**: 5 fixed templates (nontechnical, comparison, bulk, spotlight, fallback); the model only picks one and never writes UI.

## 2. v1: one model, whole catalog

Commit `fa4d037`.

- **How it worked**: one call with the system prompt plus all 35 TVs as text, about 2,400 input tokens.
- **Output**: ids, template, quantity and reason in one JSON object.
- **First agent output that mattered**: the default OpenRouter provider took 8 to 10s on a tiny prompt; pinning DeepInfra got it to 0.8s.
- **Problems**: it dropped flagged ids, picked a TCL for a "no new brands" office buyer, and invented facts in the reason ("all under $700" next to a $999 TV).
- **Takeaway**: it worked at about 1 to 2s, but the prompt grows with the catalog and the model was doing matching that code should do.

## 3. Steering

- **Free models only**: had it benchmark about 15 free models on the real prompt; only 2 Nemotron 3.5 models were fast and reliable, the rest were rate limited, reasoning only, or took 5 to 21s.
- **Smaller prompts**: a slimmer catalog cut input from 2,423 to 1,242 tokens and time to about 1s.
- **No catalog in the prompt**: I pushed to split into async classifiers that return attributes, then filter the catalog in code.
- **Prototype result**: two classifiers in parallel, about 200 tokens each, 0.87 to 2.24s.
- **Split vs one combined call**: combined got 2 of 3 README layouts right and copied sample values into every answer; the split got 3 of 3, so I kept the split.
- **Ranked rest of collection**: everything not shown goes below, closest matches first.

## 4. v2: what shipped

Commit `a4ddbdd`, plus fixes after.

- **Template classifier**: note and flagged count in; layout, quantity and reason out.
- **Filter classifier**: note in; brands, panels, size, price, refresh rate, HDR, rating and sort out.
- **Code**: fuzzy id matching, filtering, ranking, and relaxing soft filters when nothing matches.
- **Fallbacks**: keyword rules replace a classifier on timeout or error, model calls pause on a free quota 429, answers are cached for an hour.
- **Speed**: about 1 to 2s per page.

## 5. Bugs testing caught

- **Eval script**: the keyword rules read "dont need specs" as asking for specs.
- **Live check**: the spotlight for "Sony 65" X90L" showed the A95L first; models named in the note now count as flagged.
- **Nonsense notes**: the filter classifier invented a size range; filters are now ignored when the layout is fallback.

## Final prompts

Both run in parallel on `nvidia/nemotron-3.5-lightning:free` with `nvidia/nemotron-3.5-super-vl:free` as backup, JSON mode, reasoning off, temperature 0.
Source: `agent-engineer-take-home/app/src/lib/classifiers.ts`.

**Template classifier, system:**

```text
Classify a TV store visitor's note into one page layout. Reply with JSON only: {"template": "...", "quantity": ..., "reason": "..."}
Layouts:
- nontechnical: wants a recommendation in plain terms and does not ask for specs.
- comparison: wants to compare models, or asks about specs such as panel type, refresh rate or HDR.
- bulk: buying more than one unit, or buying for an office, conference room, hotel or business.
- spotlight: names one specific model, or exactly one product is flagged.
- fallback: the note is not about buying a TV.
quantity: number of units the visitor will buy; 1 when not stated. It is never the number of flagged products.
reason: one short sentence speaking to the visitor as "you" about what they asked for. No prices, counts or brand names.
```

**Template classifier, user:**

```text
Note: <q>
Flagged products: <flagged count>
```

**Filter classifier, system:**

```text
Extract shopping filters from a TV store visitor's note. Reply with a JSON object containing only the keys the note states or clearly implies; leave every other key out.
Keys:
- brands: array from Samsung, LG, Sony, TCL, Hisense, Vizio. "No new brands" means ["Samsung", "LG", "Sony"].
- excludeBrands: array, same names.
- panels: array from OLED, QD-OLED, Mini LED, QLED, LED.
- minSize, maxSize: screen size in inches.
- maxPrice: price per unit in USD.
- minRefreshRate: refresh rate in Hz.
- hdr: array from Dolby Vision, HDR10+.
- minRating: star rating from 1 to 5.
- sort: price_asc (cheap, budget, best price), size_desc (biggest, largest) or rating_desc (best reviews, top rated). When the visitor wants the biggest TV, sort is size_desc even if they also mention price.
```

**Filter classifier, user:**

```text
Note: <q>
```
