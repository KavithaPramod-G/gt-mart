import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import { CURRENCY, SHOP_NAME, SHOP_WHATSAPP_NUMBER } from '@/constants/config';
import { DeliveryAddress, Order, OrderItem, OrderStatus } from '@/types';

function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${sanitizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

export async function openWhatsApp(phone: string, message: string): Promise<boolean> {
  const url = buildWhatsAppUrl(phone, message);

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert(
      'WhatsApp unavailable',
      'Could not open WhatsApp. Please install WhatsApp or check the phone number.',
    );
    return false;
  }
}

function formatItems(items: OrderItem[]): string {
  return items
    .map(
      (item) =>
        `• ${item.name} x${item.quantity} (${item.unit}) - ${CURRENCY}${item.price * item.quantity}`,
    )
    .join('\n');
}

function formatAddress(address: DeliveryAddress): string {
  const landmark = address.landmark ? `\nLandmark: ${address.landmark}` : '';
  return `${address.name}\n${address.phone}\n${address.addressLine}${landmark}`;
}

export function buildOrderPlacedMessage(order: Order): string {
  return [
    `🛒 *New Order - ${SHOP_NAME}*`,
    ``,
    `*Order No:* ${order.orderNumber}`,
    `*Payment:* Cash on Delivery`,
    ``,
    `*Items:*`,
    formatItems(order.items),
    ``,
    `*Subtotal:* ${CURRENCY}${order.subtotal}`,
    `*Delivery:* ${CURRENCY}${order.deliveryFee}`,
    `*Total:* ${CURRENCY}${order.total}`,
    ``,
    `*Delivery Address:*`,
    formatAddress(order.address),
  ].join('\n');
}

export function buildStatusUpdateMessage(order: Order, status: OrderStatus): string {
  const statusMessages: Record<OrderStatus, string> = {
    placed: `Your order *${order.orderNumber}* has been placed at ${SHOP_NAME}. We will confirm shortly.`,
    confirmed: `Order *${order.orderNumber}* is confirmed! We are getting your items ready.`,
    preparing: `Order *${order.orderNumber}* is being packed at ${SHOP_NAME}.`,
    out_for_delivery: `Order *${order.orderNumber}* is out for delivery. Please keep cash ready (${CURRENCY}${order.total}).`,
    delivered: `Order *${order.orderNumber}* has been delivered. Thank you for shopping at ${SHOP_NAME}! 🎉`,
  };

  return statusMessages[status];
}

export async function notifyShopNewOrder(order: Order): Promise<boolean> {
  return openWhatsApp(SHOP_WHATSAPP_NUMBER, buildOrderPlacedMessage(order));
}

export async function notifyCustomerStatusUpdate(
  order: Order,
  status: OrderStatus,
): Promise<boolean> {
  const message = buildStatusUpdateMessage(order, status);
  return openWhatsApp(order.address.phone, message);
}

export async function notifyShopStatusUpdate(
  order: Order,
  status: OrderStatus,
): Promise<boolean> {
  const message = [
    `📦 *Order Update - ${SHOP_NAME}*`,
    ``,
    `*Order No:* ${order.orderNumber}`,
    `*Status:* ${status.replace(/_/g, ' ')}`,
    `*Customer:* ${order.address.name} (${order.address.phone})`,
  ].join('\n');

  return openWhatsApp(SHOP_WHATSAPP_NUMBER, message);
}

export async function requestAccountDeletion(): Promise<boolean> {
  const message = `Hi ${SHOP_NAME}, I would like to request deletion of my GT Mart app account and associated personal data. My registered mobile number is: `;
  return openWhatsApp(SHOP_WHATSAPP_NUMBER, message);
}
