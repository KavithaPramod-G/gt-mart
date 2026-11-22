import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { createRazorpayPaymentLink } from '@/services/api/razorpayApi';
import { Order } from '@/types';

export type RazorpayCheckoutResult = {
  status: 'paid' | 'pending' | 'failed';
  message?: string;
};

const SERVER_ORDER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opened synchronously from the click so the browser does not block it after await. */
export type PaymentPreviewWindow = Window | null;

export function openPaymentPreviewWindow(): PaymentPreviewWindow {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  return window.open('about:blank', '_blank');
}

function openPaymentUrl(url: string, paymentTab?: PaymentPreviewWindow): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  if (paymentTab && !paymentTab.closed) {
    try {
      paymentTab.location.href = url;
      paymentTab.focus();
      return true;
    } catch {
      // The preview tab could not be updated. Fall through to a new window.
    }
  }

  const opened = window.open(url, '_blank');
  if (opened) {
    return true;
  }

  window.location.assign(url);
  return true;
}

export function closePaymentPreviewWindow(paymentTab?: PaymentPreviewWindow) {
  if (paymentTab && !paymentTab.closed) {
    paymentTab.close();
  }
}

export async function startRazorpayCheckout(
  order: Order,
  paymentTab?: PaymentPreviewWindow,
): Promise<RazorpayCheckoutResult> {
  if (order.paymentStatus === 'verified') {
    closePaymentPreviewWindow(paymentTab);
    return { status: 'paid' };
  }

  if (!SERVER_ORDER_ID.test(order.id)) {
    closePaymentPreviewWindow(paymentTab);
    return {
      status: 'failed',
      message: 'This order is not on the shop server yet. Place it again when you are online.',
    };
  }

  const result = await createRazorpayPaymentLink(order.id, order.address.phone);
  if (result.alreadyPaid) {
    closePaymentPreviewWindow(paymentTab);
    return { status: 'paid' };
  }

  if (!result.success || !result.shortUrl) {
    closePaymentPreviewWindow(paymentTab);
    return {
      status: 'failed',
      message: result.message ?? 'Could not start UPI payment. Try again, or choose cash on delivery.',
    };
  }

  if (openPaymentUrl(result.shortUrl, paymentTab)) {
    return { status: 'pending' };
  }

  try {
    await WebBrowser.openBrowserAsync(result.shortUrl);
    return { status: 'pending' };
  } catch {
    closePaymentPreviewWindow(paymentTab);
    return {
      status: 'failed',
      message: 'Could not open the payment page. Try again, or use cash on delivery.',
    };
  }
}
