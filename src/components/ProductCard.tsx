import { Pressable, Text, View } from 'react-native';

import { CURRENCY } from '@/constants/config';
import { useCart } from '@/context/CartContext';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const { addItem, updateQuantity, getQuantity } = useCart();
  const quantity = getQuantity(product.id);

  return (
    <Pressable
      onPress={onPress}
      className="mb-2 flex-row items-center rounded-2xl border border-border bg-surface p-4 active:opacity-90"
    >
      <View className="mr-4 h-14 w-14 items-center justify-center rounded-xl bg-primary-light">
        <Text className="text-3xl">{product.emoji}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
          {product.name}
        </Text>
        <Text className="mt-0.5 text-[13px] text-muted">Per {product.unit}</Text>
        <Text className="mt-1 text-[15px] font-bold text-primary">
          {CURRENCY}
          {product.price}
        </Text>
      </View>

      {quantity === 0 ? (
        <Pressable
          onPress={() => addItem(product)}
          className="rounded-lg bg-primary-light px-4 py-2"
          hitSlop={8}
        >
          <Text className="text-[13px] font-bold text-primary">ADD</Text>
        </Pressable>
      ) : (
        <View className="flex-row items-center overflow-hidden rounded-lg bg-primary">
          <Pressable
            onPress={() => updateQuantity(product.id, quantity - 1)}
            className="h-8 w-8 items-center justify-center"
          >
            <Text className="text-lg font-bold text-white">−</Text>
          </Pressable>
          <Text className="min-w-6 text-center font-bold text-white">{quantity}</Text>
          <Pressable
            onPress={() => updateQuantity(product.id, quantity + 1)}
            className="h-8 w-8 items-center justify-center"
          >
            <Text className="text-lg font-bold text-white">+</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}
