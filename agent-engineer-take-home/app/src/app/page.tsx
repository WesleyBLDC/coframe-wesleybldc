import { getAllProducts, getProductById, type Product } from '@/lib/products';
import { analyzeUserContext } from '@/lib/analyze';
import { TEMPLATES } from '@/templates';
import Fallback from '@/templates/Fallback';

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; ids?: string | string[] }>;
}) {
  const { q, ids } = await searchParams;
  const query = typeof q === 'string' ? q.trim() : '';
  const products = getAllProducts();

  if (!query) {
    return <Fallback products={products} context={{ q: '', reason: '', quantity: 1 }} />;
  }

  const flagged = typeof ids === 'string' ? ids.split(',').map(s => s.trim()).filter(Boolean) : [];
  const analysis = await analyzeUserContext(query, flagged);
  const matched = analysis.ids.map(getProductById).filter((p): p is Product => Boolean(p));
  // Fallback keeps the whole catalog, with any matches first.
  const shown = analysis.template === 'fallback'
    ? [...matched, ...products.filter(p => !analysis.ids.includes(p.id))]
    : matched;
  const Template = TEMPLATES[analysis.template];

  return <Template products={shown} context={{ q: query, reason: analysis.reason, quantity: analysis.quantity }} />;
}
