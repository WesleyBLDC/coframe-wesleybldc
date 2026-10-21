import { productImage } from '@/lib/products';
import type { TemplateProps } from './types';
import { Empty, Reason, money, stars, topReview } from './shared';

// Recommendation cards in plain language: price, size, reviews; no spec sheet.
export default function Nontechnical({ products, context }: TemplateProps) {
  const picks = products.slice(0, 6);
  return (
    <>
      <h1>Our picks for you</h1>
      <Reason text={context.reason} />
      {picks.length === 0 ? <Empty /> : (
        <div className="picks-grid">
          {picks.map((p, i) => {
            const review = topReview(p);
            return (
              <a key={p.id} href={`/product/${p.id}`} className="product-card pick-card">
                {i === 0 && <span className="tpl-badge">Top pick</span>}
                <div className="card-image"><img src={productImage(p)} alt={p.name} loading="lazy" /></div>
                <span className="brand">{p.brand}</span>
                <span className="product-name">{p.name}</span>
                <span className="price">{money(p.price)}</span>
                <span className="meta">{p.size}" screen</span>
                <span className="rating">{stars(p.rating)} {p.rating} from {p.reviewCount.toLocaleString()} reviews</span>
                {review && <q className="pick-quote">{review.text}</q>}
                <ul className="highlights-list pick-highlights">
                  {p.highlights.slice(0, 2).map((h, j) => <li key={j}>{h}</li>)}
                </ul>
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
