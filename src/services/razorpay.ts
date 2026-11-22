import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { createRazorpayPaymentLink } from '@/services/api/razorpayApi';
import { Order } from '@/types';

export type RazorpayCheckoutResult = {
  status: 'pending' | 'failed';
  message?: string;
  /** This window left for Razorpay. The callback page opens the order. */
  handedOff?: boolean;
};

/** Opened synchronously from the click so the browser does not block it after await. */
export type PaymentPreviewWindow = Window | null;

const SERVER_ORDER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function openPaymentPreviewWindow(): PaymentPreviewWindow {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  return window.open('about:blank', '_blank');
}

type WebOpen =
  | { kind: 'tab'; tab: Window }
  | { kind: 'same-window' }
  | { kind: 'unavailable' };

function openPaymentUrl(url: string, paymentTab?: PaymentPreviewWindow): WebOpen {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { kind: 'unavailable' };
  }

  if (paymentTab && !paymentTab.closed) {
    try {
      paymentTab.location.href = url;
      paymentTab.focus();
      return { kind: 'tab', tab: paymentTab };
    } catch {
      // The preview tab could not be updated. Fall through to a new window.
    }
  }

  const opened = window.open(url, '_blank');
  if (opened) {
    return { kind: 'tab', tab: opened };
  }

  window.location.assign(url);
  return { kind: 'same-window' };
}

export function closePaymentPreviewWindow(paymentTab?: PaymentPreviewWindow) {
  if (paymentTab && !paymentTab.closed) {
    paymentTab.close();
  }
}

/**
 * App return URL. openAuthSessionAsync closes when the browser navigates here.
 * Razorpay's callback is an https redirect that lands on this URL.
 */
export function nativeOrderReturnUrl(orderId: string): string {
  return `gtmart://order/${orderId}`;
}

function paymentReturnUrl(orderId: string, paymentTab?: PaymentPreviewWindow): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // A preview tab is closed when Razorpay returns, and this window asks to share.
    // Same-window checkout needs the callback itself to open the share prompt.
    const share = paymentTab && !paymentTab.closed ? '' : '?share=1';
    return `${window.location.origin}/order/${orderId}${share}`;
  }
  return nativeOrderReturnUrl(orderId);
}

function waitForPaymentTab(tab: Window, orderId: string): Promise<'returned' | 'closed'> {
  return new Promise((resolve) => {
    const timer = window.setInterval(() => {
      if (tab.closed) {
        window.clearInterval(timer);
        resolve('closed');
        return;
      }

      try {
        const path = tab.location.pathname.replace(/\/+$/, '');
        if (path === `/order/${orderId}`) {
          window.clearInterval(timer);
          try {
            tab.close();
          } catch {
            // This window still returns to the order screen.
          }
          resolve('returned');
        }
      } catch {
        // Razorpay is a different origin until it redirects back.
      }
    }, 400);
  });
}

/** Reload the order a few times so a slightly late webhook can show as received. */
export async function refreshPaymentAfterReturn(
  orderId: string,
  refresh: (orderId: string) => Promise<Order | undefined>,
): Promise<Order | undefined> {
  let latest = await refresh(orderId);
  if (!latest || latest.paymentMethod !== 'razorpay' || latest.paymentStatus === 'verified') {
    return latest;
  }

  for (const waitMs of [1500, 2000, 2000]) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    latest = await refresh(orderId);
    if (!latest || latest.paymentStatus === 'verified') {
      return latest;
    }
  }

  return latest;
}

export async function startRazorpayCheckout(
  order: Order,
  paymentTab?: PaymentPreviewWindow,
): Promise<RazorpayCheckoutResult> {
  if (order.paymentStatus === 'verified') {
    closePaymentPreviewWindow(paymentTab);
    return { status: 'pending' };
  }

  if (!SERVER_ORDER_ID.test(order.id)) {
    closePaymentPreviewWindow(paymentTab);
    return {
      status: 'failed',
      message: 'This order is not on the shop server yet. Place it again when you are online.',
    };
  }

  const result = await createRazorpayPaymentLink(
    order.id,
    order.address.phone,
    paymentReturnUrl(order.id, paymentTab),
  );
  if (result.alreadyPaid) {
    closePaymentPreviewWindow(paymentTab);
    return { status: 'pending' };
  }

  if (!result.success || !result.shortUrl) {
    closePaymentPreviewWindow(paymentTab);
    return {
      status: 'failed',
      message: result.message ?? 'Could not start UPI payment. Try again, or choose cash on delivery.',
    };
  }

  // Web must open the tab during the click. The link URL arrives after the order
  // is saved, so the blank window from openPaymentPreviewWindow is reused.
  // Native waits in openAuthSessionAsync until Razorpay redirects or the browser closes.
  if (Platform.OS === 'web') {
    const opened = openPaymentUrl(result.shortUrl, paymentTab);
    if (opened.kind === 'same-window') {
      return { status: 'pending', handedOff: true };
    }
    if (opened.kind === 'tab') {
      await waitForPaymentTab(opened.tab, order.id);
      return { status: 'pending' };
    }
  }

  try {
    await WebBrowser.openAuthSessionAsync(result.shortUrl, nativeOrderReturnUrl(order.id));
    return { status: 'pending' };
  } catch {
    closePaymentPreviewWindow(paymentTab);
    return {
      status: 'failed',
      message: 'Could not open the payment page. Try again, or use cash on delivery.',
    };
  }
}
