import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';
import { CURRENCY, ORDER_STATUS_LABELS } from '@/constants/config';
import { useOrders } from '@/context/OrderContext';

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
      {orders.map((order) => (
        <Pressable
          key={order.id}
          onPress={() => router.push(`/order/${order.id}`)}
          className="mb-4 rounded-2xl border border-border bg-surface p-4 active:opacity-90"
        >
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">{order.orderNumber}</Text>
            <View className="rounded-full bg-primary-light px-2 py-1">
              <Text className="text-xs font-bold text-primary">
                {ORDER_STATUS_LABELS[order.status]}
              </Text>
            </View>
          </View>

          <Text className="mb-1 text-sm text-muted">
            {order.items.length} items · {CURRENCY}
            {order.total} · Cash on Delivery
          </Text>
          <Text className="mb-4 text-[13px] text-muted">
            {new Date(order.createdAt).toLocaleString()}
          </Text>

          <OrderStatusTimeline currentStatus={order.status} />
        </Pressable>
      ))}
    </ScrollView>
  );
}
