import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

import { SHOP_UPI_ID, SHOP_UPI_PAYEE_NAME } from '@/constants/config';

export interface UpiPaymentParams {
  amount: number;
  orderNumber: string;
}

/** Raw query string for UPI pay intents (pa, pn, am, cu, tn). */
function buildUpiQueryString(params: UpiPaymentParams): string {
  const search = new URLSearchParams({
    pa: SHOP_UPI_ID,
    pn: SHOP_UPI_PAYEE_NAME,
    am: params.amount.toFixed(2),
    cu: 'INR',
    tn: `Order ${params.orderNumber}`,
  });
  return search.toString();
}

export function isShopUpiConfigured(): boolean {
  return SHOP_UPI_ID.length > 0;
}

async function tryOpenPaymentUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

function buildAndroidIntentUrl(query: string, packageName?: string): string {
  const packageSuffix = packageName ? `;package=${packageName}` : '';
  return `intent://pay?${query}#Intent;scheme=upi${packageSuffix};end`;
}

function manualPayMessage(amount: number): string {
  return `Could not open a UPI app automatically. Pay ₹${amount} to ${SHOP_UPI_ID} (${SHOP_UPI_PAYEE_NAME}) in GPay or PhonePe, then upload the payment screenshot in this app.`;
}

export async function openUpiPaymentChooser(params: UpiPaymentParams): Promise<boolean> {
  if (!isShopUpiConfigured()) {
    Alert.alert(
      'UPI not configured',
      'Online payment is not set up yet. Choose cash on delivery or contact the shop.',
    );
    return false;
  }

  const query = buildUpiQueryString(params);
  const urls =
    Platform.OS === 'android'
      ? [
          buildAndroidIntentUrl(query),
          `upi://pay?${query}`,
        ]
      : [`upi://pay?${query}`];

  for (const url of urls) {
    if (await tryOpenPaymentUrl(url)) {
      return true;
    }
  }

  Alert.alert('Open UPI app manually', manualPayMessage(params.amount));
  return false;
}

export async function openGPay(params: UpiPaymentParams): Promise<boolean> {
  if (!isShopUpiConfigured()) {
    return openUpiPaymentChooser(params);
  }

  const query = buildUpiQueryString(params);
  const urls =
    Platform.OS === 'android'
      ? [
          buildAndroidIntentUrl(query, 'com.google.android.apps.nbu.paisa.user'),
          `tez://upi/pay?${query}`,
          `gpay://upi/pay?${query}`,
          buildAndroidIntentUrl(query),
          `upi://pay?${query}`,
        ]
      : [`tez://upi/pay?${query}`, `gpay://upi/pay?${query}`, `upi://pay?${query}`];

  for (const url of urls) {
    if (await tryOpenPaymentUrl(url)) {
      return true;
    }
  }

  Alert.alert('Could not open GPay', manualPayMessage(params.amount));
  return false;
}

export async function openPhonePe(params: UpiPaymentParams): Promise<boolean> {
  if (!isShopUpiConfigured()) {
    return openUpiPaymentChooser(params);
  }

  const query = buildUpiQueryString(params);
  const urls =
    Platform.OS === 'android'
      ? [
          buildAndroidIntentUrl(query, 'com.phonepe.app'),
          `phonepe://pay?${query}`,
          buildAndroidIntentUrl(query),
          `upi://pay?${query}`,
        ]
      : [`phonepe://pay?${query}`, `upi://pay?${query}`];

  for (const url of urls) {
    if (await tryOpenPaymentUrl(url)) {
      return true;
    }
  }

  Alert.alert('Could not open PhonePe', manualPayMessage(params.amount));
  return false;
}
