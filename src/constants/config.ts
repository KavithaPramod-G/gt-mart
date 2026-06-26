/** Replace with your shop's WhatsApp number (country code, no + or spaces). Example: 919876543210 */
export const SHOP_WHATSAPP_NUMBER = '919100912399';

export const SHOP_NAME = 'GT Mart';
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
};

/** Local fallback OTP when Supabase is not configured */
export const DEV_MOCK_OTP = '123456';
export const MIN_PASSWORD_LENGTH = 6;
export const PHONE_COUNTRY_CODE = '91';
export const MIN_PHONE_LENGTH = 10;
