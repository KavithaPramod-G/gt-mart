import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '@/constants/theme';
import { CartProvider } from '@/context/CartContext';
import { OrderProvider } from '@/context/OrderContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <CartProvider>
        <OrderProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: '#FFFFFF',
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="checkout"
              options={{ title: 'Checkout', presentation: 'modal' }}
            />
            <Stack.Screen
              name="order/[id]"
              options={{ title: 'Order Details' }}
            />
          </Stack>
        </OrderProvider>
      </CartProvider>
    </GestureHandlerRootView>
  );
}
