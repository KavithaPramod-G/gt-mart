import { Product } from '@/types';

/** Empty — products load from Supabase when configured. */
export const products: Product[] = [];

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}
