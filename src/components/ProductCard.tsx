import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ProductImage } from '@/components/ProductImage';
import { ProductPrice } from '@/components/ProductPrice';
import { CURRENCY } from '@/constants/config';
import { useCart } from '@/context/CartContext';
import { useCombos } from '@/context/CombosContext';
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
  canIncrease = true,
}: {
  quantity: number;
  onAdd: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  canIncrease?: boolean;
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
      <Pressable
        onPress={onIncrease}
        disabled={!canIncrease}
        className="h-9 w-9 items-center justify-center"
      >
        <Text className={`text-lg font-bold ${canIncrease ? 'text-primary' : 'text-muted'}`}>+</Text>
      </Pressable>
    </View>
  );
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const { addItem, updateQuantity, getQuantity } = useCart();
  const { findCombosForProduct } = useCombos();
  const quantity = getQuantity(product.id);
  const relatedCombo = findCombosForProduct(product)[0];
  const discount =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  return (
    <Pressable onPress={onPress} className="mb-4 active:opacity-95">
      <View className="relative mb-2 w-full" style={product.inStock ? undefined : { opacity: 0.55 }}>
        <ProductImage product={product} size="card" />
        <View className="absolute bottom-2 right-2" pointerEvents="box-none">
          {product.inStock || quantity > 0 ? (
            <CartControl
              quantity={quantity}
              canIncrease={product.inStock}
              onAdd={() => addItem(product)}
              onDecrease={() => updateQuantity(product.id, quantity - 1)}
              onIncrease={() => updateQuantity(product.id, quantity + 1)}
            />
          ) : (
            <View className="rounded-md bg-white px-2 py-1">
              <Text className="text-[11px] font-bold text-error">Out of stock</Text>
            </View>
          )}
        </View>
      </View>

      <View className="px-0.5">
        <View className="mb-1.5 self-start rounded-md border border-primary/30 bg-primary-light/40 px-2 py-0.5">
          <Text className="text-[11px] font-semibold text-primary">{product.unit}</Text>
        </View>

        <Text className="text-[14px] font-semibold leading-5 text-foreground" numberOfLines={2}>
          {product.name}
        </Text>

        {!product.inStock ? (
          <Text className="mt-1 text-[12px] font-bold text-error">Out of stock</Text>
        ) : null}

        {product.inStock && discount > 0 ? (
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

        {relatedCombo ? (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/combo/[id]', params: { id: relatedCombo.id } })
            }
            className="mt-2 rounded-lg border border-dashed border-primary bg-primary-light px-2 py-1.5"
          >
            <Text className="text-[11px] font-semibold text-primary">Also in a combo</Text>
            <Text className="text-[11px] text-muted" numberOfLines={2}>
              {relatedCombo.title}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
