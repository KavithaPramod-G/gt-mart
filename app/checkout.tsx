import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import {
  CURRENCY,
  DELIVERY_FEE,
  MIN_ORDER_AMOUNT,
  SHOP_NAME,
} from '@/constants/config';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrderContext';
import { DeliveryAddress } from '@/types';

export default function CheckoutScreen() {
  const { items, subtotal, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<DeliveryAddress>({
    name: '',
    phone: '',
    addressLine: '',
    landmark: '',
  });

  const total = subtotal + DELIVERY_FEE;
  const isValid =
    form.name.trim().length > 0 &&
    form.phone.trim().length >= 10 &&
    form.addressLine.trim().length > 5 &&
    subtotal >= MIN_ORDER_AMOUNT;

  const updateField = (field: keyof DeliveryAddress, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePlaceOrder = async () => {
    if (!isValid) return;

    setLoading(true);
    try {
      const order = await placeOrder(items, {
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        addressLine: form.addressLine.trim(),
        landmark: form.landmark?.trim(),
      });

      clearCart();
      router.replace(`/order/${order.id}`);
    } catch {
      Alert.alert('Order failed', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="p-4 pb-8">
        <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-4 text-base font-bold text-foreground">Delivery details</Text>
          <TextInput
            placeholder="Full name"
            value={form.name}
            onChangeText={(value) => updateField('name', value)}
            className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
          <TextInput
            placeholder="WhatsApp / phone number"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(value) => updateField('phone', value)}
            className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
          <TextInput
            placeholder="Delivery address"
            value={form.addressLine}
            onChangeText={(value) => updateField('addressLine', value)}
            className="mb-2 min-h-20 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
            multiline
            textAlignVertical="top"
          />
          <TextInput
            placeholder="Landmark (optional)"
            value={form.landmark}
            onChangeText={(value) => updateField('landmark', value)}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
        </View>

        <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-4 text-base font-bold text-foreground">Payment</Text>
          <View className="rounded-xl bg-primary-light p-4">
            <Text className="mb-1 text-[15px] font-bold text-primary">Cash on Delivery</Text>
            <Text className="text-sm leading-5 text-muted">
              Pay {CURRENCY}
              {total} when your order arrives.
            </Text>
          </View>
        </View>

        <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-4 text-base font-bold text-foreground">Order summary</Text>
          {items.map((item) => (
            <View key={item.product.id} className="mb-2 flex-row justify-between">
              <Text className="flex-1 pr-2 text-muted">
                {item.product.name} x{item.quantity}
              </Text>
              <Text className="font-semibold text-foreground">
                {CURRENCY}
                {item.product.price * item.quantity}
              </Text>
            </View>
          ))}
          <View className="mb-2 flex-row justify-between">
            <Text className="text-muted">Delivery</Text>
            <Text className="font-semibold text-foreground">
              {CURRENCY}
              {DELIVERY_FEE}
            </Text>
          </View>
          <View className="mt-1 flex-row justify-between border-t border-border pt-2">
            <Text className="text-base font-bold text-foreground">Total</Text>
            <Text className="text-lg font-extrabold text-primary">
              {CURRENCY}
              {total}
            </Text>
          </View>
        </View>

        <View className="rounded-xl border border-[#B8E6C8] bg-[#E8F8EE] p-4">
          <Text className="text-sm leading-5 text-muted">
            After placing your order, WhatsApp opens with your order number and
            details sent to {SHOP_NAME}. Delivery updates are also shared on
            WhatsApp.
          </Text>
        </View>
      </ScrollView>

      <View className="border-t border-border bg-surface p-4">
        <Button
          label={`Place Order · ${CURRENCY}${total}`}
          loading={loading}
          disabled={!isValid}
          onPress={handlePlaceOrder}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
