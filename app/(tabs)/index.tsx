import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryHeroCards } from '@/components/CategoryHeroCards';
import { ProductCard } from '@/components/ProductCard';
import { ProductListFooter } from '@/components/ProductListFooter';
import { SHOP_TAGLINE } from '@/constants/config';
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
        <Text className="text-[28px] font-extrabold text-white">GT Mart</Text>
        <Text className="mb-4 mt-1 text-sm text-primary-light">{SHOP_TAGLINE}</Text>
        <TextInput
          placeholder="Search groceries..."
          placeholderTextColor="#5C6B63"
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="rounded-xl bg-surface px-4 py-2.5 text-[15px] text-foreground"
          returnKeyType="search"
          clearButtonMode="while-editing"
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
        <FlatList
          className="flex-1"
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
          renderItem={({ item }) => <ProductCard product={item} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
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
          ListFooterComponent={
            <ProductListFooter
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              itemCount={products.length}
            />
          }
        />
      )}
    </View>
  );
}
