import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEV_MOCK_OTP,
  MIN_PASSWORD_LENGTH,
  MIN_PHONE_LENGTH,
  PHONE_COUNTRY_CODE,
} from '@/constants/config';
import { isSupabaseConfigured } from '@/lib/env';
import { requestOtpFromDb } from '@/services/api/authApi';
import { UserProfile } from '@/types';

const MOCK_PASSWORD_USERS_KEY = '@gt_mart_password_users';

interface MockPasswordUser {
  phone: string;
  password: string;
  profile: UserProfile;
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');

  if (digits.length === MIN_PHONE_LENGTH) {
    return `${PHONE_COUNTRY_CODE}${digits}`;
  }

  if (digits.startsWith(PHONE_COUNTRY_CODE) && digits.length === MIN_PHONE_LENGTH + 2) {
    return digits;
  }

  return digits;
}

export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local =
    digits.startsWith(PHONE_COUNTRY_CODE) && digits.length > MIN_PHONE_LENGTH
      ? digits.slice(PHONE_COUNTRY_CODE.length)
      : digits;

  if (local.length === MIN_PHONE_LENGTH) {
    return `+${PHONE_COUNTRY_CODE} ${local.slice(0, 5)} ${local.slice(5)}`;
  }

  return phone;
}

export function isValidIndianMobile(input: string): boolean {
  const digits = input.replace(/\D/g, '');

  if (digits.length === MIN_PHONE_LENGTH) {
    return /^[6-9]\d{9}$/.test(digits);
  }

  if (digits.length === MIN_PHONE_LENGTH + 2 && digits.startsWith(PHONE_COUNTRY_CODE)) {
    return /^[6-9]\d{9}$/.test(digits.slice(PHONE_COUNTRY_CODE.length));
  }

  return false;
}

export async function sendOtp(phone: string): Promise<{
  success: boolean;
  message: string;
  expiresInSeconds?: number;
  devOtp?: string;
}> {
  if (!isValidIndianMobile(phone)) {
    return { success: false, message: 'Enter a valid 10-digit mobile number.' };
  }

  if (isSupabaseConfigured()) {
    const result = await requestOtpFromDb(phone);
    if (result) {
      return result;
    }
  }

  return {
    success: true,
    message: `OTP sent to ${formatPhoneDisplay(normalizePhone(phone))}. Dev OTP: ${DEV_MOCK_OTP}`,
    devOtp: DEV_MOCK_OTP,
  };
}

export function verifyOtpLocally(otp: string): boolean {
  return otp.trim() === DEV_MOCK_OTP;
}

export function isValidPassword(password: string): boolean {
  return password.trim().length >= MIN_PASSWORD_LENGTH;
}

async function readMockPasswordUsers(): Promise<MockPasswordUser[]> {
  const stored = await AsyncStorage.getItem(MOCK_PASSWORD_USERS_KEY);
  if (!stored) return [];
  return JSON.parse(stored) as MockPasswordUser[];
}

async function writeMockPasswordUsers(users: MockPasswordUser[]): Promise<void> {
  await AsyncStorage.setItem(MOCK_PASSWORD_USERS_KEY, JSON.stringify(users));
}

export async function registerCustomerLocally(
  phone: string,
  password: string,
  name?: string,
): Promise<{
  success: boolean;
  message: string;
  alreadyRegistered?: boolean;
  profile?: UserProfile;
}> {
  if (!isValidIndianMobile(phone)) {
    return { success: false, message: 'Enter a valid 10-digit mobile number.' };
  }

  if (!isValidPassword(password)) {
    return { success: false, message: 'Password must be at least 6 characters.' };
  }

  const normalizedPhone = normalizePhone(phone);
  const users = await readMockPasswordUsers();

  if (users.some((entry) => entry.phone === normalizedPhone)) {
    return {
      success: false,
      alreadyRegistered: true,
      message: 'This mobile number is already registered. Please log in.',
    };
  }

  const profile: UserProfile = {
    phone: normalizedPhone,
    name: name?.trim() ?? '',
    whatsappUpdatesEnabled: true,
    createdAt: new Date().toISOString(),
  };

  users.push({ phone: normalizedPhone, password: password.trim(), profile });
  await writeMockPasswordUsers(users);

  return {
    success: true,
    message: 'Account created successfully.',
    profile,
  };
}

export async function loginCustomerLocally(
  phone: string,
  password: string,
): Promise<{
  success: boolean;
  message: string;
  profile?: UserProfile;
  needsPasswordSetup?: boolean;
}> {
  if (!isValidIndianMobile(phone)) {
    return { success: false, message: 'Invalid mobile number or password.' };
  }

  const normalizedPhone = normalizePhone(phone);
  const users = await readMockPasswordUsers();
  const match = users.find((entry) => entry.phone === normalizedPhone);

  if (!match) {
    return { success: false, message: 'Invalid mobile number or password.' };
  }

  if (!match.password) {
    return {
      success: false,
      needsPasswordSetup: true,
      message: 'This account has no password yet. Use Forgot password to set one.',
    };
  }

  if (match.password !== password.trim()) {
    return { success: false, message: 'Invalid mobile number or password.' };
  }

  return {
    success: true,
    message: 'Logged in successfully.',
    profile: match.profile,
  };
}

export async function resetCustomerPasswordLocally(
  phone: string,
  newPassword: string,
): Promise<{
  success: boolean;
  message: string;
  profile?: UserProfile;
  legacySetup?: boolean;
}> {
  if (!isValidIndianMobile(phone)) {
    return { success: false, message: 'Enter a valid 10-digit mobile number.' };
  }

  if (!isValidPassword(newPassword)) {
    return { success: false, message: 'Password must be at least 6 characters.' };
  }

  const normalizedPhone = normalizePhone(phone);
  const users = await readMockPasswordUsers();
  const index = users.findIndex((entry) => entry.phone === normalizedPhone);

  if (index === -1) {
    return {
      success: false,
      message: 'No account found for this mobile number. Please sign up.',
    };
  }

  const legacySetup = !users[index].password;
  users[index].password = newPassword.trim();
  await writeMockPasswordUsers(users);

  return {
    success: true,
    legacySetup,
    message: legacySetup
      ? 'Password created successfully.'
      : 'Password updated successfully.',
    profile: users[index].profile,
  };
}
