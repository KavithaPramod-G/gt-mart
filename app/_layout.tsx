import '@/lib/polyfills';
import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { OrderProvider } from '@/context/OrderContext';
import { CategoriesProvider } from '@/context/CategoriesContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <CategoriesProvider>
        <AuthProvider>
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
                  name="login"
                  options={{ title: 'Login', presentation: 'modal' }}
                />
                <Stack.Screen
                  name="signup"
                  options={{ title: 'Sign Up', presentation: 'modal' }}
                />
                <Stack.Screen
                  name="forgot-password"
                  options={{ title: 'Forgot Password', presentation: 'modal' }}
                />
                <Stack.Screen
                  name="edit-profile"
                  options={{ title: 'Edit Profile' }}
                />
                <Stack.Screen
                  name="checkout"
                  options={{ title: 'Checkout', presentation: 'modal' }}
                />
                <Stack.Screen
                  name="order/[id]"
                  options={{ title: 'Order Details' }}
                />
                <Stack.Screen
                  name="category/[id]"
                  options={{ title: 'Products' }}
                />
              </Stack>
            </OrderProvider>
          </CartProvider>
        </AuthProvider>
      </CategoriesProvider>
    </GestureHandlerRootView>
  );
}
