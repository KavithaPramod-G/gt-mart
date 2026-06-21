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
import { isPasswordAuth, isPhoneOnlyAuth } from '@/lib/env';
import { isValidIndianMobile, isValidPassword } from '@/services/auth';

const passwordAuth = isPasswordAuth();
const phoneOnlyAuth = isPhoneOnlyAuth();

export default function LoginScreen() {
  const { loginWithPassword } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

  const handlePasswordLogin = async () => {
    setErrorMessage(null);
    setNeedsPasswordSetup(false);

    if (!isValidIndianMobile(phone)) {
      setErrorMessage('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!isValidPassword(password)) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithPassword(phone, password);
      if (result.success) {
        router.replace('/');
      } else {
        setErrorMessage(result.message);
        setNeedsPasswordSetup(Boolean(result.needsPasswordSetup));
        Alert.alert('Login failed', result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!passwordAuth) {
    return <LegacyLoginScreen />;
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="flex-grow p-4 pb-8">
        <View className="mb-6 rounded-2xl bg-primary p-6">
          <Text className="text-2xl font-extrabold text-white">Welcome back</Text>
          <Text className="mt-2 text-sm leading-5 text-primary-light">
            Log in with your mobile number and password to track orders and save your
            delivery details.
          </Text>
        </View>

        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-4 text-base font-bold text-foreground">Log in</Text>
          <TextInput
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={13}
            className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />
          <TextInput
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setErrorMessage(null);
              setNeedsPasswordSetup(false);
            }}
            className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
          />

          {errorMessage ? (
            <View className="mt-2 rounded-xl border border-[#F5C2C7] bg-[#FDECEC] p-3">
              <Text className="text-sm leading-5 text-[#B42318]">{errorMessage}</Text>
              {needsPasswordSetup ? (
                <Pressable className="mt-2" onPress={() => router.push('/forgot-password')}>
                  <Text className="text-sm font-semibold text-primary">Set password now</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Button
            label="Log in"
            loading={loading}
            className="mt-4"
            onPress={handlePasswordLogin}
          />
          <Pressable className="mt-3" onPress={() => router.push('/forgot-password')}>
            <Text className="text-center text-sm font-semibold text-primary">
              Forgot password?
            </Text>
          </Pressable>
          <Pressable className="mt-4" onPress={() => router.push('/signup')}>
            <Text className="text-center text-sm text-muted">
              New to GT Mart?{' '}
              <Text className="font-semibold text-primary">Create an account</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LegacyLoginScreen() {
  const { sendOtp, verifyOtp, loginWithPhone } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneOnlyLogin = async () => {
    if (!isValidIndianMobile(phone)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithPhone(phone);
      if (result.success) {
        router.replace('/');
      } else {
        Alert.alert('Could not log in', result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!isValidIndianMobile(phone)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const result = await sendOtp(phone);
      if (result.success) {
        setStep('otp');
        setOtp('');
        Alert.alert('OTP sent', result.message);
      } else {
        Alert.alert('Could not send OTP', result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOtp(phone, otp);
      if (result.success) {
        router.replace('/');
      } else {
        Alert.alert('Verification failed', result.message);
      }
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
          <Text className="text-2xl font-extrabold text-white">Welcome to GT Mart</Text>
          <Text className="mt-2 text-sm leading-5 text-primary-light">
            Login with your mobile number for orders and WhatsApp delivery updates.
          </Text>
        </View>

        {phoneOnlyAuth || step === 'phone' ? (
          <View className="rounded-2xl border border-border bg-surface p-4">
            <Text className="mb-4 text-base font-bold text-foreground">Mobile number</Text>
            <TextInput
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={13}
              className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
            />
            <Button
              label={phoneOnlyAuth ? 'Continue' : 'Send OTP'}
              loading={loading}
              className="mt-4"
              onPress={phoneOnlyAuth ? handlePhoneOnlyLogin : handleSendOtp}
            />
          </View>
        ) : (
          <View className="rounded-2xl border border-border bg-surface p-4">
            <Text className="mb-4 text-base font-bold text-foreground">Enter OTP</Text>
            <TextInput
              placeholder="6-digit OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
              className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
            />
            <Button
              label="Verify & Login"
              loading={loading}
              className="mt-4"
              onPress={handleVerifyOtp}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
