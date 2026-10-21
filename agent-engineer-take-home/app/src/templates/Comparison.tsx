import type { Product } from '@/lib/products';
import type { TemplateProps } from './types';
import { Empty, Reason, money } from './shared';

interface Row {
  label: string;
  value: (p: Product) => string;
  // When set, the best column in this row is marked; 'low' means smaller wins.
  score?: (p: Product) => number;
  better?: 'high' | 'low';
}

const ROWS: Row[] = [
  { label: 'Price', value: p => money(p.price), score: p => p.price, better: 'low' },
  { label: 'Screen size', value: p => `${p.size}"`, score: p => p.size, better: 'high' },
  { label: 'Display type', value: p => p.displayType },
  { label: 'Resolution', value: p => p.resolution },
  { label: 'Refresh rate', value: p => `${p.refreshRate}Hz`, score: p => p.refreshRate, better: 'high' },
  { label: 'HDR formats', value: p => p.hdr.join(', '), score: p => p.hdr.length, better: 'high' },
  { label: 'Smart platform', value: p => p.smartPlatform },
  { label: 'HDMI ports', value: p => `${p.ports.hdmi}x`, score: p => p.ports.hdmi, better: 'high' },
  { label: 'USB ports', value: p => `${p.ports.usb}x`, score: p => p.ports.usb, better: 'high' },
  { label: 'Rating', value: p => `${p.rating} (${p.reviewCount.toLocaleString()})`, score: p => p.rating, better: 'high' },
  { label: 'In stock', value: p => (p.inStock ? `${p.quantityAvailable} units` : 'Out of stock') },
];

function bestIds(row: Row, products: Product[]): Set<string> {
  if (!row.score || products.length < 2) return new Set();
  const scores = products.map(row.score);
  const target = row.better === 'low' ? Math.min(...scores) : Math.max(...scores);
  // No winner to mark when every column ties.
  if (scores.every(s => s === target)) return new Set();
  return new Set(products.filter((_, i) => scores[i] === target).map(p => p.id));
}

// Side by side spec sheet, one column per TV, best value per row highlighted.
export default function Comparison({ products, context }: TemplateProps) {
  const cols = products.slice(0, 4);
  return (
    <>
      <h1>Compare {cols.length} TVs</h1>
      <Reason text={context.reason} />
      {cols.length === 0 ? <Empty /> : (
        <div className="compare-scroll">
          <table className="specs-table compare-table">
            <thead>
              <tr>
                <td />
                {cols.map(p => (
                  <th key={p.id}>
                    <a href={`/product/${p.id}`}>
                      <span className="compare-brand">{p.brand}</span>
                      {p.name}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(row => {
                const best = bestIds(row, cols);
                return (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    {cols.map(p => (
                      <td key={p.id} className={best.has(p.id) ? 'compare-best' : undefined}>{row.value(p)}</td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <td>Highlights</td>
                {cols.map(p => (
                  <td key={p.id}>
                    <ul className="highlights-list compare-highlights">
                      {p.highlights.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
