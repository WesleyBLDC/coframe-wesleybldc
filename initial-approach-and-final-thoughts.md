# initial raw thoughts and plan

openrouter key = xx

Thinking about this, we first need to design an endpoint that takes in a q param which is a type string. Which is free text context about this visitor. How we get this is by getting their URL search params, which looks like that /?q. We take this payload as a string, and we need to create a system from a prompt for this to extract and understand what the buyer is looking for, and also to, in simple terms, return a set of IDs which correlate to the product IDs as relevant.

analyze_user_context(q)

system prompt: you are an expert at recommending tv, a customer come in and this is his intent and list of tvs hes looking for or the specs that hes looking for 

review the context and the current inventory and then based on that, return 

user prompt: list of products in the right shape and format

api limitations thinking time limit :3 secs (limit 5s) 

returns list of matching [product ids], template_type 

ai endpoint config:

use local env OPENAI_API_KEY and use the openai ai gateway

use this url [https://openrouter.ai/api/v1](https://openrouter.ai/api/v1)

and use this model: nvidia/nemotron-3.5-lightning

list of templates:

nontechnical: show list of matching tvs:

comparison: layout that compares list of tv side by side with highlights 

bulk: list of matching products with ui design showing discount that matches the quantity looking for in the inventory

fallback: showing all tv normal shopping experience 

claude: 

review the products.json and readme.md and come up with a set of 5 template names (continue where i left off) and an agent prompt to display the products in react as a page.tsx template

the agent prompt to display the products in react, the constraints are that it should expect the chidlren 

review this and create a plan and impleement it, focus on keeping it lightweight, simple and abstracted by creating a set list of templates (5 chosen), and doesnt change the input and do not do heavy refactoring

extension: not all context passed, can do an initial pass thru to check what features are impt to the buyer to pass less context, pass less products 

# Final Product



### 1. My solution

- How it works: it takes the user's query q and runs it through 2 async classifiers. One returns a product filter, the other returns the layout. Code applies the filter to the catalog and renders one of 5 fixed layouts.
- Why: smaller prompts (about 200 tokens instead of 2,400), so it's faster and well under 5s. It also gave better results (3 of 3 README layouts vs 2 of 3), and it's flexible: the catalog can grow without the prompt growing.



### 2. Edge cases

- Named model leads: (e.g. "i want the Sony 65" X90L" puts the X90L first)
- Constraints filter, then relax: (e.g. OLED under $500 matches nothing, so price relaxes but OLED stays)
- Messy IDs resolve: (e.g. LG C3 65 → lg-c3-oled-65; not-a-tv is dropped)
- Off-topic notes fall back: (e.g. "what is the weather in paris" shows the normal catalog)
- Failures use keyword rules: (e.g. a timeout or free-limit 429 still gives the bulk layout for "5 units for a conference room")
- Harness covers: catalog, product API, original pages (e.g. no q renders today's page)
- Out of scope: real bulk pricing, a personalized product detail page, a shared cache



### 3. Productionization

- Smaller models for classifying: use the cheapest model that passes the eval set. Only split into more classifiers if the attribute list gets much bigger.
- Filters into search: use this set of filters to query a search index or database (Elasticsearch, Algolia, Postgres) so it stays fast if the product list is huge. GraphQL can sit on top as the API.
- Customizable templates: add a layout as a component plus one line in a registry, and the classifier picks it up.
- Hedge for latency: if the first model is slow after about 2s, fire a second and take whichever answers first, with the rules as the floor.
- Shared cache: Redis keyed on the query, or precompute it since the upstream agent already knows the visitor.
- Ship safely: evals in CI, log latency and fallback rate, A/B test the layouts on conversion.

