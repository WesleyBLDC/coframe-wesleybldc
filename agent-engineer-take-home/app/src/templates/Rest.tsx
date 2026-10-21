import type { Product } from '@/lib/products';
import { CatalogGrid } from './shared';

// Everything the template above did not show, closest matches first, in the default catalog grid.
export default function RestOfCollection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="rest-section">
      <h2 className="rest-title">Rest of the TV collection ({products.length})</h2>
      <CatalogGrid products={products} />
    </section>
  );
}
