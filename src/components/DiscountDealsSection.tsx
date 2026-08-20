import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { useDiscountDeals } from '@/hooks/useDiscountDeals';

const SECTION_PADDING = 16;
const CARD_WIDTH = 148;
const CARD_GAP = 12;

export function DiscountDealsSection() {
  const { sections, isLoading } = useDiscountDeals();

  if (isLoading) {
    return (
      <View className="items-center py-6">
        <ActivityIndicator color="#1B7A4E" />
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View className="items-center px-6 py-10">
        <Text className="text-base font-semibold text-foreground">No discounted items right now</Text>
        <Text className="mt-2 text-center text-sm text-muted">
          Products with MRP above selling price will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View className="pb-2 pt-2">
      {sections.map(({ bucket, products }) => (
        <View key={bucket.id} className="mb-5">
          <View className="mb-3" style={{ paddingHorizontal: SECTION_PADDING }}>
            <Text className="text-[17px] font-extrabold text-foreground">{bucket.label}</Text>
            <View className="mt-1.5 h-1 w-14 rounded-full bg-accent" />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: SECTION_PADDING,
              gap: CARD_GAP,
            }}
          >
            {products.map((product) => (
              <View key={product.id} style={{ width: CARD_WIDTH }}>
                <ProductCard product={product} />
              </View>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}
