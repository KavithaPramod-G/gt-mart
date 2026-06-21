import { Pressable, ScrollView, Text, View } from 'react-native';

import { getCategoryLabel, SHOP_CATEGORIES } from '@/constants/categoryMeta';
import { ProductCategory } from '@/types';
import { cn } from '@/utils/cn';

interface CategoryFilterProps {
  selected: ProductCategory | 'all';
  onSelect: (category: ProductCategory | 'all') => void;
}

const categories: Array<ProductCategory | 'all'> = ['all', ...SHOP_CATEGORIES];

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <View className="border-b border-border bg-background py-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          alignItems: 'center',
          minHeight: 40,
        }}
      >
        {categories.map((category) => {
          const isSelected = selected === category;
          const label = category === 'all' ? 'All' : getCategoryLabel(category);

          return (
            <Pressable
              key={category}
              onPress={() => onSelect(category)}
              className={cn(
                'mr-2 rounded-full border px-4 py-2',
                isSelected
                  ? 'border-primary bg-primary'
                  : 'border-border bg-surface',
              )}
            >
              <Text
                className={cn(
                  'text-sm font-semibold',
                  isSelected ? 'text-white' : 'text-muted',
                )}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
