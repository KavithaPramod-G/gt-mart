import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CartItemRow } from '@/components/CartItemRow';
import { CURRENCY, DELIVERY_FEE, MIN_ORDER_AMOUNT } from '@/constants/config';
import { useCart } from '@/context/CartContext';

const COLLAPSED_DOCK_HEIGHT = 88;

/** Bottom inset so lists don't sit under the collapsed cart dock. */
export function useCartDockInset(): number {
  const insets = useSafeAreaInsets();
  const { items } = useCart();

  if (items.length === 0) {
    return 0;
  }

  return COLLAPSED_DOCK_HEIGHT + insets.bottom;
}

export function CartDock() {
  const insets = useSafeAreaInsets();
  const { items, itemCount, subtotal } = useCart();
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const total = subtotal + DELIVERY_FEE;
  const meetsMinimum = subtotal >= MIN_ORDER_AMOUNT;

  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface shadow-lg"
      style={{ paddingBottom: insets.bottom }}
    >
      {expanded ? (
        <ScrollView
          style={{ maxHeight: 300 }}
          contentContainerClassName="px-4 pt-3"
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {items.map((item) => (
            <CartItemRow key={item.product.id} item={item} />
          ))}

          <View className="mb-2 rounded-2xl border border-border bg-background p-3">
            <View className="mb-1 flex-row justify-between">
              <Text className="text-sm text-muted">Subtotal</Text>
              <Text className="text-sm font-semibold text-foreground">
                {CURRENCY}
                {subtotal}
              </Text>
            </View>
            <View className="mb-1 flex-row justify-between">
              <Text className="text-sm text-muted">Delivery</Text>
              <Text className="text-sm font-semibold text-foreground">
                {CURRENCY}
                {DELIVERY_FEE}
              </Text>
            </View>
            <View className="mt-1 flex-row justify-between border-t border-border pt-2">
              <Text className="text-sm font-bold text-foreground">Total (COD)</Text>
              <Text className="text-base font-extrabold text-primary">
                {CURRENCY}
                {total}
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : null}

      <Pressable
        onPress={() => setExpanded((value) => !value)}
        className="flex-row items-center px-4 py-2.5 active:opacity-90"
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse cart' : 'Expand cart'}
      >
        <View className="mr-3 rounded-full bg-primary-light p-2">
          <Ionicons name="cart" size={20} color="#1B7A4E" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground">
            {itemCount} item{itemCount === 1 ? '' : 's'} in cart
          </Text>
          <Text className="text-xs text-muted">
            {CURRENCY}
            {subtotal} subtotal · Tap to {expanded ? 'hide' : 'view'} items
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-up'}
          size={20}
          color="#5C6B63"
        />
      </Pressable>

      <View className="px-4 pb-2">
        <Button
          label="Proceed to Checkout"
          disabled={!meetsMinimum}
          onPress={() => router.push('/checkout')}
        />
        {!meetsMinimum ? (
          <Text className="mt-1.5 text-center text-xs text-error">
            Minimum order is {CURRENCY}
            {MIN_ORDER_AMOUNT}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
