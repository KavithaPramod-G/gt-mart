import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CartItemRow } from '@/components/CartItemRow';
import { EmptyState } from '@/components/EmptyState';
import { CURRENCY, DELIVERY_FEE, MIN_ORDER_AMOUNT } from '@/constants/config';
import { useCart } from '@/context/CartContext';

export default function CartScreen() {
  const { items, subtotal, itemCount } = useCart();
  const total = subtotal + (itemCount > 0 ? DELIVERY_FEE : 0);
  const meetsMinimum = subtotal >= MIN_ORDER_AMOUNT;

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="Your cart is empty"
        description="Browse GT Mart and add fresh groceries to get started."
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-4 pb-8">
        {items.map((item) => (
          <CartItemRow key={item.product.id} item={item} />
        ))}

        <View className="mt-2 rounded-2xl border border-border bg-surface p-4">
          <View className="mb-2 flex-row justify-between">
            <Text className="text-[15px] text-muted">Subtotal</Text>
            <Text className="text-[15px] font-semibold text-foreground">
              {CURRENCY}
              {subtotal}
            </Text>
          </View>
          <View className="mb-2 flex-row justify-between">
            <Text className="text-[15px] text-muted">Delivery</Text>
            <Text className="text-[15px] font-semibold text-foreground">
              {CURRENCY}
              {DELIVERY_FEE}
            </Text>
          </View>
          <View className="mt-1 flex-row justify-between border-t border-border pt-2">
            <Text className="text-base font-bold text-foreground">Total (COD)</Text>
            <Text className="text-lg font-extrabold text-primary">
              {CURRENCY}
              {total}
            </Text>
          </View>
          {!meetsMinimum && (
            <Text className="mt-2 text-[13px] text-error">
              Minimum order is {CURRENCY}
              {MIN_ORDER_AMOUNT}
            </Text>
          )}
        </View>
      </ScrollView>

      <View className="border-t border-border bg-surface p-4">
        <Button
          label="Proceed to Checkout"
          disabled={!meetsMinimum}
          onPress={() => router.push('/checkout')}
        />
      </View>
    </View>
  );
}
