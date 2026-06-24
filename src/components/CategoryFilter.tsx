import { Pressable, ScrollView, Text, View } from 'react-native';

import { useCategories } from '@/context/CategoriesContext';
import { cn } from '@/utils/cn';

interface CategoryFilterProps {
  selected: string | 'all';
  onSelect: (category: string | 'all') => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const { categories, getCategoryLabel } = useCategories();
  const chips: Array<string | 'all'> = ['all', ...categories.map((category) => category.id)];

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
        {chips.map((category) => {
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
