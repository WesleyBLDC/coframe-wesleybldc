import { productImage, type Product } from '@/lib/products';

export function stars(rating: number): string {
  return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
}

export function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export function topReview(p: Product) {
  return [...p.reviews].sort((a, b) => b.rating - a.rating)[0];
}

export function Reason({ text }: { text: string }) {
  return text ? <p className="tpl-reason">{text[0].toUpperCase() + text.slice(1)}</p> : null;
}

export function Empty() {
  return (
    <p className="tpl-reason">
      Nothing in stock matches that yet. <a href="/">Browse all TVs</a>
    </p>
  );
}

// The original catalog card grid, shared by the fallback page and "Rest of the TV collection".
export function CatalogGrid({ products }: { products: Product[] }) {
  return (
    <div className="catalog-grid">
      {products.map(p => (
        <a key={p.id} href={`/product/${p.id}`} className="product-card">
          <div className="card-image"><img src={productImage(p)} alt={p.name} loading="lazy" /></div>
          <span className="brand">{p.brand}</span>
          <span className="product-name">{p.name}</span>
          <span className="price">${p.price.toLocaleString()}</span>
          <span className="meta">{p.size}" · {p.displayType} · {p.refreshRate}Hz</span>
          <span className="rating">★ {p.rating} ({p.reviewCount.toLocaleString()} reviews)</span>
        </a>
      ))}
    </div>
  );
}
