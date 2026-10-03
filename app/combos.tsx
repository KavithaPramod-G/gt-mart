import { Stack, router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CartDock, useCartDockInset } from '@/components/CartDock';
import { StackBackButton } from '@/components/StackBackButton';
import { CURRENCY } from '@/constants/config';
import { useCombos } from '@/context/CombosContext';

export default function CombosScreen() {
  const { combos, isLoading } = useCombos();
  const cartDockInset = useCartDockInset();

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: 'Festival combos',
          headerLeft: () => (
            <StackBackButton fallbackHref="/(tabs)" accessibilityLabel="Back to shop" />
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: cartDockInset + 24 }}>
        {isLoading ? (
          <Text className="text-[15px] text-muted">Loading combos…</Text>
        ) : combos.length === 0 ? (
          <Text className="text-[15px] text-muted">No festival combos right now.</Text>
        ) : (
          combos.map((combo) => (
            <Pressable
              key={combo.id}
              onPress={() =>
                router.push({ pathname: '/combo/[id]', params: { id: combo.id } })
              }
              className="mb-3 rounded-2xl border border-border bg-surface p-4 active:opacity-90"
            >
              <Text className="text-base font-bold text-foreground">
                {combo.emoji} {combo.title}
              </Text>
              {combo.subtitle ? (
                <Text className="mt-1 text-[13px] text-muted">{combo.subtitle}</Text>
              ) : null}
              <Text className="mt-1 text-[13px] text-muted">
                {combo.items.length} items{combo.eventTag ? ` · ${combo.eventTag}` : ''}
              </Text>
              <View className="mt-2 flex-row items-center">
                {combo.regularTotal > combo.comboPrice ? (
                  <Text className="mr-2 text-[13px] text-muted line-through">
                    {CURRENCY}
                    {combo.regularTotal}
                  </Text>
                ) : null}
                <Text className="text-lg font-extrabold text-primary">
                  {CURRENCY}
                  {combo.comboPrice}
                </Text>
                {combo.saveAmount > 0 ? (
                  <Text className="ml-2 text-[13px] font-semibold text-primary">
                    Save {CURRENCY}
                    {combo.saveAmount}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
      <CartDock />
    </View>
  );
}
