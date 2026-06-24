import { getSupabase } from '@/lib/supabase';
import { ShopCategory } from '@/types';

interface DbCategory {
  id: string;
  label: string;
  emoji: string;
  image_url: string | null;
  tint: string;
  accent: string;
  blurb: string;
  sort_order: number;
  is_active: boolean;
}

function mapCategory(row: DbCategory): ShopCategory {
  return {
    id: row.id,
    label: row.label,
    emoji: row.emoji,
    imageUrl: row.image_url,
    tint: row.tint,
    accent: row.accent,
    blurb: row.blurb,
    sortOrder: row.sort_order,
  };
}

export async function fetchCategoriesFromDb(): Promise<ShopCategory[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('categories')
    .select('id, label, emoji, image_url, tint, accent, blurb, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order')
    .order('label');

  if (error || !data) {
    console.warn('[categoriesApi] fetch failed:', error?.message);
    return null;
  }

  return (data as DbCategory[]).map(mapCategory);
}
