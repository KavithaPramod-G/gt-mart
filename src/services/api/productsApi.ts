import { getSupabase } from '@/lib/supabase';
import { Product, ProductCategory } from '@/types';

interface DbProduct {
  id: string;
  item_id: string | null;
  item_name: string;
  description: string;
  mrp: number;
  price: number;
  unit: string;
  category_id: string;
  emoji: string;
  image_url: string | null;
  in_stock: boolean;
}

function mapProduct(row: DbProduct): Product {
  return {
    id: row.item_id ?? row.id,
    name: row.item_name,
    description: row.description,
    mrp: Number(row.mrp ?? row.price),
    price: Number(row.price),
    unit: row.unit,
    category: row.category_id as ProductCategory,
    emoji: row.emoji,
    imageUrl: row.image_url,
    inStock: row.in_stock,
  };
}

export async function fetchProductsFromDb(): Promise<Product[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('products')
    .select('id, item_id, item_name, description, mrp, price, unit, category_id, emoji, image_url, in_stock')
    .eq('in_stock', true)
    .order('item_name');

  if (error || !data) {
    console.warn('[productsApi] fetch failed:', error?.message);
    return null;
  }

  return data.map((row) => mapProduct(row as DbProduct));
}

export function getDbProductId(productId: string): string | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  if (/^[0-9a-f-]{36}$/i.test(productId)) {
    return productId;
  }

  return null;
}
