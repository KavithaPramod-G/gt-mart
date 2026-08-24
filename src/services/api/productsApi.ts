import { getSupabase } from '@/lib/supabase';
import { Product, ProductCategory } from '@/types';

export const PRODUCTS_PAGE_SIZE = 20;

const PRODUCT_COLUMNS =
  'id, item_id, item_name, description, mrp, price, unit, category_id, emoji, image_url, image_urls, in_stock';

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
  image_urls?: string[] | null;
  in_stock: boolean;
}

function normalizeImageUrls(row: DbProduct): string[] {
  const fromGallery = Array.isArray(row.image_urls)
    ? row.image_urls.map((url) => String(url ?? '').trim()).filter(Boolean)
    : [];
  if (fromGallery.length > 0) return fromGallery;

  const primary = row.image_url?.trim();
  return primary ? [primary] : [];
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
  const imageUrls = normalizeImageUrls(row);
  return {
    id: row.item_id ?? row.id,
    name: row.item_name,
    description: row.description,
    mrp: Number(row.mrp ?? row.price),
    price: Number(row.price),
    unit: row.unit,
    category: row.category_id as ProductCategory,
    emoji: row.emoji,
    imageUrl: imageUrls[0] ?? row.image_url,
    imageUrls,
    inStock: row.in_stock,
  };
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

const LEGACY_PRODUCT_COLUMNS =
  'id, item_id, item_name, description, mrp, price, unit, category_id, emoji, image_url, in_stock';

function isMissingImageUrlsColumn(message?: string): boolean {
  return String(message ?? '')
    .toLowerCase()
    .includes('image_urls');
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

  const runQuery = async (columns: string) => {
    let query = supabase
      .from('products')
      .select(columns, { count: 'exact' })
      .eq('in_stock', true)
      .order('item_name');

    if (params.categoryId) {
      query = query.eq('category_id', params.categoryId);
    }

    if (search) {
      query = query.ilike('item_name', `%${escapeIlikePattern(search)}%`);
    }

    return query.range(from, to);
  };

  let result = await runQuery(PRODUCT_COLUMNS);
  if (result.error && isMissingImageUrlsColumn(result.error.message)) {
    console.warn(
      '[productsApi] image_urls missing — run product-gallery-upgrade.sql. Using image_url fallback.',
    );
    result = await runQuery(LEGACY_PRODUCT_COLUMNS);
  }

  const { data, error, count } = result;

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

/** In-stock products with MRP above selling price — for home discount sections. */
export async function fetchDiscountDealProducts(): Promise<Product[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  let result = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('in_stock', true)
    .order('item_name')
    .limit(500);

  if (result.error && isMissingImageUrlsColumn(result.error.message)) {
    console.warn(
      '[productsApi] image_urls missing — run product-gallery-upgrade.sql. Using image_url fallback.',
    );
    result = await supabase
      .from('products')
      .select(LEGACY_PRODUCT_COLUMNS)
      .eq('in_stock', true)
      .order('item_name')
      .limit(500);
  }

  const { data, error } = result;

  if (error || !data) {
    console.warn('[productsApi] fetch discount deals failed:', error?.message);
    return null;
  }

  return (data as DbProduct[])
    .map(mapProduct)
    .filter((product) => product.mrp > product.price);
}
