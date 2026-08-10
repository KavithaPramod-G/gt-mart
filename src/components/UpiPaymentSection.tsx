import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { ShopUpiDetails } from '@/components/ShopUpiDetails';
import {
  ORDER_PAYMENT_STATUS_LABELS,
  SHOP_UPI_PAYEE_NAME,
} from '@/constants/config';
import { notifyShopUpiPayment } from '@/services/whatsapp';
import { isShopUpiConfigured, openGPay, openPhonePe } from '@/services/upi';
import { Order } from '@/types';

interface UpiPaymentSectionProps {
  order: Order;
}

export function UpiPaymentSection({ order }: UpiPaymentSectionProps) {
  const [upiReference, setUpiReference] = useState(order.paymentUpiReference ?? '');

  const isVerified = order.paymentStatus === 'verified';
  const upiReady = isShopUpiConfigured();

  if (order.paymentMethod !== 'upi') {
    return null;
  }

  return (
    <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <Text className="mb-1 text-base font-bold text-foreground">Pay online (UPI)</Text>
      <Text className="mb-3 text-sm leading-5 text-muted">
        1. Tap GPay or PhonePe and complete payment{'\n'}
        2. Share payment details on WhatsApp — attach a screenshot there if you can
      </Text>

      {upiReady ? null : (
        <View className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Text className="text-sm text-amber-900">
            Online UPI ID is not configured in the app yet. Contact the shop on WhatsApp for
            payment details.
          </Text>
        </View>
      )}

      <View className="mb-3 flex-row gap-2">
        <View className="flex-1">
          <Button
            label="GPay"
            variant="secondary"
            disabled={!upiReady || isVerified}
            onPress={() =>
              void openGPay({ amount: order.total, orderNumber: order.orderNumber })
            }
          />
          {upiReady ? (
            <ShopUpiDetails amount={order.total} className="mt-2" />
          ) : null}
        </View>
        <View className="flex-1">
          <Button
            label="PhonePe"
            variant="secondary"
            disabled={!upiReady || isVerified}
            onPress={() =>
              void openPhonePe({ amount: order.total, orderNumber: order.orderNumber })
            }
          />
        </View>
      </View>

      <TextInput
        placeholder="UPI transaction ID (optional)"
        value={upiReference}
        onChangeText={setUpiReference}
        editable={!isVerified}
        className="mb-3 min-h-[48px] rounded-xl border border-border bg-background px-4 py-3 text-[15px] text-foreground"
      />

      <View className="mb-3 flex-row items-center justify-between rounded-xl bg-background px-3 py-2">
        <Text className="text-sm text-muted">Payment status</Text>
        <Text
          className={`text-sm font-semibold ${
            isVerified ? 'text-primary' : 'text-amber-700'
          }`}
        >
          {ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus ?? 'pending']}
        </Text>
      </View>

      {!isVerified ? (
        <Button
          label="Share payment on WhatsApp"
          variant="whatsapp"
          onPress={() => void notifyShopUpiPayment(order, upiReference)}
        />
      ) : (
        <Text className="text-center text-sm text-primary">
          Payment verified by {SHOP_UPI_PAYEE_NAME}. Thank you!
        </Text>
      )}
    </View>
  );
}
