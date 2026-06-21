import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
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

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleSignUp = async () => {
    setErrorMessage(null);
    setShowLoginPrompt(false);

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
      const result = await signUp(phone, password, name);
      if (result.success) {
        router.replace('/');
        return;
      }

      setErrorMessage(result.message);

      if (result.alreadyRegistered || /already registered/i.test(result.message)) {
        setShowLoginPrompt(true);
        Alert.alert('Already registered', result.message, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log in', onPress: () => router.replace('/login') },
        ]);
        return;
      }

      Alert.alert('Sign up failed', result.message);
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
          <Text className="text-2xl font-extrabold text-white">Create account</Text>
          <Text className="mt-2 text-sm leading-5 text-primary-light">
            Sign up with your mobile number to save your address and track orders.
          </Text>
        </View>

        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-4 text-base font-bold text-foreground">Sign up</Text>
          <TextInput
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setErrorMessage(null);
              setShowLoginPrompt(false);
            }}
            maxLength={13}
            className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
          <TextInput
            placeholder="Your name (optional)"
            value={name}
            onChangeText={setName}
            className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
          <TextInput
            placeholder="Password (min 6 characters)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
          <TextInput
            placeholder="Confirm password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />

          {errorMessage ? (
            <View className="mt-2 rounded-xl border border-[#F5C2C7] bg-[#FDECEC] p-3">
              <Text className="text-sm leading-5 text-[#B42318]">{errorMessage}</Text>
              {showLoginPrompt ? (
                <Pressable className="mt-2" onPress={() => router.replace('/login')}>
                  <Text className="text-sm font-semibold text-primary">Go to Log in</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Button
            label="Create account"
            loading={loading}
            className="mt-4"
            onPress={handleSignUp}
          />
          <Pressable className="mt-4" onPress={() => router.replace('/login')}>
            <Text className="text-center text-sm text-muted">
              Already have an account?{' '}
              <Text className="font-semibold text-primary">Log in</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
