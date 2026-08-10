import { useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { ShopUpiDetails } from '@/components/ShopUpiDetails';
import {
  CURRENCY,
  ORDER_PAYMENT_STATUS_LABELS,
  SHOP_UPI_PAYEE_NAME,
} from '@/constants/config';
import { useOrders } from '@/context/OrderContext';
import { pickPaymentScreenshot, uploadOrderPaymentProof } from '@/services/api/paymentProofApi';
import { isShopUpiConfigured, openGPay, openPhonePe } from '@/services/upi';
import { Order } from '@/types';

interface UpiPaymentSectionProps {
  order: Order;
}

export function UpiPaymentSection({ order }: UpiPaymentSectionProps) {
  const { refreshOrderFromServer } = useOrders();
  const [upiReference, setUpiReference] = useState(order.paymentUpiReference ?? '');
  const [uploading, setUploading] = useState(false);
  const [localProofUri, setLocalProofUri] = useState<string | null>(null);

  const proofUrl = order.paymentProofUrl ?? null;
  const previewUri = localProofUri ?? proofUrl;
  const isVerified = order.paymentStatus === 'verified';
  const upiReady = isShopUpiConfigured();

  const handleUpload = async () => {
    try {
      const uri = await pickPaymentScreenshot();
      if (!uri) return;

      setLocalProofUri(uri);
      setUploading(true);

      await uploadOrderPaymentProof(
        order.id,
        order.address.phone,
        uri,
        upiReference,
      );

      await refreshOrderFromServer(order.id);
      Alert.alert(
        'Payment proof uploaded',
        'We received your screenshot. The shop will verify your payment shortly.',
      );
    } catch (err) {
      setLocalProofUri(null);
      Alert.alert(
        'Upload failed',
        err instanceof Error ? err.message : 'Could not upload payment screenshot.',
      );
    } finally {
      setUploading(false);
    }
  };

  if (order.paymentMethod !== 'upi') {
    return null;
  }

  return (
    <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <Text className="mb-1 text-base font-bold text-foreground">Pay online (UPI)</Text>
      <Text className="mb-3 text-sm leading-5 text-muted">
        Pay {CURRENCY}
        {order.total} using GPay or PhonePe, then upload a screenshot of the successful payment.
      </Text>

      {upiReady ? null : (
        <View className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Text className="text-sm text-amber-900">
            Online UPI ID is not configured in the app yet. Contact the shop for payment details,
            then upload your screenshot below.
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

      {previewUri ? (
        <Pressable
          className="mb-3 overflow-hidden rounded-xl border border-border"
          onPress={() => {}}
        >
          <Image source={{ uri: previewUri }} className="h-48 w-full" resizeMode="cover" />
          <Text className="px-3 py-2 text-xs text-muted">Payment screenshot</Text>
        </Pressable>
      ) : null}

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
          label={proofUrl ? 'Replace payment screenshot' : 'Upload payment screenshot'}
          loading={uploading}
          disabled={uploading}
          onPress={() => void handleUpload()}
        />
      ) : (
        <Text className="text-center text-sm text-primary">
          Payment verified by {SHOP_UPI_PAYEE_NAME}. Thank you!
        </Text>
      )}
    </View>
  );
}
