import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import { SHOP_UPI_ID, SHOP_UPI_PAYEE_NAME } from '@/constants/config';

export interface UpiPaymentParams {
  amount: number;
  orderNumber: string;
}

function buildUpiQuery(params: UpiPaymentParams): string {
  const amount = params.amount.toFixed(2);
  const note = encodeURIComponent(`Order ${params.orderNumber}`);
  const payee = encodeURIComponent(SHOP_UPI_PAYEE_NAME);
  const pa = encodeURIComponent(SHOP_UPI_ID);
  return `pa=${pa}&pn=${payee}&am=${amount}&cu=INR&tn=${note}`;
}

export function isShopUpiConfigured(): boolean {
  return SHOP_UPI_ID.length > 0;
}

export async function openUpiPaymentChooser(params: UpiPaymentParams): Promise<boolean> {
  if (!isShopUpiConfigured()) {
    Alert.alert(
      'UPI not configured',
      'Online payment is not set up yet. Choose cash on delivery or contact the shop.',
    );
    return false;
  }

  const query = buildUpiQuery(params);
  const url = `upi://pay?${query}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(
        'UPI app not found',
        `Pay manually to ${SHOP_UPI_ID} and upload the payment screenshot below.`,
      );
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert(
      'Could not open UPI',
      `Pay ${params.amount} to ${SHOP_UPI_ID} in GPay or PhonePe, then upload the screenshot.`,
    );
    return false;
  }
}

export async function openGPay(params: UpiPaymentParams): Promise<boolean> {
  if (!isShopUpiConfigured()) return openUpiPaymentChooser(params);

  const query = buildUpiQuery(params);
  const urls = [`tez://upi/pay?${query}`, `gpay://upi/pay?${query}`, `upi://pay?${query}`];

  for (const url of urls) {
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // try next scheme
    }
  }

  return openUpiPaymentChooser(params);
}

export async function openPhonePe(params: UpiPaymentParams): Promise<boolean> {
  if (!isShopUpiConfigured()) return openUpiPaymentChooser(params);

  const query = buildUpiQuery(params);
  const urls = [`phonepe://pay?${query}`, `upi://pay?${query}`];

  for (const url of urls) {
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // try next scheme
    }
  }

  return openUpiPaymentChooser(params);
}
