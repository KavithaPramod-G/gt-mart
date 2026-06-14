import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryFilter } from '@/components/CategoryFilter';
import { ProductCard } from '@/components/ProductCard';
import { SHOP_TAGLINE } from '@/constants/config';
import { useProducts } from '@/context/ProductsContext';
import { ProductCategory } from '@/types';

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { products, isLoading, source } = useProducts();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());
      return matchesCategory && matchesSearch && product.inStock;
    });
  }, [products, selectedCategory, searchQuery]);

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
        />
        {source === 'database' ? (
          <Text className="mt-2 text-xs text-primary-light">Live catalog from database</Text>
        ) : null}
      </View>

      <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />

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
  );
}
