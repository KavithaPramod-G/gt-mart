import { getSupabase } from '@/lib/supabase';
import { Product, ProductCategory } from '@/types';

interface DbProduct {
  id: string;
  legacy_id: string | null;
  name: string;
  description: string;
  price: number;
  unit: string;
  category_id: string;
  emoji: string;
  in_stock: boolean;
}

function mapProduct(row: DbProduct): Product {
  return {
    id: row.legacy_id ?? row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    unit: row.unit,
    category: row.category_id as ProductCategory,
    emoji: row.emoji,
    inStock: row.in_stock,
  };
}

export async function fetchProductsFromDb(): Promise<Product[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('products')
    .select('id, legacy_id, name, description, price, unit, category_id, emoji, in_stock')
    .eq('in_stock', true)
    .order('name');

  if (error || !data) {
    console.warn('[productsApi] fetch failed:', error?.message);
    return null;
  }

  return data.map((row) => mapProduct(row as DbProduct));
}

export function getDbProductId(productId: string): string | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  // If productId is already a UUID, use it; otherwise it's legacy_id
  if (/^[0-9a-f-]{36}$/i.test(productId)) {
    return productId;
  }

  return null;
}
