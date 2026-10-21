// Minimal OpenRouter (OpenAI compatible) JSON call, aware of the free-model quota.

const BASE_URL = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';
// Tried in order by OpenRouter's `models` fallback, which covers errors and 429s, not slow replies.
// Measured 2026-10-20 on the storefront prompts: both answered in about 1s; other free models were
// rate limited, reasoning-only, or took 5 to 21s.
const MODELS = (process.env.LLM_MODELS || 'nvidia/nemotron-3.5-lightning:free,nvidia/nemotron-3.5-super-vl:free')
  .split(',').map(m => m.trim()).filter(Boolean);

export class LlmUnavailable extends Error {}

// Set when OpenRouter says the free-model quota is spent, so later requests go straight to the
// keyword rules instead of waiting on calls that will fail.
let pausedUntil = 0;

function nextUtcMidnight(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

function pauseOnQuota(status: number, body: string) {
  if (status !== 429) return;
  if (/per-day/i.test(body)) {
    const reset = Number(body.match(/X-RateLimit-Reset"?\s*:\s*"?(\d+)/)?.[1]);
    // The reset header is epoch milliseconds; anything unusable means "until tomorrow UTC".
    pausedUntil = reset > Date.now() ? reset : nextUtcMidnight();
  } else if (/per-min/i.test(body)) {
    pausedUntil = Date.now() + 60_000;
  } else {
    return; // A provider's own temporary limit only affects this request.
  }
  console.warn(`[llm] free-model quota hit; keyword rules until ${new Date(pausedUntil).toISOString()}`);
}

export async function completeJson(
  system: string,
  user: string,
  { maxTokens, signal }: { maxTokens: number; signal: AbortSignal },
): Promise<Record<string, unknown>> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new LlmUnavailable('OPENAI_API_KEY not set');
  if (Date.now() < pausedUntil) throw new LlmUnavailable('free-model quota paused');

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      models: MODELS,
      provider: { sort: 'latency' },
      reasoning: { enabled: false },
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal,
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text();
    pauseOnQuota(res.status, body);
    throw new LlmUnavailable(`HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  const parsed = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new LlmUnavailable('reply was not a JSON object');
  return parsed;
}
