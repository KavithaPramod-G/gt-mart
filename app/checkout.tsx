import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import {
  CURRENCY,
  DELIVERY_FEE,
  MIN_ORDER_AMOUNT,
  SHOP_NAME,
} from '@/constants/config';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/context/OrderContext';
import { formatPhoneDisplay } from '@/services/auth';
import { DeliveryAddress } from '@/types';
import { cn } from '@/utils/cn';

function fieldBorderClass(hasError: boolean, multiline = false) {
  return cn(
    'rounded-xl border bg-background px-4 text-[15px] text-foreground',
    multiline ? 'min-h-20 py-3' : 'min-h-[48px] py-3',
    hasError ? 'border-2 border-error' : 'border border-border',
  );
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { items, subtotal, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showFieldErrors, setShowFieldErrors] = useState(false);
  const [form, setForm] = useState<DeliveryAddress>({
    name: '',
    phone: '',
    addressLine: '',
    landmark: '',
  });

  useEffect(() => {
    if (!user) return;

    const localPhone =
      user.phone.length > 10 ? user.phone.slice(-10) : user.phone;

    setForm((current) => ({
      name: current.name || user.name || '',
      phone: current.phone || localPhone,
      addressLine: current.addressLine || user.addressLine || '',
      landmark: current.landmark || user.landmark || '',
    }));
  }, [user]);

  const total = subtotal + DELIVERY_FEE;
  const meetsMinimum = subtotal >= MIN_ORDER_AMOUNT;
  const isValid =
    form.name.trim().length > 0 &&
    form.phone.trim().length >= 10 &&
    form.addressLine.trim().length > 5 &&
    subtotal >= MIN_ORDER_AMOUNT;

  const nameEmpty = form.name.trim().length === 0;
  const phoneEmpty = form.phone.trim().length === 0;
  const addressEmpty = form.addressLine.trim().length === 0;

  const showNameError = showFieldErrors && nameEmpty;
  const showPhoneError = showFieldErrors && phoneEmpty;
  const showAddressError = showFieldErrors && addressEmpty;

  const updateField = (field: keyof DeliveryAddress, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePlaceOrder = async () => {
    if (subtotal < MIN_ORDER_AMOUNT) {
      return;
    }

    if (!isValid) {
      setShowFieldErrors(true);
      return;
    }

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
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      >
        {isAuthenticated && user ? (
          <View className="mb-4 rounded-xl border border-[#B8E6C8] bg-[#E8F8EE] p-4">
            <Text className="text-sm font-semibold text-primary">Logged in</Text>
            <Text className="mt-1 text-sm text-muted">
              Using {formatPhoneDisplay(user.phone)} for this order and WhatsApp updates.
            </Text>
          </View>
        ) : (
          <View className="mb-4 rounded-xl border border-border bg-surface p-4">
            <Text className="text-sm text-muted">
              Guest checkout — or{' '}
              <Text
                className="font-semibold text-primary"
                onPress={() => router.push('/login')}
              >
                login with mobile
              </Text>{' '}
              to save your details.
            </Text>
          </View>
        )}

        <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-4 text-base font-bold text-foreground">Delivery details</Text>
          <TextInput
            placeholder="Full name"
            value={form.name}
            onChangeText={(value) => updateField('name', value)}
            className={cn('mb-2', fieldBorderClass(showNameError))}
            textAlignVertical="center"
          />
          <TextInput
            placeholder="WhatsApp / phone number"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(value) => updateField('phone', value)}
            className={cn('mb-2', fieldBorderClass(showPhoneError))}
            textAlignVertical="center"
          />
          <TextInput
            placeholder="Delivery address"
            value={form.addressLine}
            onChangeText={(value) => updateField('addressLine', value)}
            className={cn('mb-2', fieldBorderClass(showAddressError, true))}
            multiline
            textAlignVertical="top"
          />
          <TextInput
            placeholder="Landmark (optional)"
            value={form.landmark}
            onChangeText={(value) => updateField('landmark', value)}
            className={fieldBorderClass(false)}
            textAlignVertical="center"
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

      <View
        className="border-t border-border bg-surface px-4 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Button
          label={`Place Order · ${CURRENCY}${total}`}
          loading={loading}
          disabled={loading || !meetsMinimum}
          onPress={handlePlaceOrder}
        />
        {!meetsMinimum ? (
          <Text className="mt-2 text-center text-sm text-error">
            Minimum order is {CURRENCY}
            {MIN_ORDER_AMOUNT}. Add {CURRENCY}
            {MIN_ORDER_AMOUNT - subtotal} more to checkout.
          </Text>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
