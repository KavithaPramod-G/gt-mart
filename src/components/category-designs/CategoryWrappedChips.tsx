import { Pressable, Text, View } from 'react-native';

import { getCategoryLabel, SHOP_CATEGORIES } from '@/constants/categoryMeta';
import { ProductCategory } from '@/types';
import { cn } from '@/utils/cn';

interface CategoryWrappedChipsProps {
  selected: ProductCategory | 'all' | null;
  onSelect: (category: ProductCategory | 'all') => void;
}

/** Same pill style as today, but wrapped in the body — no horizontal scroll bar. */
export function CategoryWrappedChips({ selected, onSelect }: CategoryWrappedChipsProps) {
  const chips: Array<ProductCategory | 'all'> = ['all', ...SHOP_CATEGORIES];

  return (
    <View className="rounded-2xl bg-surface p-4">
      <Text className="mb-3 text-base font-bold text-foreground">Quick filters</Text>
      <View className="flex-row flex-wrap gap-2">
        {chips.map((category) => {
          const isSelected = selected === category;
          const label = category === 'all' ? 'All items' : getCategoryLabel(category);

          return (
            <Pressable
              key={category}
              onPress={() => onSelect(category)}
              className={cn(
                'rounded-full border px-4 py-2.5',
                isSelected ? 'border-primary bg-primary' : 'border-border bg-background',
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
      </View>
    </View>
  );
}
