/** Replace with your shop's WhatsApp number (country code, no + or spaces). Example: 919876543210 */
export const SHOP_WHATSAPP_NUMBER = '919705074739';

export const SHOP_NAME = 'GT Mart';
export const SHOP_TAGLINE = 'Fresh groceries, delivered locally';
export const DELIVERY_FEE = 30;
export const MIN_ORDER_AMOUNT = 100;
export const CURRENCY = '₹';

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
export const PHONE_COUNTRY_CODE = '91';
export const MIN_PHONE_LENGTH = 10;
