# Coframe JIT TV Storefront

A TV storefront that builds the page for each visitor, made for Coframe's agent engineer take-home.
A visitor arrives with `?q=<what they want>` and optional `&ids=<flagged products>`, and gets a layout picked for them in about 1 to 2 seconds.

## What I built

- **Two classifiers in parallel**: one picks the layout, quantity and a one-line reason; the other pulls filters (brand, panel, size, price, refresh rate, HDR, rating, sort) out of the note. Neither sees the catalog.
- **Code does the matching**: flagged ids are fuzzy matched, then products are filtered, ranked, and soft filters relax when nothing matches, so the model can't invent products.
- **5 fixed layouts**: nontechnical, comparison, bulk, spotlight and fallback. The model only picks one; every layout except fallback ends with the rest of the collection, ranked by how close each TV is.
- **Fallbacks**: keyword rules take over on a timeout, an error or a free quota 429, and answers are cached for an hour.
- **Test bar**: an example for every layout, a free text query box and a response timer.

## How it works

1. `page.tsx` reads `q` and `ids` from the URL.
2. `analyze.ts` runs both classifiers at once with a 5s deadline.
3. `match.ts` turns flagged ids and filters into a ranked product list.
4. The chosen template renders the matches, then the rest of the collection.

The models are free Nemotron 3.5 models on OpenRouter, set in `LLM_MODELS`.

## Where things live

All app code is in `agent-engineer-take-home/app/src`.

- `lib/classifiers.ts`: both prompts
- `lib/analyze.ts`: runs the classifiers, fallbacks and cache
- `lib/match.ts`: id matching, filtering, ranking and relaxing
- `lib/rules.ts`: keyword fallback
- `lib/llm.ts`: OpenRouter call and free quota handling
- `templates/`: the 5 layouts and the rest of the collection
- `components/TestBar.tsx`: the test bar

## Run it

```bash
cd agent-engineer-take-home/app
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` to an OpenRouter key, then open http://localhost:3000 and pick an example.
Run the checks with `npx tsx scripts/eval.ts`, and add `--llm` to include the live README queries.

## How I built it

- [how-i-built-it.md](how-i-built-it.md): v1 with the whole catalog, how I steered it, what shipped, and the bugs testing caught.
- [initial-approach-and-final-thoughts.md](initial-approach-and-final-thoughts.md): my raw notes before building and my final answers.
- [agent-engineer-take-home/README.md](agent-engineer-take-home/README.md): Coframe's original brief.
