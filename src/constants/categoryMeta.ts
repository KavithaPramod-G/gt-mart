import { categoryLabels } from '@/data/products';
import { ProductCategory } from '@/types';

export const SHOP_CATEGORIES: ProductCategory[] = [
  'fruits-vegetables',
  'dairy-eggs',
  'staples-grains',
  'oils-ghee',
  'snacks-beverages',
  'bakery',
  'instant-foods',
  'dry-fruits-nuts',
  'personal-care',
  'home-care',
  'baby-care',
  'pet-care',
];

export const CATEGORY_META: Record<
  ProductCategory,
  { emoji: string; tint: string; accent: string; blurb: string }
> = {
  'fruits-vegetables': {
    emoji: '🥬',
    tint: '#E8F5EE',
    accent: '#1B7A4E',
    blurb: 'Farm fresh',
  },
  'dairy-eggs': {
    emoji: '🥛',
    tint: '#EEF4FF',
    accent: '#3B6BB5',
    blurb: 'Daily essentials',
  },
  'staples-grains': {
    emoji: '🌾',
    tint: '#FFF8E8',
    accent: '#B8860B',
    blurb: 'Rice, flour & more',
  },
  'oils-ghee': {
    emoji: '🫒',
    tint: '#FFF0E8',
    accent: '#C45C26',
    blurb: 'Cooking oils',
  },
  'snacks-beverages': {
    emoji: '🍿',
    tint: '#F0FAF8',
    accent: '#1A7A6E',
    blurb: 'Snacks & drinks',
  },
  bakery: {
    emoji: '🍞',
    tint: '#FFF8E8',
    accent: '#B8860B',
    blurb: 'Fresh bakes',
  },
  'instant-foods': {
    emoji: '🍜',
    tint: '#EEF4FF',
    accent: '#3B6BB5',
    blurb: 'Quick meals',
  },
  'dry-fruits-nuts': {
    emoji: '🥜',
    tint: '#FFF0E8',
    accent: '#C45C26',
    blurb: 'Nuts & dry fruits',
  },
  'personal-care': {
    emoji: '🧴',
    tint: '#F3F0FF',
    accent: '#6B4FA0',
    blurb: 'Self care',
  },
  'home-care': {
    emoji: '🧽',
    tint: '#E8F5EE',
    accent: '#1B7A4E',
    blurb: 'Clean & fresh',
  },
  'baby-care': {
    emoji: '🍼',
    tint: '#EEF4FF',
    accent: '#3B6BB5',
    blurb: 'For little ones',
  },
  'pet-care': {
    emoji: '🐾',
    tint: '#FFF8E8',
    accent: '#B8860B',
    blurb: 'Pet essentials',
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
