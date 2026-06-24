/** Static UI for the "All products" listing — not stored in categories table. */
export const ALL_PRODUCTS_META = {
  emoji: '🛒',
  tint: '#E8F5EE',
  accent: '#1B7A4E',
  blurb: 'See everything in store',
  label: 'All products',
};

/** Fallback when a product references a category id not yet loaded. */
export const DEFAULT_CATEGORY_UI = {
  emoji: '🛒',
  tint: '#F7F9F8',
  accent: '#1B7A4E',
  blurb: '',
};

export type ShopListingId = string | 'all';

export function isShopListingId(value: string, knownCategoryIds?: Set<string>): value is ShopListingId {
  if (value === 'all') return true;
  if (knownCategoryIds) return knownCategoryIds.has(value);
  return value.length > 0;
}
