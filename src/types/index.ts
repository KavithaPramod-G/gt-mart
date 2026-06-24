/** Category id from `public.categories`. */
export type ProductCategory = string;

export interface ShopCategory {
  id: string;
  label: string;
  emoji: string;
  tint: string;
  accent: string;
  blurb: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  mrp: number;
  price: number;
  unit: string;
  category: ProductCategory;
  emoji: string;
  imageUrl?: string | null;
  inStock: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered';

export type PaymentMethod = 'cod';

export interface DeliveryAddress {
  name: string;
  phone: string;
  addressLine: string;
  landmark?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  address: DeliveryAddress;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  whatsappNotifications: WhatsAppNotification[];
}

export interface WhatsAppNotification {
  status: OrderStatus;
  sentAt: string;
  message: string;
}

export interface UserProfile {
  id?: string;
  phone: string;
  name: string;
  addressLine?: string;
  landmark?: string;
  whatsappUpdatesEnabled: boolean;
  createdAt: string;
}

export type UserProfileUpdate = Partial<
  Pick<UserProfile, 'name' | 'addressLine' | 'landmark' | 'whatsappUpdatesEnabled'>
>;
