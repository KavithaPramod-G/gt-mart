import { getSupabase } from '@/lib/supabase';
import { ComboCartLine, ComboOffer, ComboOfferItem } from '@/types';

interface DbComboProduct {
  id: string;
  item_id: string | null;
  item_name: string;
  price: number;
  unit: string;
  emoji: string;
  image_url: string | null;
  in_stock: boolean;
}

interface DbComboItem {
  quantity: number;
  sort_order: number;
  products: DbComboProduct | DbComboProduct[] | null;
}

interface DbCombo {
  id: string;
  title: string;
  subtitle: string | null;
  event_tag: string | null;
  emoji: string;
  combo_price: number;
  sort_order: number;
  combo_offer_items: DbComboItem[] | null;
}

function oneProduct(value: DbComboItem['products']): DbComboProduct | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapCombo(row: DbCombo): ComboOffer | null {
  const rawItems = [...(row.combo_offer_items ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const items: ComboOfferItem[] = [];

  for (const raw of rawItems) {
    const product = oneProduct(raw.products);
    if (!product) continue;
    items.push({
      productId: product.id,
      itemId: product.item_id,
      name: product.item_name,
      unit: product.unit,
      salePrice: Number(product.price),
      quantity: raw.quantity,
      inStock: product.in_stock,
      emoji: product.emoji,
      imageUrl: product.image_url,
    });
  }

  if (items.length === 0) return null;

  const regularTotal = items.reduce((total, item) => total + item.salePrice * item.quantity, 0);
  const comboPrice = Number(row.combo_price);
  const saveAmount = Math.max(0, regularTotal - comboPrice);
  const savePercent =
    regularTotal > 0 ? Math.round((saveAmount / regularTotal) * 100) : 0;
  const available =
    items.length === rawItems.length && items.every((item) => item.inStock);

  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    eventTag: row.event_tag,
    emoji: row.emoji || '🎁',
    comboPrice,
    regularTotal,
    saveAmount,
    savePercent,
    items,
    available,
  };
}

export function comboCartSnapshot(combo: ComboOffer): Omit<ComboCartLine, 'quantity'> {
  return {
    comboId: combo.id,
    title: combo.title,
    eventTag: combo.eventTag,
    emoji: combo.emoji,
    comboPrice: combo.comboPrice,
    regularTotal: combo.regularTotal,
    includedSummary: combo.items
      .map((item) => `${item.name} × ${item.quantity}`)
      .join(', '),
  };
}

const COMBO_SELECT = `
  id, title, subtitle, event_tag, emoji, combo_price, sort_order,
  combo_offer_items (
    quantity, sort_order,
    products (id, item_id, item_name, price, unit, emoji, image_url, in_stock)
  )
`;

export async function fetchActiveCombos(): Promise<ComboOffer[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('combo_offers')
    .select(COMBO_SELECT)
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    console.warn('[combosApi] fetch combos failed:', error.message);
    return [];
  }

  return ((data ?? []) as DbCombo[])
    .map(mapCombo)
    .filter((combo): combo is ComboOffer => combo !== null);
}

export async function fetchComboById(id: string): Promise<ComboOffer | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('combo_offers')
    .select(COMBO_SELECT)
    .eq('id', id)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) {
    console.warn('[combosApi] fetch combo failed:', error?.message);
    return null;
  }

  return mapCombo(data as DbCombo);
}
