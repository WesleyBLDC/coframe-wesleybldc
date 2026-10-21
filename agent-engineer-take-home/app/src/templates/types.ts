import type { Product } from '@/lib/products';

export interface TemplateContext {
  q: string;
  reason: string;
  quantity: number;
}

// Every template is a pure server component: products arrive filtered and ranked, never refetched or re-sorted.
export interface TemplateProps {
  products: Product[];
  context: TemplateContext;
}
