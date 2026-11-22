import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import {
  CURRENCY,
  ORDER_PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  SHOP_NAME,
  SHOP_WHATSAPP_NUMBER,
} from '@/constants/config';
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

export async function openPhoneCall(phone: string): Promise<boolean> {
  const digits = sanitizePhone(phone);
  if (!digits) {
    Alert.alert('Invalid number', 'This support number is not configured correctly.');
    return false;
  }

  try {
    await Linking.openURL(`tel:+${digits}`);
    return true;
  } catch {
    Alert.alert('Call unavailable', 'Could not open the phone dialer on this device.');
    return false;
  }
}

function formatItems(items: OrderItem[]): string {
  return items
    .map(
      (item) =>
        `• ${item.name} x${item.quantity} (${item.unit}) - ${CURRENCY}${item.price * item.quantity}${
          item.details ? `\n  ${item.details}` : ''
        }`,
    )
    .join('\n');
}

function formatAddress(address: DeliveryAddress): string {
  const landmark = address.landmark ? `\nLandmark: ${address.landmark}` : '';
  return `${address.name}\n${address.phone}\n${address.addressLine}${landmark}`;
}

export function buildUpiPaymentProofMessage(
  order: Order,
  upiReference?: string,
): string {
  const txnId = upiReference?.trim();
  const lines = [
    `✅ *UPI Payment - ${SHOP_NAME}*`,
    ``,
    `*Order No:* ${order.orderNumber}`,
    `*Amount paid:* ${CURRENCY}${order.total}`,
    `*Customer:* ${order.address.name}`,
    `*Phone:* ${order.address.phone}`,
  ];

  if (txnId) {
    lines.push(`*UPI transaction ID:* ${txnId}`);
  } else {
    lines.push(`*UPI transaction ID:* (add here if you have it)`);
  }

  lines.push(
    ``,
    `I have completed the UPI payment for this order. Please verify and confirm.`,
    ``,
    `Please attach a payment screenshot in this chat if possible.`,
  );

  return lines.join('\n');
}

export async function notifyShopUpiPayment(
  order: Order,
  upiReference?: string,
): Promise<boolean> {
  return openWhatsApp(
    SHOP_WHATSAPP_NUMBER,
    buildUpiPaymentProofMessage(order, upiReference),
  );
}

function paymentShareLine(order: Order): string {
  const shown = ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus ?? 'pending'];
  return `${PAYMENT_METHOD_LABELS[order.paymentMethod]} — ${shown}`;
}

/** Order details for the shop. Payment wording matches the status on screen. */
export function buildOrderShareMessage(order: Order): string {
  return [
    `🛒 *Order - ${SHOP_NAME}*`,
    ``,
    `*Order No:* ${order.orderNumber}`,
    `*Payment:* ${paymentShareLine(order)}`,
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

export function buildOrderPlacedMessage(order: Order): string {
  return buildOrderShareMessage(order);
}

export async function shareOrderOnWhatsApp(order: Order): Promise<boolean> {
  return openWhatsApp(SHOP_WHATSAPP_NUMBER, buildOrderShareMessage(order));
}

export function promptToShareOrder(order: Order): void {
  Alert.alert(
    'Share this order on WhatsApp?',
    'Send the order number, items, total, address, and payment status to the shop.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Share', onPress: () => void shareOrderOnWhatsApp(order) },
    ],
  );
}

export function buildStatusUpdateMessage(order: Order, status: OrderStatus): string {
  const statusMessages: Record<OrderStatus, string> = {
    placed: `Your order *${order.orderNumber}* has been placed at ${SHOP_NAME}. We will confirm shortly.`,
    confirmed: `Order *${order.orderNumber}* is confirmed! We are getting your items ready.`,
    preparing: `Order *${order.orderNumber}* is being packed at ${SHOP_NAME}.`,
    out_for_delivery:
      order.paymentMethod === 'cod' && order.paymentStatus !== 'verified'
        ? `Order *${order.orderNumber}* is out for delivery. Please keep cash ready (${CURRENCY}${order.total}).`
        : `Order *${order.orderNumber}* is out for delivery.`,
    delivered: `Order *${order.orderNumber}* has been delivered. Thank you for shopping at ${SHOP_NAME}! 🎉`,
    cancelled: `Order *${order.orderNumber}* was cancelled. Contact ${SHOP_NAME} if you have questions.`,
  };

  return statusMessages[status];
}

export async function notifyShopNewOrder(order: Order): Promise<boolean> {
  return shareOrderOnWhatsApp(order);
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
  const message = `Hi ${SHOP_NAME}, I would like to request deletion of my ${SHOP_NAME} app account and associated personal data. My registered mobile number is: `;
  return openWhatsApp(SHOP_WHATSAPP_NUMBER, message);
}
