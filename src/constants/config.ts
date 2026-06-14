/** Replace with your shop's WhatsApp number (country code, no + or spaces). Example: 919876543210 */
export const SHOP_WHATSAPP_NUMBER = '918015558131';

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
