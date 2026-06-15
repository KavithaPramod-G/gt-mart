import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryHeroCards } from '@/components/CategoryHeroCards';
import { ProductCard } from '@/components/ProductCard';
import { SHOP_TAGLINE } from '@/constants/config';
import { useProducts } from '@/context/ProductsContext';

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { products, isLoading, source } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');

  const trimmedSearch = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  const searchResults = useMemo(() => {
    if (!trimmedSearch) return [];

    return products.filter(
      (product) =>
        product.inStock && product.name.toLowerCase().includes(trimmedSearch),
    );
  }, [products, trimmedSearch]);

  const isSearching = trimmedSearch.length > 0;

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
        {source === 'database' ? (
          <Text className="mt-2 text-xs text-primary-light">Live catalog from database</Text>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1B7A4E" />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
          {!isSearching ? <CategoryHeroCards /> : null}

          {isSearching ? (
            <View className="px-4 pt-4">
              <Text className="mb-3 text-base font-bold text-foreground">
                {searchResults.length > 0
                  ? `${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for "${searchQuery.trim()}"`
                  : `No results for "${searchQuery.trim()}"`}
              </Text>
              {searchResults.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
