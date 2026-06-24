import { Pressable, Text, View } from 'react-native';

import { useCategories } from '@/context/CategoriesContext';
import { cn } from '@/utils/cn';

interface CategoryWrappedChipsProps {
  selected: string | 'all' | null;
  onSelect: (category: string | 'all') => void;
}

export function CategoryWrappedChips({ selected, onSelect }: CategoryWrappedChipsProps) {
  const { categories, getCategoryLabel } = useCategories();
  const chips: Array<string | 'all'> = ['all', ...categories.map((category) => category.id)];

  return (
    <View className="flex-row flex-wrap gap-2">
      {chips.map((category) => {
        const isSelected = selected === category;
        const label = category === 'all' ? 'All' : getCategoryLabel(category);

        return (
          <Pressable
            key={category}
            onPress={() => onSelect(category)}
            className={cn(
              'rounded-full border px-4 py-2',
              isSelected ? 'border-primary bg-primary' : 'border-border bg-surface',
            )}
          >
            <Text
              className={cn('text-sm font-semibold', isSelected ? 'text-white' : 'text-muted')}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
