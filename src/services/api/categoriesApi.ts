import { getSupabase } from '@/lib/supabase';
import { CategoryParentGroup, ShopCategory } from '@/types';

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
  parent_group_id: string | null;
}

interface DbCategoryParentGroup {
  id: string;
  label: string;
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
    parentGroupId: row.parent_group_id,
  };
}

function mapParentGroup(row: DbCategoryParentGroup): CategoryParentGroup {
  return {
    id: row.id,
    label: row.label,
    sortOrder: row.sort_order,
  };
}

export async function fetchCategoriesFromDb(): Promise<ShopCategory[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('categories')
    .select(
      'id, label, emoji, image_url, tint, accent, blurb, sort_order, is_active, parent_group_id',
    )
    .eq('is_active', true)
    .order('sort_order')
    .order('label');

  if (error || !data) {
    console.warn('[categoriesApi] fetch failed:', error?.message);
    return null;
  }

  return (data as DbCategory[]).map(mapCategory);
}

export async function fetchCategoryParentGroupsFromDb(): Promise<CategoryParentGroup[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('category_parent_groups')
    .select('id, label, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order')
    .order('label');

  if (error || !data) {
    console.warn('[categoriesApi] parent groups fetch failed:', error?.message);
    return null;
  }

  return (data as DbCategoryParentGroup[]).map(mapParentGroup);
}
