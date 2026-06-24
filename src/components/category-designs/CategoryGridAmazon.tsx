import { Pressable, Text, View } from 'react-native';

import { useCategories } from '@/context/CategoriesContext';
import { cn } from '@/utils/cn';

interface CategoryGridAmazonProps {
  selected: string | null;
  onSelect: (category: string) => void;
  counts: Record<string, number>;
}

/** Amazon-style 3-column icon grid — categories sit in the middle of the screen. */
export function CategoryGridAmazon({ selected, onSelect, counts }: CategoryGridAmazonProps) {
  const { categories, getCategoryLabel, getCategoryUi } = useCategories();

  return (
    <View className="px-1">
      <View className="flex-row flex-wrap">
        {categories.map((category) => {
          const meta = getCategoryUi(category.id);
          const isSelected = selected === category.id;
          const count = counts[category.id];

          return (
            <Pressable
              key={category.id}
              onPress={() => onSelect(category.id)}
              className={cn(
                'mb-3 w-1/3 items-center px-1 active:opacity-90',
                isSelected && 'opacity-100',
              )}
            >
              <View
                className={cn(
                  'mb-1.5 h-[72px] w-[72px] items-center justify-center rounded-2xl border-2',
                  isSelected ? 'border-primary bg-primary-light' : 'border-border bg-surface',
                )}
                style={{ backgroundColor: isSelected ? meta.tint : undefined }}
              >
                <Text className="text-[32px]">{meta.emoji}</Text>
              </View>
              <Text
                className="text-center text-[11px] font-semibold text-foreground"
                numberOfLines={2}
              >
                {getCategoryLabel(category.id)}
              </Text>
              {count ? (
                <Text className="mt-0.5 text-[10px] text-muted">{count} items</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
