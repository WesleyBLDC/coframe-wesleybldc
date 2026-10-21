// Checks the visitor pipeline. Run from app/:
//   npx tsx scripts/eval.ts        deterministic checks only (no LLM, no free requests)
//   npx tsx scripts/eval.ts --llm  also runs the README queries through the classifiers
// .env.local never overrides a variable the shell already exports; if your shell exports an
// OpenAI OPENAI_API_KEY, run it as `env -u OPENAI_API_KEY npx tsx scripts/eval.ts --llm`.
import { getAllProducts } from '../src/lib/products';
import { matchIds, select, type Filters } from '../src/lib/match';
import { filtersByRules, templateByRules } from '../src/lib/rules';

try {
  process.loadEnvFile('.env.local');
} catch {
  // No env file: the --llm cases fall back to rules and report it.
}

const products = getAllProducts();
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n      expected ${JSON.stringify(expected)}\n      actual   ${JSON.stringify(actual)}`}`);
}

const ids = (list: { id: string }[]) => list.map(p => p.id);

// Flagged ID matching
check('exact id', ids(matchIds(['lg-c3-oled-65'], products)), ['lg-c3-oled-65']);
check('spaced name', ids(matchIds(['LG C3 65'], products)), ['lg-c3-oled-65']);
check('underscored id', ids(matchIds(['sony_a95l_65'], products)), ['sony-a95l-65']);
check('model with inch mark', ids(matchIds(['Samsung S90C 55"'], products)), ['samsung-s90c-55']);
check('unknown id dropped', ids(matchIds(['not-a-tv'], products)), []);

// Keyword rules (the fallback when a classifier fails)
const README = [
  'i want the best biggest tv i can get for a reasonable price good reviews dont need specs',
  'looking for oled or qd-oled only need detailed specs refresh rate hdr want to compare side by side',
  'buying 5 units for a conference room need reliable trusted brand simple setup best price no new brands',
];
check('rules: example 1 template', templateByRules(README[0], 0).template, 'nontechnical');
check('rules: example 1 sort', filtersByRules(README[0]).sort, 'size_desc');
check('rules: example 2 template', templateByRules(README[1], 3).template, 'comparison');
check('rules: example 2 panels', filtersByRules(README[1]).panels, ['QD-OLED', 'OLED']);
check('rules: example 3 template', templateByRules(README[2], 3), { template: 'bulk', quantity: 5, reason: '' });
check('rules: example 3 brands', filtersByRules(README[2]).brands, ['Samsung', 'LG', 'Sony']);
check('rules: nonsense is fallback', templateByRules('asdf qwerty banana', 0).template, 'fallback');
check('rules: one flagged is spotlight', templateByRules('tell me more about this tv', 1).template, 'spotlight');
check('rules: size and budget', filtersByRules('cheap 55 inch tv under $600'), { minSize: 55, maxSize: 55, maxPrice: 600, sort: 'price_asc' });

// Selection: shown and rest partition the catalog, rest is ranked by closeness
const office: Filters = { brands: ['Samsung', 'LG', 'Sony'], sort: 'price_asc', minStock: 5 };
const s = select(products, office, matchIds(['sony-x90l-65'], products), 6, false);
check('flagged leads', s.shown[0].id, 'sony-x90l-65');
check('shown + rest = catalog, no repeats', new Set([...ids(s.shown), ...ids(s.rest)]).size, products.length);
check('shown respects brands', s.shown.every(p => ['Samsung', 'LG', 'Sony'].includes(p.brand)), true);
check('rest starts with full matches', ['Samsung', 'LG', 'Sony'].includes(s.rest[0].brand), true);
const impossible = select(products, { brands: ['Vizio'], panels: ['OLED'] }, [], 6, false);
check('impossible filter still shows TVs', impossible.shown.length, 6);
const tight = select(products, { panels: ['OLED'], maxPrice: 500 }, [], 4, false);
check('over-tight price is relaxed, panel kept', tight.shown.every(p => /OLED/.test(p.displayType)), true);

async function llmCases() {
  const { analyzeUserContext } = await import('../src/lib/analyze');
  const cases: [string, string[], string][] = [
    [README[0], [], 'nontechnical'],
    [README[1], ['lg-c3-oled-65', 'samsung-s90c-65', 'sony-a95l-65'], 'comparison'],
    [README[2], ['sony-x90l-65', 'samsung-q60c-65', 'sony-x80l-55'], 'bulk'],
    ['asdf qwerty banana', [], 'fallback'],
  ];
  for (const [q, flagged, expected] of cases) {
    const start = Date.now();
    const a = await analyzeUserContext(q, flagged);
    console.log(`      ${((Date.now() - start) / 1000).toFixed(2)}s template=${a.source.template} filters=${a.source.filters} ${JSON.stringify(a.filters)} shown=${a.shown.slice(0, 4).join(',')}`);
    check(`llm: ${q.slice(0, 40)}`, a.template, expected);
  }
}

(process.argv.includes('--llm') ? llmCases() : Promise.resolve()).then(() => {
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
});
