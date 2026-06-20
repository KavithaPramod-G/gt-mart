import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';
import { CURRENCY, ORDER_STATUS_LABELS, SHOP_NAME } from '@/constants/config';
import { isSupabaseConfigured } from '@/lib/env';
import { useOrders } from '@/context/OrderContext';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getOrder, advanceOrderStatus, sendWhatsAppUpdate } = useOrders();
  const order = id ? getOrder(id) : undefined;

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
        <Ionicons name="checkmark-circle" size={48} color="#1B7A4E" />
        <Text className="mt-2 text-lg font-bold text-foreground">Order placed successfully</Text>
        <Text className="mt-1 text-[22px] font-extrabold text-primary">{order.orderNumber}</Text>
        <Text className="mt-2 text-center leading-5 text-muted">
          {SHOP_NAME} received your order via WhatsApp. Track updates below.
        </Text>
      </View>

      <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <Text className="mb-2 text-base font-bold text-foreground">Delivery status</Text>
        <Text className="mb-4 text-[15px] font-semibold text-primary">
          {ORDER_STATUS_LABELS[order.status]}
        </Text>
        <OrderStatusTimeline currentStatus={order.status} />
      </View>

      <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <Text className="mb-2 text-base font-bold text-foreground">Items</Text>
        {order.items.map((item) => (
          <View key={`${item.productId}-${item.name}`} className="mb-2 flex-row justify-between">
            <Text className="flex-1 pr-2 text-muted">
              {item.name} x{item.quantity}
            </Text>
            <Text className="font-semibold text-foreground">
              {CURRENCY}
              {item.price * item.quantity}
            </Text>
          </View>
        ))}
        <View className="mt-1 flex-row justify-between border-t border-border pt-2">
          <Text className="text-base font-bold text-foreground">Total (COD)</Text>
          <Text className="text-lg font-extrabold text-primary">
            {CURRENCY}
            {order.total}
          </Text>
        </View>
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

      <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <Text className="mb-2 text-base font-bold text-foreground">WhatsApp updates</Text>
        {order.whatsappNotifications.map((notification) => (
          <View
            key={`${notification.status}-${notification.sentAt}`}
            className="mb-2 rounded-xl bg-background p-2"
          >
            <Text className="mb-1 font-bold text-primary">
              {ORDER_STATUS_LABELS[notification.status]}
            </Text>
            <Text className="mb-1 leading-5 text-foreground">{notification.message}</Text>
            <Text className="text-xs text-muted">
              {new Date(notification.sentAt).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>

      <View className="gap-2">
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
