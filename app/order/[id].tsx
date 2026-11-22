import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';
import { OrderStatusHistory } from '@/components/OrderStatusHistory';
import { RazorpayPaymentSection } from '@/components/RazorpayPaymentSection';
import { UpiPaymentSection } from '@/components/UpiPaymentSection';
import { CURRENCY, ORDER_PAYMENT_STATUS_LABELS, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/constants/config';
import { isSupabaseConfigured } from '@/lib/env';
import { useOrders } from '@/context/OrderContext';
import { refreshPaymentAfterReturn } from '@/services/razorpay';
import { promptToShareOrder, shareOrderOnWhatsApp } from '@/services/whatsapp';

const promptedShareOrders = new Set<string>();

function claimSharePrompt(orderId: string): boolean {
  if (promptedShareOrders.has(orderId)) return false;

  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      const key = `gtmart-order-share:${orderId}`;
      if (localStorage.getItem(key) === '1') {
        promptedShareOrders.add(orderId);
        return false;
      }
      localStorage.setItem(key, '1');
    } catch {
      // Storage can be blocked. The in-memory set still covers this tab.
    }
  }

  promptedShareOrders.add(orderId);
  return true;
}

export default function OrderDetailScreen() {
  const { id, share } = useLocalSearchParams<{ id: string; share?: string }>();
  const shareParam = Array.isArray(share) ? share[0] : share;
  const { getOrder, advanceOrderStatus, sendWhatsAppUpdate, refreshOrderFromServer, isLoaded } =
    useOrders();
  const order = id ? getOrder(id) : undefined;
  const refreshOrderFromServerRef = useRef(refreshOrderFromServer);
  refreshOrderFromServerRef.current = refreshOrderFromServer;
  const shareStartedFor = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        void refreshOrderFromServerRef.current(id);
      }
    }, [id]),
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });
  }, []);

  useEffect(() => {
    if (!id || shareStartedFor.current === id || shareParam !== '1' || !order) return;
    if (!claimSharePrompt(id)) {
      shareStartedFor.current = id;
      return;
    }
    shareStartedFor.current = id;
    router.setParams({ share: '' });
    const initial = order;
    void (async () => {
      const latest = await refreshPaymentAfterReturn(id, (orderId) =>
        refreshOrderFromServerRef.current(orderId),
      );
      const shown = latest ?? initial;
      await new Promise((resolve) => setTimeout(resolve, 300));
      promptToShareOrder(shown);
    })();
  }, [shareParam, id, order]);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-8">
        <Text className="text-base text-muted">Loading order…</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-8">
        <Text className="text-base text-muted">Order not found.</Text>
        <Button label="Back to Orders" onPress={() => router.replace('/orders')} />
      </View>
    );
  }

  const canAdvance = order.status !== 'delivered';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <View className="mb-4 items-center rounded-2xl border border-border bg-surface p-6">
        <Ionicons name="receipt-outline" size={48} color="#1B7A4E" />
        <Text className="mt-2 text-lg font-bold text-foreground">{order.orderNumber}</Text>
        <Text className="mt-2 text-center leading-5 text-muted">
          {order.paymentMethod === 'razorpay' && order.paymentStatus !== 'verified'
            ? 'Pay with GPay, PhonePe, or another UPI app below if you still need to. This screen shows Payment pending until the payment is received.'
            : order.paymentMethod === 'upi' && order.paymentStatus !== 'verified'
            ? 'Pay with GPay or PhonePe below. Share a payment screenshot with the button on this screen if you want.'
            : 'Track delivery updates, payment status, and full order history below.'}
        </Text>
      </View>

      <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <Text className="mb-2 text-base font-bold text-foreground">Current status</Text>
        <Text className="mb-4 text-[15px] font-semibold text-primary">
          {ORDER_STATUS_LABELS[order.status]}
        </Text>
        <OrderStatusTimeline
          currentStatus={order.status}
          statusUpdates={order.whatsappNotifications}
        />
      </View>

      <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <Text className="mb-3 text-base font-bold text-foreground">Order history</Text>
        <Text className="mb-4 text-sm leading-5 text-muted">
          Each step with time. Cancel reason is shown when applicable.
        </Text>
        <OrderStatusHistory updates={order.whatsappNotifications} />
      </View>

      <UpiPaymentSection order={order} />
      <RazorpayPaymentSection
        order={order}
        onReturned={() => refreshPaymentAfterReturn(order.id, refreshOrderFromServer)}
      />

      <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <Text className="mb-2 text-base font-bold text-foreground">Items</Text>
        {order.items.map((item) => (
          <View key={`${item.productId}-${item.name}`} className="mb-2 flex-row justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-muted">
                {item.name} x{item.quantity}
              </Text>
              {item.details ? (
                <Text className="mt-0.5 text-[12px] text-muted">{item.details}</Text>
              ) : null}
            </View>
            <Text className="font-semibold text-foreground">
              {CURRENCY}
              {item.price * item.quantity}
            </Text>
          </View>
        ))}
        <View className="mt-1 flex-row justify-between border-t border-border pt-2">
          <Text className="text-base font-bold text-foreground">
            Total ({PAYMENT_METHOD_LABELS[order.paymentMethod]})
          </Text>
          <Text className="text-lg font-extrabold text-primary">
            {CURRENCY}
            {order.total}
          </Text>
        </View>
        {order.paymentMethod !== 'upi' && order.paymentMethod !== 'razorpay' ? (
          <View className="mt-3 flex-row items-center justify-between rounded-xl bg-background px-3 py-2">
            <Text className="text-sm text-muted">Payment status</Text>
            <Text
              className={`text-sm font-semibold ${
                order.paymentStatus === 'verified' ? 'text-primary' : 'text-amber-700'
              }`}
            >
              {ORDER_PAYMENT_STATUS_LABELS[order.paymentStatus ?? 'pending']}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <Text className="mb-2 text-base font-bold text-foreground">Delivery address</Text>
        <Text className="text-[15px] leading-6 text-muted">{order.address.name}</Text>
        <Text className="text-[15px] leading-6 text-muted">{order.address.phone}</Text>
        <Text className="text-[15px] leading-6 text-muted">{order.address.addressLine}</Text>
        {order.address.landmark ? (
          <Text className="text-[15px] leading-6 text-muted">
            Near {order.address.landmark}
          </Text>
        ) : null}
      </View>

      <View className="gap-2">
        <Button
          label="Share on WhatsApp"
          variant="whatsapp"
          onPress={() => void shareOrderOnWhatsApp(order)}
        />
        <Button
          label="Resend WhatsApp update"
          variant="whatsapp"
          onPress={() => sendWhatsAppUpdate(order.id)}
        />
        {canAdvance && !isSupabaseConfigured() && (
          <Button
            label="Simulate next delivery step"
            variant="secondary"
            onPress={() => advanceOrderStatus(order.id)}
          />
        )}
        <Button
          label="Continue shopping"
          variant="outline"
          onPress={() => router.replace('/')}
        />
      </View>
    </ScrollView>
  );
}
