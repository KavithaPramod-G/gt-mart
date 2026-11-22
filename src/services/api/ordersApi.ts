import { DELIVERY_FEE, isDevCheckoutEnabled } from '@/constants/config';
import { getSupabase } from '@/lib/supabase';
import { normalizePhone } from '@/services/auth';
import { buildStatusUpdateMessage } from '@/services/whatsapp';
import { parsePaymentMethod } from '@/utils/paymentMethod';
import {
  CartItem,
  ComboCartLine,
  DeliveryAddress,
  Order,
  OrderPaymentStatus,
  OrderStatus,
  PaymentMethod,
  WhatsAppNotification,
} from '@/types';

interface DbOrderPayload {
  id: string;
  order_number: string;
  profile_id: string | null;
  customer_name: string;
  customer_phone: string;
  address_line: string;
  landmark: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status?: OrderPaymentStatus;
  payment_note?: string | null;
  payment_proof_url?: string | null;
  payment_upi_reference?: string | null;
  razorpay_payment_link_url?: string | null;
  razorpay_payment_id?: string | null;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  items: Array<{
    product_legacy_id: string | null;
    product_id: string | null;
    name: string;
    price: number;
    quantity: number;
    unit: string;
    details?: string | null;
  }>;
  notifications: Array<{
    status: OrderStatus;
    message: string;
    status_note?: string | null;
    sent_at: string;
  }>;
}

function mapDbOrderPayload(payload: DbOrderPayload): Order {
  return {
    id: payload.id,
    orderNumber: payload.order_number,
    items: payload.items.map((item) => ({
      productId: item.product_legacy_id ?? item.product_id ?? '',
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      unit: item.unit,
      details: item.details ?? null,
    })),
    subtotal: Number(payload.subtotal),
    deliveryFee: Number(payload.delivery_fee),
    total: Number(payload.total),
    paymentMethod: parsePaymentMethod(payload.payment_method),
    paymentStatus: payload.payment_status ?? 'pending',
    paymentNote: payload.payment_note ?? null,
    paymentProofUrl: payload.payment_proof_url ?? null,
    paymentUpiReference: payload.payment_upi_reference ?? null,
    razorpayPaymentLinkUrl: payload.razorpay_payment_link_url ?? null,
    razorpayPaymentId: payload.razorpay_payment_id ?? null,
    address: {
      name: payload.customer_name,
      phone: payload.customer_phone,
      addressLine: payload.address_line,
      landmark: payload.landmark ?? undefined,
    },
    status: payload.status,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
    whatsappNotifications: payload.notifications.map((n) => ({
      status: n.status,
      sentAt: n.sent_at,
      message: n.message,
      statusNote: n.status_note ?? null,
    })),
  };
}

export async function placeOrderInDb(
  items: CartItem[],
  combos: ComboCartLine[],
  address: DeliveryAddress,
  profileId?: string,
  paymentMethod: PaymentMethod = 'cod',
): Promise<Order | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const subtotal =
    items.reduce((total, item) => total + item.product.price * item.quantity, 0) +
    combos.reduce((total, line) => total + line.comboPrice * line.quantity, 0);
  const deliveryFee = DELIVERY_FEE;
  const total = subtotal + deliveryFee;
  const customerPhone = normalizePhone(address.phone);

  const placeholderOrder: Order = {
    id: 'pending',
    orderNumber: 'pending',
    items: [
      ...combos.map((line) => ({
        productId: line.comboId,
        name: line.title,
        price: line.comboPrice,
        quantity: line.quantity,
        unit: 'pack',
        details: line.includedSummary,
      })),
      ...items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        unit: item.product.unit,
      })),
    ],
    subtotal,
    deliveryFee,
    total,
    paymentMethod,
    paymentStatus: 'pending',
    address: { ...address, phone: customerPhone },
    status: 'placed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    whatsappNotifications: [],
  };

  const initialMessage = buildStatusUpdateMessage(placeholderOrder, 'placed');

  const payloadItems = [
    ...combos.map((line) => ({
      combo_id: line.comboId,
      quantity: line.quantity,
    })),
    ...items.map((item) => ({
      product_id: /^[0-9a-f-]{36}$/i.test(item.product.id) ? item.product.id : null,
      product_legacy_id: /^[0-9a-f-]{36}$/i.test(item.product.id) ? null : item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      unit: item.product.unit,
      ...(item.product.offerShelf ? { price_basis: 'mrp' } : {}),
    })),
  ];

  const rpcArgs = {
    p_profile_id: profileId ?? null,
    p_customer_name: address.name.trim(),
    p_customer_phone: customerPhone,
    p_address_line: address.addressLine.trim(),
    p_landmark: address.landmark?.trim() ?? null,
    p_subtotal: subtotal,
    p_delivery_fee: deliveryFee,
    p_total: total,
    p_items: payloadItems,
    p_initial_message: initialMessage,
    p_payment_method: paymentMethod,
  };
  const devMinimum = isDevCheckoutEnabled();
  let { data: orderId, error } = await supabase.rpc('place_order', {
    ...rpcArgs,
    ...(devMinimum ? { p_allow_dev_minimum: true } : {}),
  });

  // Migration 038 adds this argument. Until it is applied, the shared
  // database still has the previous place_order, which has no minimum check.
  if (
    devMinimum &&
    error &&
    /p_allow_dev_minimum|schema cache|could not find the function/i.test(error.message ?? '')
  ) {
    const retry = await supabase.rpc('place_order', rpcArgs);
    orderId = retry.data;
    error = retry.error;
  }

  if (error || !orderId) {
    const detail = error?.message ?? '';
    console.warn('[ordersApi] place_order failed:', detail);
    if (paymentMethod === 'razorpay') {
      throw new Error(describePlaceOrderError(detail));
    }
    return null;
  }

  const placed = await fetchOrderByPhoneAndId(customerPhone, orderId as string);
  if (!placed && paymentMethod === 'razorpay') {
    throw new Error(
      'The order was saved but could not be loaded. Open Orders and tap Pay now.',
    );
  }
  return placed;
}

function describePlaceOrderError(detail: string): string {
  const lower = detail.toLowerCase();
  if (lower.includes('minimum order')) {
    return detail;
  }
  if (lower.includes('payment method')) {
    return 'UPI payment is not set up on the server yet. Run supabase/migrations/037_razorpay_payments.sql in the Supabase SQL editor, or choose cash on delivery.';
  }
  if (
    lower.includes('p_allow_dev_minimum') ||
    lower.includes('schema cache') ||
    lower.includes('could not find the function')
  ) {
    return 'Dev checkout is not enabled on the server yet. Run supabase/migrations/038_dev_min_order.sql in the Supabase SQL editor, then try again.';
  }
  return detail || 'Could not place the order for UPI payment. Please try again.';
}

export async function fetchOrdersBySession(sessionId: string): Promise<Order[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('get_customer_orders', {
    p_session_id: sessionId,
  });

  if (error) {
    console.warn('[ordersApi] fetch orders failed:', error.message);
    return [];
  }

  if (!data) {
    return [];
  }

  const rows = data as DbOrderPayload[];
  return rows.map((row) => mapDbOrderPayload(row));
}

export async function fetchOrderByPhoneAndId(
  phone: string,
  orderId: string,
): Promise<Order | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('get_customer_order', {
    p_phone: normalizePhone(phone),
    p_order_id: orderId,
  });

  if (error || !data) {
    console.warn('[ordersApi] fetch order failed:', error?.message);
    return null;
  }

  return mapDbOrderPayload(data as DbOrderPayload);
}
