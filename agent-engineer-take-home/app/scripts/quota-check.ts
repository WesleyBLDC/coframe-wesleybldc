// Checks behaviour once the free-model quota is spent. Point LLM_BASE_URL at a server that answers
// every request with OpenRouter's daily-quota 429, then run from app/:
//   LLM_BASE_URL=http://127.0.0.1:<port> OPENAI_API_KEY=test npx tsx scripts/quota-check.ts
// Expected: the first page falls back to keyword rules, the second skips the LLM entirely.
import { analyzeUserContext } from '../src/lib/analyze';

const q = 'buying 5 units for a conference room need reliable trusted brand simple setup best price no new brands';
const base = process.env.LLM_BASE_URL!;
const hits = async () => Number(await (await fetch(`${base}/hits`)).text());

(async () => {
  for (const visit of [1, 2]) {
    const before = await hits();
    const start = Date.now();
    const a = await analyzeUserContext(q, ['sony-x90l-65']);
    console.log(`visit ${visit}: ${Date.now() - start}ms, template ${a.template} (${a.source.template}), filters ${a.source.filters}, LLM requests ${(await hits()) - before}`);
  }
})();
