import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { CartDock, useCartDockInset } from '@/components/CartDock';
import { ProductGridList } from '@/components/ProductGridList';
import { StackBackButton } from '@/components/StackBackButton';
import { fetchBogoProducts } from '@/services/api/productsApi';
import { Product } from '@/types';

export default function BogoOfferScreen() {
  const cartDockInset = useCartDockInset();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchBogoProducts().then((rows) => {
      if (cancelled) return;
      setProducts(rows ?? []);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Buy 1 Get 1',
          headerLeft: () => (
            <StackBackButton fallbackHref="/(tabs)" accessibilityLabel="Back to shop" />
          ),
        }}
      />
      <View className="flex-1 bg-background">
        <View className="border-b border-border bg-surface px-4 py-3">
          <Text className="text-base font-bold text-foreground">Buy one, get one</Text>
          <Text className="mt-0.5 text-xs text-muted">
            Products the shop has marked for this offer. This list is separate from the category shelves.
          </Text>
        </View>
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1B7A4E" />
          </View>
        ) : products.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-muted">No Buy 1 Get 1 products right now.</Text>
          </View>
        ) : (
          <ProductGridList
            products={products}
            contentContainerStyle={{ paddingBottom: cartDockInset + 24, paddingTop: 12 }}
          />
        )}
        <CartDock />
      </View>
    </>
  );
}
