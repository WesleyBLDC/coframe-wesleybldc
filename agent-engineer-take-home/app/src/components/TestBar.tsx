'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// The README's example visitors, for quick manual testing.
const EXAMPLES = [
  {
    label: 'Non-technical buyer',
    q: 'i want the best biggest tv i can get for a reasonable price good reviews dont need specs',
    ids: '',
  },
  {
    label: 'Technical enthusiast comparing OLEDs',
    q: 'looking for oled or qd-oled only need detailed specs refresh rate hdr want to compare side by side',
    ids: 'lg-c3-oled-65,samsung-s90c-65,sony-a95l-65',
  },
  {
    label: 'Office procurement, buying in bulk',
    q: 'buying 5 units for a conference room need reliable trusted brand simple setup best price no new brands',
    ids: 'sony-x90l-65,samsung-q60c-65,sony-x80l-55',
  },
];

function href(q: string, ids: string): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (q.trim() && ids) params.set('ids', ids);
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export default function TestBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [ids, setIds] = useState(searchParams.get('ids') ?? '');
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Keep the bar in step with the URL (back/forward, links).
  useEffect(() => {
    setQ(searchParams.get('q') ?? '');
    setIds(searchParams.get('ids') ?? '');
  }, [searchParams]);

  function go(nextQ: string, nextIds: string) {
    const target = href(nextQ, nextIds);
    const current = `${pathname}${searchParams.toString() ? `?${searchParams}` : ''}`;
    // The transition stays pending until the server render (and its LLM call) finishes.
    startTransition(() => {
      if (target === current) router.refresh();
      else router.push(target);
    });
  }

  function pick(example: (typeof EXAMPLES)[number]) {
    setOpen(false);
    setQ(example.q);
    setIds(example.ids);
    go(example.q, example.ids);
  }

  const idCount = ids ? ids.split(',').filter(Boolean).length : 0;

  return (
    <div className="testbar">
      <form
        className="testbar-inner"
        onSubmit={e => {
          e.preventDefault();
          go(q, ids);
        }}
      >
        <div
          className="testbar-examples"
          onBlur={e => {
            if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
          }}
        >
          <button type="button" className="testbar-examples-btn" onClick={() => setOpen(o => !o)} aria-expanded={open}>
            Examples ▾
          </button>
          {open && (
            <ul className="testbar-menu" role="menu">
              {EXAMPLES.map(ex => (
                <li key={ex.label}>
                  <button type="button" role="menuitem" onClick={() => pick(ex)}>{ex.label}</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="testbar-search">
          <span className="testbar-prefix" aria-hidden>https://coframe-tv/?q=</span>
          <input
            name="q"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="cheap 55 inch tv for my parents"
            aria-label="Visitor context (q)"
          />
          {idCount > 0 && (
            <span className="testbar-chip" title={ids}>
              {idCount} flagged ID{idCount > 1 ? 's' : ''}
              <button type="button" aria-label="Clear flagged IDs" onClick={() => setIds('')}>×</button>
            </span>
          )}
        </div>

        <button type="submit" className="testbar-go" disabled={isPending}>Go</button>

        <span className={`testbar-status${isPending ? ' is-pending' : ''}`} aria-live="polite">
          {isPending && (
            <>
              <span className="testbar-spinner" aria-hidden />
              Thinking…
            </>
          )}
        </span>
      </form>
    </div>
  );
}
