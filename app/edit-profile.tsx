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
import { useAuth } from '@/context/AuthContext';
import { formatPhoneDisplay } from '@/services/auth';

export default function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [addressLine, setAddressLine] = useState(user?.addressLine ?? '');
  const [landmark, setLandmark] = useState(user?.landmark ?? '');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-8">
        <Text className="mb-4 text-muted">Please login to edit your profile.</Text>
        <Button label="Login" onPress={() => router.replace('/login')} />
      </View>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        name,
        addressLine,
        landmark,
      });
      Alert.alert('Saved', 'Your profile has been updated.');
      router.back();
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
          <Text className="mb-4 text-base font-bold text-foreground">Account</Text>
          <Text className="mb-1 text-sm text-muted">Mobile number</Text>
          <Text className="text-base font-semibold text-foreground">
            {formatPhoneDisplay(user.phone)}
          </Text>
          <Text className="mt-2 text-xs text-muted">
            Login number cannot be changed here. It is used for orders and WhatsApp updates.
          </Text>
        </View>

        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-4 text-base font-bold text-foreground">Personal details</Text>
          <TextInput
            placeholder="Full name"
            value={name}
            onChangeText={setName}
            className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
          <TextInput
            placeholder="Default delivery address"
            value={addressLine}
            onChangeText={setAddressLine}
            className="mb-2 min-h-20 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
            multiline
            textAlignVertical="top"
          />
          <TextInput
            placeholder="Landmark (optional)"
            value={landmark}
            onChangeText={setLandmark}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
        </View>

        <Button label="Save changes" loading={loading} className="mt-4" onPress={handleSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
