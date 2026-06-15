import { Pressable, Text, View } from 'react-native';

import {
  CATEGORY_META,
  getCategoryLabel,
  SHOP_CATEGORIES,
} from '@/constants/categoryMeta';
import { ProductCategory } from '@/types';
import { cn } from '@/utils/cn';

interface CategoryGridAmazonProps {
  selected: ProductCategory | null;
  onSelect: (category: ProductCategory) => void;
  counts: Partial<Record<ProductCategory, number>>;
}

/** Amazon-style 3-column icon grid — categories sit in the middle of the screen. */
export function CategoryGridAmazon({ selected, onSelect, counts }: CategoryGridAmazonProps) {
  return (
    <View className="rounded-2xl bg-surface p-4">
      <Text className="mb-3 text-base font-bold text-foreground">Shop by category</Text>
      <View className="flex-row flex-wrap">
        {SHOP_CATEGORIES.map((category) => {
          const meta = CATEGORY_META[category];
          const isSelected = selected === category;
          const count = counts[category] ?? 0;

          return (
            <Pressable
              key={category}
              onPress={() => onSelect(category)}
              className="mb-3 w-1/3 items-center px-1"
            >
              <View
                className={cn(
                  'mb-2 h-[72px] w-[72px] items-center justify-center rounded-2xl border-2',
                  isSelected ? 'border-primary bg-primary-light' : 'border-transparent',
                )}
                style={{ backgroundColor: isSelected ? undefined : meta.tint }}
              >
                <Text className="text-[32px]">{meta.emoji}</Text>
              </View>
              <Text
                className={cn(
                  'text-center text-xs font-semibold',
                  isSelected ? 'text-primary' : 'text-foreground',
                )}
                numberOfLines={1}
              >
                {getCategoryLabel(category)}
              </Text>
              <Text className="text-[10px] text-muted">{count} items</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
