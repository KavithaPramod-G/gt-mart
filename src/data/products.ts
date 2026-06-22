import { Product } from '@/types';

/** Empty — products load from Supabase when configured. */
export const products: Product[] = [];

export const categoryLabels: Record<Product['category'], string> = {
  'general-items': 'General Items',
  'fruits-vegetables': 'Fruits & Vegetables',
  'dairy-eggs': 'Dairy & Eggs',
  'staples-grains': 'Staples & Grains',
  'oils-ghee': 'Oils & Ghee',
  'snacks-beverages': 'Snacks & Beverages',
  chocolates: 'Chocolates',
  'ice-creams': 'Ice Creams',
  bakery: 'Bakery',
  'instant-foods': 'Instant Foods',
  'dry-fruits-nuts': 'Dry Fruits & Nuts',
  'personal-care': 'Personal Care',
  'home-care': 'Home Care',
  'baby-care': 'Baby Care',
  'pet-care': 'Pet Care',
};

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}
