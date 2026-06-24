import { Pressable, Text, View } from 'react-native';

import { useCategories } from '@/context/CategoriesContext';
import { cn } from '@/utils/cn';

interface CategoryListRowsProps {
  selected: string | null;
  onSelect: (category: string) => void;
  counts: Record<string, number>;
}

export function CategoryListRows({ selected, onSelect, counts }: CategoryListRowsProps) {
  const { categories, getCategoryLabel, getCategoryUi } = useCategories();

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-surface">
      <View className="border-b border-border px-4 py-2">
        <Text className="text-xs font-semibold text-muted">Departments</Text>
        <Text className="text-xs text-muted">Tap a department to see products</Text>
      </View>

      {categories.map((category, index) => {
        const meta = getCategoryUi(category.id);
        const isSelected = selected === category.id;
        const count = counts[category.id];

        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category.id)}
            className={cn(
              'flex-row items-center px-4 py-3 active:bg-primary-light/40',
              isSelected && 'bg-primary-light/60',
              index < categories.length - 1 && 'border-b border-border',
            )}
          >
            <View
              className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: meta.tint }}
            >
              <Text className="text-xl">{meta.emoji}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">
                {getCategoryLabel(category.id)}
              </Text>
              <Text className="text-xs text-muted">{meta.blurb}</Text>
            </View>
            {count ? <Text className="text-xs text-muted">{count}</Text> : null}
            <Text className="ml-2 text-muted">›</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
