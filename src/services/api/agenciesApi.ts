import { getSupabase } from '@/lib/supabase';

export interface ShopAgency {
  id: string;
  label: string;
  emoji: string;
  imageUrl: string | null;
  blurb: string;
}

export interface ShopAgencyMeasure {
  id: string;
  label: string;
  price: number;
  maxQuantity: number | null;
}

export interface ShopAgencyItem {
  id: string;
  name: string;
  measures: ShopAgencyMeasure[];
}

interface DbMeasure {
  id: string;
  label: string;
  price: number;
  max_quantity: number | null;
  sort_order: number;
  is_active: boolean;
}

interface DbItem {
  id: string;
  name: string;
  sort_order: number;
  agency_item_measures: DbMeasure[] | null;
}

export async function fetchAgencies(): Promise<{ ready: boolean; agencies: ShopAgency[] }> {
  const supabase = getSupabase();
  if (!supabase) return { ready: false, agencies: [] };

  const { data, error } = await supabase
    .from('categories')
    .select('id, label, emoji, image_url, blurb')
    .eq('is_agency', true)
    .eq('is_active', true)
    .order('label');

  if (error) {
    console.warn('[agenciesApi] list failed:', error.message);
    return { ready: false, agencies: [] };
  }

  return {
    ready: true,
    agencies: (data ?? []).map((row) => ({
      id: String(row.id),
      label: String(row.label),
      emoji: String(row.emoji || '🛒'),
      imageUrl: row.image_url ? String(row.image_url) : null,
      blurb: String(row.blurb || ''),
    })),
  };
}

export async function fetchAgencyCatalog(categoryId: string): Promise<ShopAgencyItem[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('agency_items')
    .select('id, name, sort_order, agency_item_measures(id, label, price, max_quantity, sort_order, is_active)')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('sort_order')
    .order('name');

  if (error) {
    console.warn('[agenciesApi] catalog failed:', error.message);
    return null;
  }

  return ((data ?? []) as DbItem[]).map((item) => ({
    id: item.id,
    name: item.name,
    measures: (item.agency_item_measures ?? [])
      .filter((measure) => measure.is_active)
      .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
      .map((measure) => ({
        id: measure.id,
        label: measure.label,
        price: Number(measure.price) || 0,
        maxQuantity: measure.max_quantity,
      })),
  }));
}

export async function placeAgencyOrder(input: {
  categoryId: string;
  customerName: string;
  customerPhone: string;
  note: string;
  lines: Array<{ measureId: string; quantity: number }>;
}): Promise<{ orderNumber: string; subtotal: number } | { error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: 'Shop is not connected.' };

  const { data, error } = await supabase.rpc('place_agency_order', {
    p_category_id: input.categoryId,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_note: input.note,
    p_lines: input.lines.map((line) => ({
      measure_id: line.measureId,
      quantity: line.quantity,
    })),
  });

  if (error || !data) {
    return { error: error?.message || 'Could not place the agency order.' };
  }

  const result = data as { order_number?: string; subtotal?: number };
  if (!result.order_number) return { error: 'Could not place the agency order.' };
  return { orderNumber: result.order_number, subtotal: Number(result.subtotal) || 0 };
}
