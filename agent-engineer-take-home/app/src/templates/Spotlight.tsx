import { productImage } from '@/lib/products';
import type { TemplateProps } from './types';
import { Empty, Reason, money, stars } from './shared';

// One hero product with full reviews and a buy box, then a few alternatives.
export default function Spotlight({ products, context }: TemplateProps) {
  const [hero, ...rest] = products;
  if (!hero) return <><h1>Recommended for you</h1><Empty /></>;
  const alternatives = rest.slice(0, 3);
  return (
    <>
      <h1>Recommended for you</h1>
      <Reason text={context.reason} />
      <div className="pdp-layout">
        <div className="pdp-main">
          <div className="pdp-image"><img src={productImage(hero)} alt={hero.name} /></div>
          <span className="compare-brand">{hero.brand}</span>
          <h2><a href={`/product/${hero.id}`} className="plain-link">{hero.name}</a></h2>
          <p className="rating-meta">{stars(hero.rating)} {hero.rating} · {hero.reviewCount.toLocaleString()} reviews</p>
          <p className="section-title">Why we picked it</p>
          <ul className="highlights-list">
            {hero.highlights.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
          <p className="section-title">What owners say</p>
          <div className="review-list">
            {hero.reviews.map((r, i) => (
              <div key={i} className="review-card">
                <div className="review-header">
                  <span className="author">{r.author}</span>
                  <span className="review-rating">{'★'.repeat(r.rating)}</span>
                </div>
                <p className="review-text">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="pdp-sidebar">
          <p className="price">{money(hero.price)}</p>
          <p className="delivery-info">
            {hero.inStock ? `Free delivery in ${hero.deliveryDays} day${hero.deliveryDays > 1 ? 's' : ''}` : 'Out of stock'}
          </p>
          <p className="stock-info">
            {hero.quantityAvailable > 20 ? 'In stock' : `Only ${hero.quantityAvailable} left in stock`}
          </p>
          <button className="buy-btn">Add to cart</button>
        </div>
      </div>
      {alternatives.length > 0 && (
        <>
          <p className="section-title">Also worth a look</p>
          <div className="catalog-grid">
            {alternatives.map(p => (
              <a key={p.id} href={`/product/${p.id}`} className="product-card">
                <span className="brand">{p.brand}</span>
                <span className="product-name">{p.name}</span>
                <span className="price">{money(p.price)}</span>
                <span className="rating">★ {p.rating} ({p.reviewCount.toLocaleString()} reviews)</span>
              </a>
            ))}
          </div>
        </>
      )}
    </>
  );
}
