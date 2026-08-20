import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { CartDock, useCartDockInset } from '@/components/CartDock';
import { DiscountDealsSection } from '@/components/DiscountDealsSection';
import { StackBackButton } from '@/components/StackBackButton';

export default function DealsScreen() {
  const cartDockInset = useCartDockInset();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Today's deals",
          headerLeft: () => (
            <StackBackButton fallbackHref="/(tabs)" accessibilityLabel="Back to shop" />
          ),
        }}
      />

      <View className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: cartDockInset + 24 }}
        >
          <DiscountDealsSection />
        </ScrollView>
        <CartDock />
      </View>
    </>
  );
}
