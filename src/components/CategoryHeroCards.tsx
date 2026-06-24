import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ALL_PRODUCTS_META } from '@/constants/categoryMeta';
import { useCategories } from '@/context/CategoriesContext';

interface CategoryHeroCardsProps {
  /** Preview/demo mode — tap calls handler instead of navigating. */
  onCategoryPress?: (category: string | 'all') => void;
}

export function CategoryHeroCards({ onCategoryPress }: CategoryHeroCardsProps) {
  const { categories, isLoading, getCategoryLabel, getCategoryUi } = useCategories();

  const handlePress = (category: string | 'all') => {
    if (onCategoryPress) {
      onCategoryPress(category);
      return;
    }

    router.push({
      pathname: '/category/[id]',
      params: { id: category },
    });
  };

  if (isLoading) {
    return (
      <View className="mb-2 items-center px-4 pt-8">
        <ActivityIndicator color="#1B7A4E" />
      </View>
    );
  }

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
        {categories.map((category) => {
          const meta = getCategoryUi(category.id);

          return (
            <Pressable
              key={category.id}
              onPress={() => handlePress(category.id)}
              className="mb-3 w-[48%] overflow-hidden rounded-2xl border-2 border-border p-4 active:opacity-90"
              style={{ backgroundColor: meta.tint }}
            >
              <Text className="text-[40px]">{meta.emoji}</Text>
              <Text className="mt-2 text-[15px] font-bold text-foreground">
                {getCategoryLabel(category.id)}
              </Text>
              <Text className="mt-0.5 text-xs text-muted">{meta.blurb}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
