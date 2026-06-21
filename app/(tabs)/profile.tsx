import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProfileMenuItem } from '@/components/ProfileMenuItem';
import { SHOP_NAME, SHOP_WHATSAPP_NUMBER } from '@/constants/config';
import { useAuth } from '@/context/AuthContext';
import { isPasswordAuth, isPhoneOnlyAuth } from '@/lib/env';
import { formatPhoneDisplay } from '@/services/auth';
import { openWhatsApp } from '@/services/whatsapp';
import { confirmAction } from '@/utils/confirm';

export default function ProfileScreen() {
  const { user, isAuthenticated, logout, updateProfile } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <View className="flex-1 bg-background">
        <View className="items-center bg-primary px-6 pb-8 pt-6">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-white/20">
            <Ionicons name="person-outline" size={40} color="#FFFFFF" />
          </View>
          <Text className="text-xl font-bold text-white">Your GT Mart account</Text>
          <Text className="mt-2 text-center text-sm text-primary-light">
            {isPasswordAuth()
              ? 'Sign up or log in to save your address and track orders.'
              : 'Login with your mobile number to save details and track orders faster.'}
          </Text>
        </View>

        <View className="p-4">
          {isPasswordAuth() ? (
            <>
              <Button label="Sign up" onPress={() => router.push('/signup')} />
              <Button
                label="Log in"
                variant="outline"
                className="mt-3"
                onPress={() => router.push('/login')}
              />
            </>
          ) : (
            <Button label="Login with mobile number" onPress={() => router.push('/login')} />
          )}
          <Button
            label="Preview category layouts"
            variant="secondary"
            onPress={() => router.push('/category-designs')}
            className="mt-3"
          />
          <Text className="mt-4 text-center text-sm text-muted">
            You can still browse and checkout as a guest without logging in.
          </Text>
        </View>
      </View>
    );
  }

  const handleLogout = async () => {
    const confirmed = await confirmAction(
      'Log out?',
      isPhoneOnlyAuth()
        ? 'You will need your mobile number to sign in again. Your cart stays saved.'
        : isPasswordAuth()
          ? 'You will need your password to sign in again. Your cart stays saved.'
          : 'You will need OTP to sign in again. Your cart stays saved.',
      'Log out',
    );

    if (!confirmed) return;

    setLoggingOut(true);
    try {
      await logout();
    } catch {
      Alert.alert('Log out failed', 'Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSupport = async () => {
    await openWhatsApp(
      SHOP_WHATSAPP_NUMBER,
      `Hi ${SHOP_NAME}, I need help with my account or order.`,
    );
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-8">
      <View className="items-center bg-primary px-6 pb-6 pt-4">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-white/20">
          <Text className="text-3xl font-bold text-white">
            {user.name?.trim()?.charAt(0)?.toUpperCase() ?? 'G'}
          </Text>
        </View>
        <Text className="text-xl font-bold text-white">
          {user.name?.trim() || 'GT Mart customer'}
        </Text>
        <Text className="mt-1 text-sm text-primary-light">
          {formatPhoneDisplay(user.phone)}
        </Text>
      </View>

      <View className="mx-4 mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        <ProfileMenuItem
          icon="person-outline"
          label="Edit profile"
          subtitle="Name and default delivery address"
          onPress={() => router.push('/edit-profile')}
        />
        <ProfileMenuItem
          icon="receipt-outline"
          label="My orders"
          subtitle="View order history and status"
          onPress={() => router.push('/orders')}
        />
        <ProfileMenuItem
          icon="logo-whatsapp"
          label="WhatsApp updates"
          subtitle="Order and delivery notifications"
          showChevron={false}
          rightElement={
            <Switch
              value={user.whatsappUpdatesEnabled}
              onValueChange={(value) => updateProfile({ whatsappUpdatesEnabled: value })}
              trackColor={{ false: '#E2E8E5', true: '#1B7A4E' }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <ProfileMenuItem
          icon="location-outline"
          label="Default address"
          subtitle={user.addressLine?.trim() || 'Add address for faster checkout'}
          onPress={() => router.push('/edit-profile')}
        />
        <ProfileMenuItem
          icon="grid-outline"
          label="Category layout previews"
          subtitle="Compare Amazon-style home screen options"
          onPress={() => router.push('/category-designs')}
        />
        <ProfileMenuItem
          icon="help-circle-outline"
          label="Help & support"
          subtitle={`Chat with ${SHOP_NAME} on WhatsApp`}
          onPress={handleSupport}
        />
        <ProfileMenuItem
          icon="log-out-outline"
          label={loggingOut ? 'Logging out…' : 'Log out'}
          subtitle="End session on this device"
          onPress={loggingOut ? undefined : handleLogout}
          destructive
          showChevron={false}
        />
      </View>
    </ScrollView>
  );
}
