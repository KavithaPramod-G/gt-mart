import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';

import { ProductGridList } from '@/components/ProductGridList';
import { CategoryImage } from '@/components/CategoryImage';
import { StackBackButton } from '@/components/StackBackButton';
import { ALL_PRODUCTS_META, isShopListingId } from '@/constants/categoryMeta';
import { useCategories } from '@/context/CategoriesContext';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { isSupabaseConfigured } from '@/lib/env';

export default function CategoryProductsScreen() {
  const { id, q } = useLocalSearchParams<{ id: string; q?: string }>();
  const [searchQuery, setSearchQuery] = useState(typeof q === 'string' ? q : '');
  const { categories, isLoading: categoriesLoading, getCategoryLabel, getCategoryUi, isKnownCategoryId } =
    useCategories();

  const knownIds = useMemo(() => new Set(categories.map((category) => category.id)), [categories]);

  const listingId =
    id && isShopListingId(id, knownIds.size > 0 ? knownIds : undefined) ? id : null;
  const isAll = listingId === 'all';
  const categoryId = listingId && listingId !== 'all' ? listingId : null;

  const { products, totalCount, isLoading, isLoadingMore, hasMore, loadMore } =
    usePaginatedProducts({
      categoryId: isAll ? null : categoryId,
      search: searchQuery,
      enabled: Boolean(listingId) && isSupabaseConfigured(),
    });

  if (categoriesLoading && !listingId && id) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#1B7A4E" />
      </View>
    );
  }

  if (!listingId || (categoryId && !isKnownCategoryId(categoryId))) {
    return (
      <>
        <Stack.Screen options={{ title: 'Not found' }} />
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-muted">Category not found.</Text>
        </View>
      </>
    );
  }

  const meta = isAll ? ALL_PRODUCTS_META : getCategoryUi(categoryId!);
  const label = isAll ? ALL_PRODUCTS_META.label : getCategoryLabel(categoryId!);
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
            <CategoryImage category={meta} size="md" />
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-foreground">{label}</Text>
              <Text className="text-xs text-muted">
                {meta.blurb}
                {totalCount > 0 ? ` · ${totalCount} items` : ''}
              </Text>
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

        {isLoading && products.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1B7A4E" />
          </View>
        ) : (
          <ProductGridList
            className="flex-1"
            products={products}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            ListEmptyComponent={
              !isLoading ? (
                <View className="items-center p-8">
                  <Text className="text-[15px] text-muted">No products found.</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </>
  );
}
