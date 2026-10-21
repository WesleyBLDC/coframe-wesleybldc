import { getAllProducts, getProductById, type Product } from '@/lib/products';
import { analyzeUserContext } from '@/lib/analyze';
import { TEMPLATES } from '@/templates';
import Fallback from '@/templates/Fallback';
import RestOfCollection from '@/templates/Rest';

function toProducts(ids: string[]): Product[] {
  return ids.map(getProductById).filter((p): p is Product => Boolean(p));
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; ids?: string | string[] }>;
}) {
  const { q, ids } = await searchParams;
  const query = typeof q === 'string' ? q.trim() : '';

  if (!query) {
    return <Fallback products={getAllProducts()} context={{ q: '', reason: '', quantity: 1 }} />;
  }

  const flagged = typeof ids === 'string' ? ids.split(',').map(s => s.trim()).filter(Boolean) : [];
  const analysis = await analyzeUserContext(query, flagged);
  const Template = TEMPLATES[analysis.template];

  return (
    <>
      <Template products={toProducts(analysis.shown)} context={{ q: query, reason: analysis.reason, quantity: analysis.quantity }} />
      {analysis.template !== 'fallback' && <RestOfCollection products={toProducts(analysis.rest)} />}
    </>
  );
}
