import type { TemplateProps } from './types';
import { Reason } from './shared';

// Today's catalog grid, unchanged; with no q the page renders exactly what it did before.
export default function Fallback({ products, context }: TemplateProps) {
  return (
    <>
      <h1>TVs ({products.length})</h1>
      <Reason text={context.reason} />
      <div className="catalog-grid">
        {products.map(p => (
          <a key={p.id} href={`/product/${p.id}`} className="product-card">
            <div className="card-image" />
            <span className="brand">{p.brand}</span>
            <span className="product-name">{p.name}</span>
            <span className="price">${p.price.toLocaleString()}</span>
            <span className="meta">{p.size}" · {p.displayType} · {p.refreshRate}Hz</span>
            <span className="rating">★ {p.rating} ({p.reviewCount.toLocaleString()} reviews)</span>
          </a>
        ))}
      </div>
    </>
  );
}
