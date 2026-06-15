import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, View } from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { StackBackButton } from '@/components/StackBackButton';
import {
  ALL_PRODUCTS_META,
  CATEGORY_META,
  getCategoryLabel,
  isShopListingId,
} from '@/constants/categoryMeta';
import { useProducts } from '@/context/ProductsContext';
import { ProductCategory } from '@/types';

export default function CategoryProductsScreen() {
  const { id, q } = useLocalSearchParams<{ id: string; q?: string }>();
  const { products, isLoading } = useProducts();
  const [searchQuery, setSearchQuery] = useState(typeof q === 'string' ? q : '');

  const listingId = id && isShopListingId(id) ? id : null;
  const isAll = listingId === 'all';
  const category = listingId && listingId !== 'all' ? (listingId as ProductCategory) : null;

  const filteredProducts = useMemo(() => {
    if (!listingId) return [];

    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      if (!product.inStock) return false;
      if (!isAll && product.category !== category) return false;
      if (query && !product.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [products, listingId, isAll, category, searchQuery]);

  if (!listingId) {
    return (
      <>
        <Stack.Screen options={{ title: 'Not found' }} />
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-muted">Category not found.</Text>
        </View>
      </>
    );
  }

  const meta = isAll ? ALL_PRODUCTS_META : CATEGORY_META[category!];
  const label = isAll ? ALL_PRODUCTS_META.label : getCategoryLabel(category!);
  const searchPlaceholder = isAll
    ? 'Search all products...'
    : `Search in ${label.toLowerCase()}...`;

  return (
    <>
      <Stack.Screen
        options={{
          title: label,
          headerBackTitle: 'Categories',
          headerLeft: () => (
            <StackBackButton fallbackHref="/(tabs)" accessibilityLabel="Back to categories" />
          ),
        }}
      />

      <View className="flex-1 bg-background">
        <View className="border-b border-border bg-surface px-4 py-3">
          <View className="mb-2 flex-row items-center">
            <Text className="mr-2 text-2xl">{meta.emoji}</Text>
            <View className="flex-1">
              <Text className="text-base font-bold text-foreground">{label}</Text>
              <Text className="text-xs text-muted">{meta.blurb}</Text>
            </View>
          </View>
          <TextInput
            placeholder={searchPlaceholder}
            placeholderTextColor="#5C6B63"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1B7A4E" />
          </View>
        ) : (
          <FlatList
            className="flex-1"
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            renderItem={({ item }) => <ProductCard product={item} />}
            ListEmptyComponent={
              <View className="items-center p-8">
                <Text className="text-[15px] text-muted">No products found.</Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}
