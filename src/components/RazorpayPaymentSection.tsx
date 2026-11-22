import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ORDER_PAYMENT_STATUS_LABELS } from '@/constants/config';
import { openPaymentPreviewWindow, startRazorpayCheckout } from '@/services/razorpay';
import { Order } from '@/types';

interface RazorpayPaymentSectionProps {
  order: Order;
  onPaid?: () => Promise<void> | void;
}

export function RazorpayPaymentSection({ order, onPaid }: RazorpayPaymentSectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isVerified = order.paymentStatus === 'verified';

  if (order.paymentMethod !== 'razorpay') {
    return null;
  }

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    const paymentTab = openPaymentPreviewWindow();
    try {
      const result = await startRazorpayCheckout(order, paymentTab);
      if (result.status === 'failed') {
        setError(result.message ?? 'Could not open UPI payment.');
        return;
      }
      await onPaid?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open UPI payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <Text className="mb-1 text-base font-bold text-foreground">Pay with UPI</Text>
      <Text className="mb-3 text-sm leading-5 text-muted">
        {isVerified
          ? 'Payment received. Thank you.'
          : 'Pay with GPay, PhonePe, or another UPI app. The shop confirms payment automatically. Do not send a screenshot for this payment.'}
      </Text>

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

      {error ? <Text className="mb-3 text-sm text-error">{error}</Text> : null}

      {isVerified || order.status === 'cancelled' ? null : (
        <Button
          label="Pay now"
          loading={loading}
          disabled={loading}
          onPress={() => void handlePay()}
        />
      )}
    </View>
  );
}
