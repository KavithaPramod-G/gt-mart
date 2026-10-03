import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CartDock, useCartDockInset } from '@/components/CartDock';
import { StackBackButton } from '@/components/StackBackButton';
import { CURRENCY } from '@/constants/config';
import { useCart } from '@/context/CartContext';
import { comboCartSnapshot, fetchComboById } from '@/services/api/combosApi';
import { ComboOffer } from '@/types';

export default function ComboDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addCombo } = useCart();
  const cartDockInset = useCartDockInset();
  const [combo, setCombo] = useState<ComboOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    fetchComboById(id)
      .then(setCombo)
      .finally(() => setIsLoading(false));
  }, [id]);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: combo?.title ?? 'Combo',
          headerLeft: () => (
            <StackBackButton fallbackHref="/(tabs)" accessibilityLabel="Back" />
          ),
        }}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1B7A4E" />
        </View>
      ) : !combo ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-semibold text-foreground">Combo not available</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: cartDockInset + 24 }}>
          <View className="mb-4 h-28 items-center justify-center rounded-2xl bg-primary-light">
            <Text className="text-5xl">{combo.emoji}</Text>
          </View>
          {combo.eventTag ? (
            <View className="mb-2 self-start rounded-md bg-primary px-2 py-0.5">
              <Text className="text-[11px] font-bold text-white">{combo.eventTag}</Text>
            </View>
          ) : null}
          {combo.subtitle ? (
            <Text className="mb-3 text-[14px] text-muted">{combo.subtitle}</Text>
          ) : null}

          <Text className="text-base font-bold text-foreground">Included products</Text>
          <Text className="mb-2 mt-1 text-[12px] text-muted">
            Individual sale prices — the discount applies to the whole pack.
          </Text>

          {combo.items.map((item) => (
            <View
              key={item.productId}
              className="flex-row items-center justify-between border-b border-border py-2.5"
            >
              <Text className="flex-1 pr-3 text-[14px] text-foreground">
                {item.name} × {item.quantity}
              </Text>
              <Text className="text-[14px] font-semibold text-foreground">
                {CURRENCY}
                {item.salePrice * item.quantity}
              </Text>
            </View>
          ))}

          <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <View className="mb-1 flex-row justify-between">
              <Text className="text-[14px] text-muted">If bought separately</Text>
              <Text className="text-[14px] text-muted line-through">
                {CURRENCY}
                {combo.regularTotal}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-base font-bold text-foreground">Combo price</Text>
              <Text className="text-lg font-extrabold text-primary">
                {CURRENCY}
                {combo.comboPrice}
              </Text>
            </View>
            {combo.saveAmount > 0 ? (
              <Text className="mt-1 text-[13px] font-semibold text-primary">
                You save {CURRENCY}
                {combo.saveAmount}
              </Text>
            ) : null}
          </View>

          <View className="mt-4">
            <Button
              label={combo.available ? 'Add combo to cart' : 'Unavailable'}
              disabled={!combo.available}
              onPress={() => addCombo(comboCartSnapshot(combo))}
            />
          </View>
          {!combo.available ? (
            <Text className="mt-2 text-center text-[13px] text-error">
              One of the products in this pack is out of stock.
            </Text>
          ) : null}
        </ScrollView>
      )}
      <CartDock />
    </View>
  );
}
