import { Pressable, Text, View } from 'react-native';

import { CURRENCY } from '@/constants/config';
import { useCart } from '@/context/CartContext';
import { ProductPrice } from '@/components/ProductPrice';
import { CartItem } from '@/types';

interface CartItemRowProps {
  item: CartItem;
}

export function CartItemRow({ item }: CartItemRowProps) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <View className="mb-2 flex-row rounded-2xl border border-border bg-surface p-4">
      <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
        <Text className="text-2xl">{item.product.emoji}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground">{item.product.name}</Text>
        <ProductPrice mrp={item.product.mrp} price={item.product.price} size="sm" />
        <Text className="mt-1 text-[13px] text-muted">Per {item.product.unit}</Text>
        <Text className="mt-0.5 text-[15px] font-bold text-primary">
          {CURRENCY}
          {item.product.price * item.quantity}
        </Text>
      </View>

      <View className="items-end justify-between">
        <View className="flex-row items-center overflow-hidden rounded-lg bg-primary-light">
          <Pressable
            onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
            className="h-7 w-7 items-center justify-center"
          >
            <Text className="text-base font-bold text-primary">−</Text>
          </Pressable>
          <Text className="min-w-6 text-center font-bold text-foreground">
            {item.quantity}
          </Text>
          <Pressable
            onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
            className="h-7 w-7 items-center justify-center"
          >
            <Text className="text-base font-bold text-primary">+</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => removeItem(item.product.id)}>
          <Text className="text-[13px] font-semibold text-error">Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}
