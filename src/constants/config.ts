/** Replace with your shop's WhatsApp number (country code, no + or spaces). Example: 919876543210 */
export const SHOP_WHATSAPP_NUMBER = '919100912399';

export interface ShopSupportContact {
  /** Short label, e.g. "Orders", "Store desk". */
  label: string;
  /** Phone with country code, no + or spaces. Example: 919100912399 */
  phone: string;
}

/** Tap-to-call / WhatsApp contacts shown on the shop home screen. */
export const SHOP_SUPPORT_CONTACTS: ShopSupportContact[] = [
  { label: 'Shop orders', phone: SHOP_WHATSAPP_NUMBER },
  { label: 'Store desk', phone: '919290860984' },
];

export const APP_NAME = 'RR Basket';
export const SHOP_NAME = 'RR Basket';
export const SHOP_LOCATION = 'GT Mart · Kavali';
export const SHOP_TAGLINE = 'Fresh groceries, delivered locally';
export const DELIVERY_FEE = 0;
export const MIN_ORDER_AMOUNT = 500;
export const CURRENCY = '₹';

/** Public legal pages (set in .env / eas.json after admin is deployed). */
export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ?? '';
export const DELETE_ACCOUNT_URL =
  process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL?.trim() ?? '';

export const ORDER_STATUS_LABELS: Record<
  import('@/types').OrderStatus,
  string
> = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ORDER_PAYMENT_STATUS_LABELS: Record<
  import('@/types').OrderPaymentStatus,
  string
> = {
  pending: 'Payment pending',
  verified: 'Payment received',
};

/** Short labels for order list cards. */
export const ORDER_PAYMENT_SHORT_LABELS: Record<
  import('@/types').OrderPaymentStatus,
  string
> = {
  pending: 'Unpaid',
  verified: 'Paid',
};

export const PAYMENT_METHOD_LABELS: Record<import('@/types').PaymentMethod, string> = {
  cod: 'Cash on delivery',
  upi: 'Pay online (GPay / PhonePe)',
};

/** Shop UPI ID for online payments (set EXPO_PUBLIC_SHOP_UPI_ID in eas.json). */
export const SHOP_UPI_ID = process.env.EXPO_PUBLIC_SHOP_UPI_ID?.trim() ?? '';
export const SHOP_UPI_PAYEE_NAME = process.env.EXPO_PUBLIC_SHOP_UPI_PAYEE_NAME?.trim() || SHOP_NAME;

/** Local fallback OTP when Supabase is not configured */
export const DEV_MOCK_OTP = '123456';
export const MIN_PASSWORD_LENGTH = 6;
export const PHONE_COUNTRY_CODE = '91';
export const MIN_PHONE_LENGTH = 10;
