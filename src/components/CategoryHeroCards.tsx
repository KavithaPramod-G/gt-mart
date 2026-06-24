import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { CategoryImage } from '@/components/CategoryImage';
import { ALL_PRODUCTS_META } from '@/constants/categoryMeta';
import { useCategories } from '@/context/CategoriesContext';

const GRID_PADDING = 16;
const GRID_GAP = 10;

function getColumnCount(screenWidth: number): number {
  return screenWidth >= 400 ? 4 : 3;
}

function getCardWidth(screenWidth: number, columns: number): number {
  return (screenWidth - GRID_PADDING * 2 - GRID_GAP * (columns - 1)) / columns;
}

function getEmojiFontSize(cardWidth: number): number {
  return Math.round(cardWidth * 0.38);
}

function getLabelFontSize(cardWidth: number): number {
  return Math.max(12, Math.min(14, Math.round(cardWidth * 0.125)));
}

function getBlurbFontSize(cardWidth: number): number {
  return Math.max(10, Math.min(11, Math.round(cardWidth * 0.1)));
}

interface CategoryHeroCardsProps {
  /** Preview/demo mode — tap calls handler instead of navigating. */
  onCategoryPress?: (category: string | 'all') => void;
}

export function CategoryHeroCards({ onCategoryPress }: CategoryHeroCardsProps) {
  const { width } = useWindowDimensions();
  const columns = getColumnCount(width);
  const cardWidth = getCardWidth(width, columns);
  const innerWidth = cardWidth - 20;
  const emojiSize = getEmojiFontSize(cardWidth);
  const labelFontSize = getLabelFontSize(cardWidth);
  const blurbFontSize = getBlurbFontSize(cardWidth);
  const labelLineHeight = Math.round(labelFontSize * 1.3);
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
    <View className="pt-4" style={{ paddingHorizontal: GRID_PADDING }}>
      <Text className="mb-3 text-base font-bold text-foreground">Browse departments</Text>

      <Pressable
        onPress={() => handlePress('all')}
        className="mb-3 overflow-hidden rounded-2xl border-2 border-primary bg-primary-light p-4 active:opacity-90"
      >
        <View className="flex-row items-center">
          <Text style={{ fontSize: 40, lineHeight: 44 }}>{ALL_PRODUCTS_META.emoji}</Text>
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-bold text-foreground">{ALL_PRODUCTS_META.label}</Text>
            <Text className="mt-0.5 text-xs text-muted">{ALL_PRODUCTS_META.blurb}</Text>
          </View>
          <Text className="text-lg text-primary">→</Text>
        </View>
      </Pressable>

      <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
        {categories.map((category) => {
          const meta = getCategoryUi(category.id);
          const hasImage = Boolean(meta.imageUrl?.trim());

          return (
            <Pressable
              key={category.id}
              onPress={() => handlePress(category.id)}
              style={{ width: cardWidth, backgroundColor: meta.tint }}
              className="overflow-hidden rounded-2xl border-2 border-border p-2.5 active:opacity-90"
            >
              {hasImage ? (
                <View
                  className="mb-2 overflow-hidden rounded-xl bg-white/80"
                  style={{ borderWidth: 1, borderColor: `${meta.accent}33` }}
                >
                  <CategoryImage category={meta} size="hero" frameWidth={innerWidth} />
                </View>
              ) : (
                <Text
                  className="mb-1"
                  style={{ fontSize: emojiSize, lineHeight: emojiSize * 1.05 }}
                >
                  {meta.emoji || '🛒'}
                </Text>
              )}

              <Text
                className="font-bold text-foreground"
                style={{ fontSize: labelFontSize, lineHeight: labelLineHeight }}
                numberOfLines={2}
              >
                {getCategoryLabel(category.id)}
              </Text>

              {meta.blurb ? (
                <Text
                  className="mt-0.5 text-muted"
                  style={{ fontSize: blurbFontSize, lineHeight: blurbFontSize * 1.35 }}
                  numberOfLines={1}
                >
                  {meta.blurb}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
