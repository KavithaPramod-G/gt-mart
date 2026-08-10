import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';
import { CURRENCY, ORDER_PAYMENT_SHORT_LABELS, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/constants/config';
import { useOrders } from '@/context/OrderContext';
import { Order } from '@/types';
import { getCancelReason, getSortedStatusUpdates } from '@/utils/orderStatusNotes';
import { cn } from '@/utils/cn';

function getOrderCardHint(order: Order): {
  text: string;
  tone: 'payment' | 'track' | 'details';
} {
  if (order.status === 'cancelled') {
    return {
      text: 'Tap to view full details and cancel reason',
      tone: 'details',
    };
  }

  if (
    order.paymentMethod === 'upi' &&
    order.paymentStatus !== 'verified' &&
    order.status !== 'delivered'
  ) {
    return {
      text: 'Tap to pay with GPay/PhonePe and share payment on WhatsApp',
      tone: 'payment',
    };
  }

  if (order.status !== 'delivered') {
    return {
      text: 'Tap to track delivery and view full order history',
      tone: 'track',
    };
  }

  return {
    text: 'Tap to view order history and details',
    tone: 'details',
  };
}

export default function OrdersScreen() {
  const { orders } = useOrders();

  if (orders.length === 0) {
    return (
      <EmptyState
        emoji="📦"
        title="No orders yet"
        description="Your order history and delivery updates will appear here."
      />
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <View className="mb-4 rounded-xl border border-[#B8E6C8] bg-[#E8F8EE] p-4">
        <Text className="text-sm font-semibold text-primary">How to use this screen</Text>
        <Text className="mt-1 text-sm leading-5 text-muted">
          Tap any order below to open it. There you can pay online, share payment on WhatsApp,
          and see the full delivery history with times.
        </Text>
      </View>

      {orders.map((order) => {
        const cancelReason = getCancelReason(order.whatsappNotifications);
        const history = getSortedStatusUpdates(order.whatsappNotifications);
        const lastUpdate = history[history.length - 1];
        const hint = getOrderCardHint(order);
        const needsUpiPayment =
          order.paymentMethod === 'upi' &&
          order.paymentStatus !== 'verified' &&
          order.status !== 'cancelled' &&
          order.status !== 'delivered';

        const paymentStatus = order.paymentStatus ?? 'pending';
        const isPaid = paymentStatus === 'verified';

        return (
          <Pressable
            key={order.id}
            onPress={() => router.push(`/order/${order.id}`)}
            className="mb-4 rounded-2xl border border-border bg-surface p-4 active:opacity-90"
          >
            <View className="mb-2 flex-row items-start justify-between gap-2">
              <Text className="flex-1 text-base font-bold text-foreground">{order.orderNumber}</Text>
              <View className="flex-row flex-wrap justify-end gap-1">
                <View className="rounded-full bg-primary-light px-2 py-1">
                  <Text className="text-xs font-bold text-primary">
                    {ORDER_STATUS_LABELS[order.status]}
                  </Text>
                </View>
                <View
                  className={cn(
                    'rounded-full px-2 py-1',
                    isPaid ? 'bg-[#E8F8EE]' : 'bg-amber-50',
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs font-bold',
                      isPaid ? 'text-primary' : 'text-amber-800',
                    )}
                  >
                    {ORDER_PAYMENT_SHORT_LABELS[paymentStatus]}
                  </Text>
                </View>
              </View>
            </View>

            <Text className="mb-1 text-sm text-muted">
              {order.items.length} items · {CURRENCY}
              {order.total} · {PAYMENT_METHOD_LABELS[order.paymentMethod]}
            </Text>

            {needsUpiPayment ? (
              <View className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <Text className="text-sm font-semibold text-amber-900">Payment pending</Text>
                <Text className="mt-0.5 text-sm leading-5 text-amber-800">
                  Open this order to pay and send proof on WhatsApp.
                </Text>
              </View>
            ) : null}

            {order.status === 'cancelled' && cancelReason ? (
              <Text className="mb-1 text-sm leading-5 text-foreground" numberOfLines={2}>
                Reason: {cancelReason}
              </Text>
            ) : null}

            <Text className="mb-3 text-[13px] text-muted">
              Placed {new Date(order.createdAt).toLocaleString()}
              {lastUpdate
                ? ` · Last update ${new Date(lastUpdate.sentAt).toLocaleString()}`
                : ''}
            </Text>

            <OrderStatusTimeline
              currentStatus={order.status}
              statusUpdates={order.whatsappNotifications}
            />

            <View
              className={cn(
                'mt-3 flex-row items-center justify-between rounded-xl border px-3 py-2.5',
                hint.tone === 'payment'
                  ? 'border-primary bg-primary-light'
                  : 'border-border bg-background',
              )}
            >
              <Text
                className={cn(
                  'mr-2 flex-1 text-sm leading-5',
                  hint.tone === 'payment' ? 'font-semibold text-primary' : 'text-foreground',
                )}
              >
                {hint.text}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={hint.tone === 'payment' ? '#1B7A4E' : '#5C6B63'}
              />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
