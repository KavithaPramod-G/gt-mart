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

interface DbOrder {
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
}

interface DbOrderItem {
  product_legacy_id: string | null;
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

interface DbNotification {
  status: OrderStatus;
  message: string;
  sent_at: string;
}

async function fetchOrderDetails(orderId: string): Promise<Order | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) return null;

  const { data: items } = await supabase
    .from('order_items')
    .select('product_legacy_id, product_id, name, price, quantity, unit')
    .eq('order_id', orderId);

  const { data: notifications } = await supabase
    .from('order_notifications')
    .select('status, message, sent_at')
    .eq('order_id', orderId)
    .order('sent_at');

  return mapDbOrderToAppOrder(
    order as DbOrder,
    (items as DbOrderItem[]) ?? [],
    (notifications as DbNotification[]) ?? [],
  );
}

function mapDbOrderToAppOrder(
  order: DbOrder,
  items: DbOrderItem[],
  notifications: DbNotification[],
): Order {
  return {
    id: order.id,
    orderNumber: order.order_number,
    items: items.map((item) => ({
      productId: item.product_legacy_id ?? item.product_id ?? '',
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      unit: item.unit,
    })),
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.total),
    paymentMethod: 'cod',
    address: {
      name: order.customer_name,
      phone: order.customer_phone,
      addressLine: order.address_line,
      landmark: order.landmark ?? undefined,
    },
    status: order.status,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    whatsappNotifications: notifications.map((n) => ({
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

  return fetchOrderDetails(orderId as string);
}

export async function fetchOrdersByPhone(phone: string): Promise<Order[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const normalized = normalizePhone(phone);
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_phone', normalized)
    .order('created_at', { ascending: false });

  if (error || !orders) {
    console.warn('[ordersApi] fetch orders failed:', error?.message);
    return null;
  }

  const result: Order[] = [];

  for (const order of orders as DbOrder[]) {
    const { data: items } = await supabase
      .from('order_items')
      .select('product_legacy_id, product_id, name, price, quantity, unit')
      .eq('order_id', order.id);

    const { data: notifications } = await supabase
      .from('order_notifications')
      .select('status, message, sent_at')
      .eq('order_id', order.id)
      .order('sent_at');

    result.push(
      mapDbOrderToAppOrder(
        order,
        (items as DbOrderItem[]) ?? [],
        (notifications as DbNotification[]) ?? [],
      ),
    );
  }

  return result;
}

export async function updateOrderStatusInDb(
  orderId: string,
  status: OrderStatus,
  message: string,
): Promise<Order | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { error } = await supabase.rpc('update_order_status', {
    p_order_id: orderId,
    p_status: status,
    p_message: message,
  });

  if (error) {
    console.warn('[ordersApi] update status failed:', error?.message);
    return null;
  }

  return fetchOrderDetails(orderId);
}
