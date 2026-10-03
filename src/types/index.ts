/** Category id from `public.categories`. */
export type ProductCategory = string;

export interface ShopCategory {
  id: string;
  label: string;
  emoji: string;
  imageUrl?: string | null;
  tint: string;
  accent: string;
  blurb: string;
  sortOrder: number;
  parentGroupId?: string | null;
}

export interface CategoryParentGroup {
  id: string;
  label: string;
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
  /** Ordered gallery for swipe; falls back to imageUrl when empty. */
  imageUrls?: string[];
  inStock: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

/** One festival pack in the cart. Price is the combo price, not the sum of catalog prices. */
export interface ComboCartLine {
  comboId: string;
  title: string;
  eventTag: string | null;
  emoji: string;
  comboPrice: number;
  regularTotal: number;
  quantity: number;
  includedSummary: string;
}

export interface ComboOfferItem {
  productId: string;
  itemId: string | null;
  name: string;
  unit: string;
  salePrice: number;
  quantity: number;
  inStock: boolean;
  emoji: string;
  imageUrl: string | null;
}

export interface ComboOffer {
  id: string;
  title: string;
  subtitle: string | null;
  eventTag: string | null;
  emoji: string;
  comboPrice: number;
  regularTotal: number;
  saveAmount: number;
  savePercent: number;
  items: ComboOfferItem[];
  /** False when an included product is missing or out of stock. */
  available: boolean;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'upi';

export type OrderPaymentStatus = 'pending' | 'verified';

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
  /** Included products when this line is a combo pack. */
  details?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: OrderPaymentStatus;
  paymentNote?: string | null;
  paymentProofUrl?: string | null;
  paymentUpiReference?: string | null;
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
  statusNote?: string | null;
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
