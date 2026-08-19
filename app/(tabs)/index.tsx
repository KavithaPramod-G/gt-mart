import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryHeroCards } from '@/components/CategoryHeroCards';
import { SearchInput } from '@/components/SearchInput';
import { ShopSupportLinks } from '@/components/ShopSupportLinks';
import { ProductGridList } from '@/components/ProductGridList';
import { APP_NAME, SHOP_LOCATION, SHOP_TAGLINE } from '@/constants/config';
import { isSupabaseConfigured } from '@/lib/env';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const trimmedSearch = searchQuery.trim();
  const isSearching = trimmedSearch.length > 0;

  const { products, totalCount, isLoading, isLoadingMore, hasMore, loadMore } =
    usePaginatedProducts({
      search: searchQuery,
      enabled: isSearching && isSupabaseConfigured(),
    });

  return (
    <View className="flex-1 bg-background">
      <View
        className="bg-primary px-4 pb-4"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="mb-4 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[28px] font-extrabold text-white">{APP_NAME}</Text>
            <Text className="mt-1 text-sm text-primary-light">
              {SHOP_LOCATION} · {SHOP_TAGLINE}
            </Text>
          </View>
          <ShopSupportLinks />
        </View>
        <SearchInput
          placeholder="Search groceries..."
          placeholderTextColor="#5C6B63"
          value={searchQuery}
          onChangeText={setSearchQuery}
          inputClassName="bg-surface"
          returnKeyType="search"
        />
        {isSupabaseConfigured() ? (
          <Text className="mt-2 text-xs text-primary-light">Live catalog from database</Text>
        ) : null}
      </View>

      {!isSearching ? (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
          <CategoryHeroCards />
        </ScrollView>
      ) : isLoading && products.length === 0 ? (
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
          contentContainerStyle={{ paddingTop: 16 }}
          ListHeaderComponent={
            <Text className="mb-3 text-base font-bold text-foreground">
              {totalCount > 0
                ? `${totalCount} result${totalCount === 1 ? '' : 's'} for "${trimmedSearch}"`
                : `No results for "${trimmedSearch}"`}
            </Text>
          }
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
  );
}
