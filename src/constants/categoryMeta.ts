import { categoryLabels } from '@/data/products';
import { ProductCategory } from '@/types';

export const SHOP_CATEGORIES: ProductCategory[] = [
  'vegetables',
  'fruits',
  'dairy',
  'snacks',
  'beverages',
  'household',
];

export const CATEGORY_META: Record<
  ProductCategory,
  { emoji: string; tint: string; accent: string; blurb: string }
> = {
  vegetables: {
    emoji: '🥬',
    tint: '#E8F5EE',
    accent: '#1B7A4E',
    blurb: 'Farm fresh',
  },
  fruits: {
    emoji: '🍎',
    tint: '#FFF0E8',
    accent: '#C45C26',
    blurb: 'Seasonal picks',
  },
  dairy: {
    emoji: '🥛',
    tint: '#EEF4FF',
    accent: '#3B6BB5',
    blurb: 'Daily essentials',
  },
  snacks: {
    emoji: '🍪',
    tint: '#FFF8E8',
    accent: '#B8860B',
    blurb: 'Quick bites',
  },
  beverages: {
    emoji: '🍵',
    tint: '#F0FAF8',
    accent: '#1A7A6E',
    blurb: 'Drinks & tea',
  },
  household: {
    emoji: '🧴',
    tint: '#F3F0FF',
    accent: '#6B4FA0',
    blurb: 'Home care',
  },
};

export function getCategoryLabel(category: ProductCategory): string {
  return categoryLabels[category];
}

export function isProductCategory(value: string): value is ProductCategory {
  return SHOP_CATEGORIES.includes(value as ProductCategory);
}

export const ALL_PRODUCTS_META = {
  emoji: '🛒',
  tint: '#E8F5EE',
  accent: '#1B7A4E',
  blurb: 'See everything in store',
  label: 'All products',
};

export type ShopListingId = ProductCategory | 'all';

export function isShopListingId(value: string): value is ShopListingId {
  return value === 'all' || isProductCategory(value);
}
