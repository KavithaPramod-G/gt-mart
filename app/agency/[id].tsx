import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { StackBackButton } from '@/components/StackBackButton';
import { CURRENCY } from '@/constants/config';
import { useAuth } from '@/context/AuthContext';
import { normalizePhone } from '@/services/auth';
import {
  fetchAgencyCatalog,
  placeAgencyOrder,
  ShopAgencyItem,
} from '@/services/api/agenciesApi';

export default function AgencyOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [items, setItems] = useState<ShopAgencyItem[] | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchAgencyCatalog(id).then((catalog) => {
      if (active) setItems(catalog ?? []);
    });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (user?.name) setName((current) => current || user.name);
    if (user?.phone) setPhone((current) => current || user.phone);
  }, [user?.name, user?.phone]);

  const total = useMemo(() => {
    if (!items) return 0;
    return items.reduce((sum, item) => {
      return (
        sum +
        item.measures.reduce((lineSum, measure) => {
          const quantity = quantities[measure.id] ?? 0;
          return lineSum + measure.price * quantity;
        }, 0)
      );
    }, 0);
  }, [items, quantities]);

  const setQuantity = (measureId: string, next: number, maxQuantity: number | null) => {
    const cap = maxQuantity ?? 999;
    const quantity = Math.max(0, Math.min(cap, next));
    setQuantities((current) => ({ ...current, [measureId]: quantity }));
  };

  const submit = async () => {
    if (!id || !items) return;
    const lines = items.flatMap((item) =>
      item.measures
        .filter((measure) => (quantities[measure.id] ?? 0) > 0)
        .map((measure) => ({ measureId: measure.id, quantity: quantities[measure.id] })),
    );
    if (lines.length === 0) {
      setError('Choose a size and a quantity.');
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await placeAgencyOrder({
      categoryId: id,
      customerName: name,
      customerPhone: normalizePhone(phone),
      note,
      lines,
    });
    setSubmitting(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setOrderNumber(result.orderNumber);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Bulk order',
          headerLeft: () => <StackBackButton accessibilityLabel="Back to agencies" />,
        }}
      />
      {items == null ? (
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator color="#1B7A4E" />
        </View>
      ) : orderNumber ? (
        <View className="flex-1 items-center justify-center bg-background p-8">
          <Text className="text-xl font-bold text-foreground">Order placed</Text>
          <Text className="mt-2 text-base text-muted">{orderNumber}</Text>
          <Text className="mt-1 text-base font-semibold text-primary">
            {CURRENCY}
            {total.toFixed(2)}
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Customer name"
            placeholderTextColor="#5C6B63"
            className="mb-2 rounded-xl border border-border bg-surface px-3 py-3 text-foreground"
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone"
            placeholderTextColor="#5C6B63"
            keyboardType="phone-pad"
            className="mb-2 rounded-xl border border-border bg-surface px-3 py-3 text-foreground"
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Note (optional)"
            placeholderTextColor="#5C6B63"
            className="mb-4 rounded-xl border border-border bg-surface px-3 py-3 text-foreground"
          />

          {items.length === 0 ? (
            <Text className="text-sm text-muted">This agency has no bulk items yet.</Text>
          ) : (
            items.map((item) => (
              <View key={item.id} className="mb-3 rounded-2xl border border-border bg-surface p-4">
                <Text className="mb-2 text-base font-bold text-foreground">{item.name}</Text>
                {item.measures.map((measure) => {
                  const quantity = quantities[measure.id] ?? 0;
                  return (
                    <View key={measure.id} className="mb-2 flex-row items-center justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-semibold text-foreground">{measure.label}</Text>
                        <Text className="text-xs text-muted">
                          {CURRENCY}
                          {measure.price} each
                        </Text>
                      </View>
                      <View className="flex-row items-center overflow-hidden rounded-lg bg-primary-light">
                        <Pressable
                          onPress={() => setQuantity(measure.id, quantity - 1, measure.maxQuantity)}
                          className="h-8 w-8 items-center justify-center"
                        >
                          <Text className="text-base font-bold text-primary">−</Text>
                        </Pressable>
                        <Text className="min-w-6 text-center font-bold text-foreground">{quantity}</Text>
                        <Pressable
                          onPress={() => setQuantity(measure.id, quantity + 1, measure.maxQuantity)}
                          className="h-8 w-8 items-center justify-center"
                        >
                          <Text className="text-base font-bold text-primary">+</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}

          {error ? <Text className="mb-3 text-sm text-error">{error}</Text> : null}
          <Pressable
            onPress={submit}
            disabled={submitting || total <= 0}
            className="items-center rounded-xl bg-primary px-4 py-3"
          >
            <Text className="font-bold text-white">
              {submitting ? 'Placing…' : `Place order · ${CURRENCY}${total.toFixed(2)}`}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </>
  );
}
