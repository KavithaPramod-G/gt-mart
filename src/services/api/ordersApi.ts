import { DELIVERY_FEE } from '@/constants/config';
import { getSupabase } from '@/lib/supabase';
import { normalizePhone } from '@/services/auth';
import { buildStatusUpdateMessage } from '@/services/whatsapp';
import {
  CartItem,
  DeliveryAddress,
  Order,
  OrderItem,
  OrderStatus,
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
  }>;
  notifications: Array<{
    status: OrderStatus;
    message: string;
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
    })),
    subtotal: Number(payload.subtotal),
    deliveryFee: Number(payload.delivery_fee),
    total: Number(payload.total),
    paymentMethod: 'cod',
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
    })),
  };
}

export async function placeOrderInDb(
  items: CartItem[],
  address: DeliveryAddress,
  profileId?: string,
): Promise<Order | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const subtotal = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
  const deliveryFee = DELIVERY_FEE;
  const total = subtotal + deliveryFee;
  const customerPhone = normalizePhone(address.phone);

  const placeholderOrder: Order = {
    id: 'pending',
    orderNumber: 'pending',
    items: items.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      unit: item.product.unit,
    })),
    subtotal,
    deliveryFee,
    total,
    paymentMethod: 'cod',
    address: { ...address, phone: customerPhone },
    status: 'placed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    whatsappNotifications: [],
  };

  const initialMessage = buildStatusUpdateMessage(placeholderOrder, 'placed');

  const payloadItems = items.map((item) => ({
    product_id: /^[0-9a-f-]{36}$/i.test(item.product.id) ? item.product.id : null,
    product_legacy_id: /^[0-9a-f-]{36}$/i.test(item.product.id) ? null : item.product.id,
    name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
    unit: item.product.unit,
  }));

  const { data: orderId, error } = await supabase.rpc('place_order', {
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
  });

  if (error || !orderId) {
    console.warn('[ordersApi] place_order failed:', error?.message);
    return null;
  }

  return fetchOrderByPhoneAndId(customerPhone, orderId as string);
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
