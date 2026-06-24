import { Pressable, Text, View } from 'react-native';

import { ProductImage } from '@/components/ProductImage';
import { ProductPrice } from '@/components/ProductPrice';
import { CURRENCY } from '@/constants/config';
import { useCart } from '@/context/CartContext';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

function CartControl({
  quantity,
  onAdd,
  onDecrease,
  onIncrease,
}: {
  quantity: number;
  onAdd: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  if (quantity === 0) {
    return (
      <Pressable
        onPress={onAdd}
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full border-2 border-primary bg-white shadow-sm active:opacity-90"
      >
        <Text className="text-xl font-bold text-primary">+</Text>
      </Pressable>
    );
  }

  return (
    <View className="flex-row items-center overflow-hidden rounded-full border-2 border-primary bg-white shadow-sm">
      <Pressable onPress={onDecrease} className="h-9 w-9 items-center justify-center">
        <Text className="text-lg font-bold text-primary">−</Text>
      </Pressable>
      <Text className="min-w-5 text-center text-sm font-bold text-foreground">{quantity}</Text>
      <Pressable onPress={onIncrease} className="h-9 w-9 items-center justify-center">
        <Text className="text-lg font-bold text-primary">+</Text>
      </Pressable>
    </View>
  );
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const { addItem, updateQuantity, getQuantity } = useCart();
  const quantity = getQuantity(product.id);
  const discount =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  return (
    <Pressable onPress={onPress} className="mb-4 active:opacity-95">
      <View className="relative mb-2 w-full">
        <ProductImage product={product} size="card" />
        <View className="absolute bottom-2 right-2" pointerEvents="box-none">
          <CartControl
            quantity={quantity}
            onAdd={() => addItem(product)}
            onDecrease={() => updateQuantity(product.id, quantity - 1)}
            onIncrease={() => updateQuantity(product.id, quantity + 1)}
          />
        </View>
      </View>

      <View className="px-0.5">
        <View className="mb-1.5 self-start rounded-md border border-primary/30 bg-primary-light/40 px-2 py-0.5">
          <Text className="text-[11px] font-semibold text-primary">{product.unit}</Text>
        </View>

        <Text className="text-[14px] font-semibold leading-5 text-foreground" numberOfLines={2}>
          {product.name}
        </Text>

        {discount > 0 ? (
          <Text className="mt-1 text-[12px] font-bold text-primary">{discount}% OFF</Text>
        ) : null}

        <ProductPrice
          mrp={product.mrp}
          price={product.price}
          size="sm"
          showDiscountPercent={false}
        />

        <Text className="mt-0.5 text-[11px] text-muted">
          {CURRENCY}{product.price} / {product.unit}
        </Text>
      </View>
    </Pressable>
  );
}
