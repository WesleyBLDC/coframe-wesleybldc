# Coframe Agent Engineer — Take-Home

## Background

It's a matter of time until interfaces are fully dynamic — generated just in time, for every user, based on who they are and what they need in that moment. We are not there yet, but we are close enough to ask: what can we do right now?

That is the challenge for your agent.

You have a standard TV storefront. A visitor arrives carrying context: what they are looking for, how technical they are, how many units they need. That context travels as a `q=` parameter on the URL — injected by an upstream Coframe agent that has already built a profile of this visitor.

The storefront ignores it. Every visitor gets the same page.

**Your task:** change that.

---

## What you have

A Next.js storefront backed by a catalog of 35 real TVs.

```bash
cd app
npm install
npm run dev
# → http://localhost:3000
```

Add your OpenAI key before starting:
```bash
cp .env.example .env.local
# then edit .env.local and set OPENAI_API_KEY=sk-...
```

### Pages

| Route | Description |
|---|---|
| `/` | Catalog — all TVs, ignores URL params |
| `/product/:id` | Product detail — specs, reviews, highlights |

These pages are intentionally static. They do not read `q=` or `ids=`.

### API

| Endpoint | Description |
|---|---|
| `GET /api/products` | Full catalog as JSON |
| `GET /api/products/:id` | Single product by ID |

---

## Your task

Add a page (or extend an existing one) that reads two query parameters injected by the upstream agent:

| Param | Type | Description |
|---|---|---|
| `q` | string | Free-text context about this visitor |
| `ids` | string | Comma-separated product IDs the agent flagged as relevant (optional) |

Use these to generate a UI layout that serves this specific visitor — surfacing what matters to them, hiding what doesn't, arranging the page to match their intent.

**Hard constraint:** the full page must render in under 5 seconds.

---

## Example queries

| # | Who | URL |
|---|---|---|
| 1 | Non-technical buyer | `/?q=i+want+the+best+biggest+tv+i+can+get+for+a+reasonable+price+good+reviews+dont+need+specs` |
| 2 | Technical enthusiast comparing OLEDs | `/?q=looking+for+oled+or+qd-oled+only+need+detailed+specs+refresh+rate+hdr+want+to+compare+side+by+side&ids=lg-c3-oled-65,samsung-s90c-65,sony-a95l-65` |
| 3 | Office procurement — buying in bulk | `/?q=buying+5+units+for+a+conference+room+need+reliable+trusted+brand+simple+setup+best+price+no+new+brands&ids=sony-x90l-65,samsung-q60c-65,sony-x80l-55` |

---

## Deliverables

Submit a **recorded video** and your **code** (repo link, gist, or zip).

The video should cover:

1. **Demo** — show the same product rendering differently for each example query above
2. **Your solution** — what you built, how, and why. Show how you built it: prompts, plans, agent outputs, iterations
3. **Edge cases** — what you handled, what's already covered by the harness, what's out of scope
4. **Productionization** — how would you make this a scalable system?
