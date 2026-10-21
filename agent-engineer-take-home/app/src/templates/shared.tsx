import type { Product } from '@/lib/products';

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
