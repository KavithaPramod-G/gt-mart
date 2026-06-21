import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { isValidIndianMobile, isValidPassword } from '@/services/auth';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleResetPassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isValidIndianMobile(phone)) {
      setErrorMessage('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!isValidPassword(password)) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(phone, password);
      if (result.success) {
        setSuccessMessage(result.message);
        router.replace('/');
        return;
      }

      setErrorMessage(result.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="flex-grow p-4 pb-8">
        <View className="mb-6 rounded-2xl bg-primary p-6">
          <Text className="text-2xl font-extrabold text-white">Forgot password</Text>
          <Text className="mt-2 text-sm leading-5 text-primary-light">
            Enter your registered mobile number and choose a new password. If you signed
            up before without a password, this will create one for your account.
          </Text>
        </View>

        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-4 text-base font-bold text-foreground">Reset password</Text>
          <TextInput
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            maxLength={13}
            className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
          <TextInput
            placeholder="New password (min 6 characters)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
          <TextInput
            placeholder="Confirm new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />

          {successMessage ? (
            <View className="mt-2 rounded-xl border border-[#B8E6C8] bg-[#E8F8EE] p-3">
              <Text className="text-sm leading-5 text-primary">{successMessage}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View className="mt-2 rounded-xl border border-[#F5C2C7] bg-[#FDECEC] p-3">
              <Text className="text-sm leading-5 text-[#B42318]">{errorMessage}</Text>
            </View>
          ) : null}

          <Button
            label="Save password"
            loading={loading}
            className="mt-4"
            onPress={handleResetPassword}
          />
          <Pressable className="mt-4" onPress={() => router.replace('/login')}>
            <Text className="text-center text-sm text-muted">
              Back to{' '}
              <Text className="font-semibold text-primary">Log in</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
