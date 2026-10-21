import type { TemplateProps } from './types';
import { CatalogGrid, Reason } from './shared';

// Today's catalog grid, unchanged; with no q the page renders exactly what it did before.
export default function Fallback({ products, context }: TemplateProps) {
  return (
    <>
      <h1>TVs ({products.length})</h1>
      <Reason text={context.reason} />
      <CatalogGrid products={products} />
    </>
  );
}
