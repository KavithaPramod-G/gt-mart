import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import {
  ALL_PRODUCTS_META,
  CATEGORY_META,
  getCategoryLabel,
  SHOP_CATEGORIES,
  ShopListingId,
} from '@/constants/categoryMeta';

interface CategoryHeroCardsProps {
  /** Preview/demo mode — tap calls handler instead of navigating. */
  onCategoryPress?: (category: ShopListingId) => void;
}

export function CategoryHeroCards({ onCategoryPress }: CategoryHeroCardsProps) {
  const handlePress = (category: ShopListingId) => {
    if (onCategoryPress) {
      onCategoryPress(category);
      return;
    }

    router.push({
      pathname: '/category/[id]',
      params: { id: category },
    });
  };

  return (
    <View className="mb-2 px-4 pt-4">
      <Text className="mb-3 text-base font-bold text-foreground">Browse departments</Text>

      <Pressable
        onPress={() => handlePress('all')}
        className="mb-3 overflow-hidden rounded-2xl border-2 border-primary bg-primary-light p-4 active:opacity-90"
      >
        <View className="flex-row items-center">
          <Text className="text-[40px]">{ALL_PRODUCTS_META.emoji}</Text>
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-bold text-foreground">
              {ALL_PRODUCTS_META.label}
            </Text>
            <Text className="mt-0.5 text-xs text-muted">{ALL_PRODUCTS_META.blurb}</Text>
          </View>
          <Text className="text-lg text-primary">→</Text>
        </View>
      </Pressable>

      <View className="flex-row flex-wrap justify-between">
        {SHOP_CATEGORIES.map((category) => {
          const meta = CATEGORY_META[category];

          return (
            <Pressable
              key={category}
              onPress={() => handlePress(category)}
              className="mb-3 w-[48%] overflow-hidden rounded-2xl border-2 border-border p-4 active:opacity-90"
              style={{ backgroundColor: meta.tint }}
            >
              <Text className="text-[40px]">{meta.emoji}</Text>
              <Text className="mt-2 text-[15px] font-bold text-foreground">
                {getCategoryLabel(category)}
              </Text>
              <Text className="mt-0.5 text-xs text-muted">{meta.blurb}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
