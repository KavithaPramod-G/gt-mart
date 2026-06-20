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

import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { isOtpDevMode, isPhoneOnlyAuth } from '@/lib/env';
import { formatPhoneDisplay, isValidIndianMobile } from '@/services/auth';

type LoginStep = 'phone' | 'otp';

const OTP_RESEND_SECONDS = 60;
const phoneOnlyAuth = isPhoneOnlyAuth();

export default function LoginScreen() {
  const { sendOtp, verifyOtp, loginWithPhone } = useAuth();
  const [step, setStep] = useState<LoginStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = setInterval(() => {
      setResendSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendSeconds]);

  const handlePhoneOnlyLogin = async () => {
    if (!isValidIndianMobile(phone)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
    try {
      const result = await loginWithPhone(phone);
      if (result.success) {
        router.replace('/profile');
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
        setDevOtpHint(result.devOtp ?? null);
        setResendSeconds(OTP_RESEND_SECONDS);
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
        router.replace('/profile');
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
            {phoneOnlyAuth
              ? 'Enter your mobile number to save details and view order history. We may call to confirm orders.'
              : 'Login with your mobile number. The same number will be used for orders and WhatsApp delivery updates.'}
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
            <Text className="text-sm text-muted">
              {phoneOnlyAuth
                ? 'Your orders are linked to this number. GT Mart will verify orders by phone before delivery.'
                : 'We will send a one-time password (OTP) to verify your number.'}
            </Text>
            <Button
              label={phoneOnlyAuth ? 'Continue' : 'Send OTP'}
              loading={loading}
              className="mt-4"
              onPress={phoneOnlyAuth ? handlePhoneOnlyLogin : handleSendOtp}
            />
          </View>
        ) : (
          <View className="rounded-2xl border border-border bg-surface p-4">
            <Text className="mb-1 text-base font-bold text-foreground">Enter OTP</Text>
            <Text className="mb-4 text-sm text-muted">
              Sent to {formatPhoneDisplay(phone)}
            </Text>
            <TextInput
              placeholder="6-digit OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              maxLength={6}
              className="mb-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[15px] text-foreground"
            />
            {isOtpDevMode() && devOtpHint ? (
              <Text className="text-sm text-muted">Dev OTP: {devOtpHint}</Text>
            ) : (
              <Text className="text-sm text-muted">OTP expires in 5 minutes.</Text>
            )}
            <Button
              label="Verify & Login"
              loading={loading}
              className="mt-4"
              onPress={handleVerifyOtp}
            />
            <Button
              label={
                resendSeconds > 0 ? `Resend OTP (${resendSeconds}s)` : 'Resend OTP'
              }
              variant="outline"
              className="mt-2"
              disabled={resendSeconds > 0 || loading}
              onPress={handleSendOtp}
            />
            <Button
              label="Change number"
              variant="outline"
              className="mt-2"
              onPress={() => {
                setStep('phone');
                setOtp('');
                setDevOtpHint(null);
                setResendSeconds(0);
              }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
