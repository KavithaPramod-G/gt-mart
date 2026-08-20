import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

interface DealsHeroCardProps {
  /** Highest discount in catalog — shown when available (e.g. 50). */
  maxDiscountPercent?: number;
}

export function DealsHeroCard({ maxDiscountPercent = 0 }: DealsHeroCardProps) {
  const subtitle =
    maxDiscountPercent > 0
      ? `Up to ${maxDiscountPercent}% off · Tap to browse all offers`
      : 'Tap to browse discounted items';

  return (
    <Pressable
      onPress={() => router.push('/deals')}
      className="mb-5 overflow-hidden rounded-2xl border-2 border-accent bg-accent/15 p-4 active:opacity-90"
    >
      <View className="flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-accent">
          <Text className="text-2xl">🏷️</Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-bold text-foreground">Today's deals</Text>
          <Text className="mt-0.5 text-xs text-muted">{subtitle}</Text>
        </View>
        {maxDiscountPercent > 0 ? (
          <View className="mr-2 rounded-lg bg-accent px-2 py-1">
            <Text className="text-[11px] font-extrabold text-white">{maxDiscountPercent}%</Text>
          </View>
        ) : null}
        <Text className="text-lg text-accent">→</Text>
      </View>
    </Pressable>
  );
}
