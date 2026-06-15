import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import {
  CATEGORY_META,
  getCategoryLabel,
  SHOP_CATEGORIES,
} from '@/constants/categoryMeta';
import { ProductCategory } from '@/types';
import { cn } from '@/utils/cn';

interface CategoryListRowsProps {
  selected: ProductCategory | null;
  onSelect: (category: ProductCategory) => void;
  counts: Partial<Record<ProductCategory, number>>;
}

/** Amazon department list — tappable rows with chevron, no horizontal scroll. */
export function CategoryListRows({ selected, onSelect, counts }: CategoryListRowsProps) {
  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-surface">
      <View className="border-b border-border px-4 py-3">
        <Text className="text-base font-bold text-foreground">Shop groceries</Text>
        <Text className="text-xs text-muted">Tap a department to see products</Text>
      </View>
      {SHOP_CATEGORIES.map((category, index) => {
        const meta = CATEGORY_META[category];
        const isSelected = selected === category;
        const count = counts[category] ?? 0;

        return (
          <Pressable
            key={category}
            onPress={() => onSelect(category)}
            className={cn(
              'flex-row items-center px-4 py-3.5 active:bg-background',
              index < SHOP_CATEGORIES.length - 1 && 'border-b border-border',
              isSelected && 'bg-primary-light',
            )}
          >
            <View
              className="mr-3 h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: meta.tint }}
            >
              <Text className="text-xl">{meta.emoji}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-foreground">
                {getCategoryLabel(category)}
              </Text>
              <Text className="text-xs text-muted">
                {meta.blurb} · {count} items
              </Text>
            </View>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
              size={20}
              color={isSelected ? '#1B7A4E' : '#5C6B63'}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
