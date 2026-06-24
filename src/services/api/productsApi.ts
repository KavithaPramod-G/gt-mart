import { getSupabase } from '@/lib/supabase';
import { Product, ProductCategory } from '@/types';

export const PRODUCTS_PAGE_SIZE = 20;

const PRODUCT_COLUMNS =
  'id, item_id, item_name, description, mrp, price, unit, category_id, emoji, image_url, in_stock';

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

export interface FetchProductsPageParams {
  page: number;
  pageSize?: number;
  /** Omit or null for all categories */
  categoryId?: string | null;
  search?: string;
}

export interface FetchProductsPageResult {
  products: Product[];
  hasMore: boolean;
  totalCount: number;
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

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

export async function fetchProductsPage(
  params: FetchProductsPageParams,
): Promise<FetchProductsPageResult | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const pageSize = params.pageSize ?? PRODUCTS_PAGE_SIZE;
  const page = Math.max(0, params.page);
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const search = params.search?.trim();

  let query = supabase
    .from('products')
    .select(PRODUCT_COLUMNS, { count: 'exact' })
    .eq('in_stock', true)
    .order('item_name');

  if (params.categoryId) {
    query = query.eq('category_id', params.categoryId);
  }

  if (search) {
    query = query.ilike('item_name', `%${escapeIlikePattern(search)}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error || !data) {
    console.warn('[productsApi] fetch page failed:', error?.message);
    return null;
  }

  const totalCount = count ?? data.length;
  const products = (data as DbProduct[]).map(mapProduct);

  return {
    products,
    totalCount,
    hasMore: from + products.length < totalCount,
  };
}

/** Lightweight counts for category badges (design preview / future use). */
export async function fetchInStockCountByCategory(): Promise<Record<string, number> | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const pageSize = 1000;
  const counts: Record<string, number> = {};
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('products')
      .select('category_id')
      .eq('in_stock', true)
      .range(from, to);

    if (error || !data) {
      console.warn('[productsApi] category counts failed:', error?.message);
      return null;
    }

    for (const row of data) {
      const id = row.category_id as string;
      counts[id] = (counts[id] ?? 0) + 1;
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return counts;
}

export function getDbProductId(productId: string): string | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  if (/^[0-9a-f-]{36}$/i.test(productId)) {
    return productId;
  }

  return null;
}
