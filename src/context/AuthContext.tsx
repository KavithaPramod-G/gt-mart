import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { isSupabaseConfigured } from '@/lib/env';
import {
  loginCustomerFromDb,
  loginByPhoneFromDb,
  registerCustomerFromDb,
  resetCustomerPasswordFromDb,
  revokeSessionInDb,
  validateSessionFromDb,
  verifyOtpFromDb,
} from '@/services/api/authApi';
import { syncProfileUpdateToDb } from '@/services/api/profileApi';
import {
  loginCustomerLocally,
  normalizePhone,
  registerCustomerLocally,
  resetCustomerPasswordLocally,
  sendOtp,
  verifyOtpLocally,
} from '@/services/auth';
import { UserProfile, UserProfileUpdate } from '@/types';

const SESSION_STORAGE_KEY = '@gt_mart_session_id';
const USER_STORAGE_KEY = '@gt_mart_user';

interface AuthContextValue {
  user: UserProfile | null;
  sessionId: string | null;
  isLoaded: boolean;
  isAuthenticated: boolean;
  sendOtp: (phone: string) => Promise<{
    success: boolean;
    message: string;
    expiresInSeconds?: number;
    devOtp?: string;
  }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; message: string }>;
  loginWithPhone: (phone: string) => Promise<{ success: boolean; message: string }>;
  signUp: (
    phone: string,
    password: string,
    name?: string,
  ) => Promise<{
    success: boolean;
    message: string;
    alreadyRegistered?: boolean;
  }>;
  loginWithPassword: (
    phone: string,
    password: string,
  ) => Promise<{
    success: boolean;
    message: string;
    needsPasswordSetup?: boolean;
  }>;
  resetPassword: (
    phone: string,
    newPassword: string,
  ) => Promise<{ success: boolean; message: string; legacySetup?: boolean }>;
  logout: () => Promise<{ success: boolean }>;
  updateProfile: (updates: UserProfileUpdate) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function clearStoredAuth() {
  await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, USER_STORAGE_KEY]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const persistSession = useCallback(
    async (nextSessionId: string | null, profile: UserProfile | null) => {
      setSessionId(nextSessionId);
      setUser(profile);

      if (nextSessionId) {
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
      } else {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      }

      if (profile) {
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      } else {
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
      }
    },
    [],
  );

  useEffect(() => {
    const loadSession = async () => {
      try {
        if (isSupabaseConfigured()) {
          const storedSessionId = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

          if (!storedSessionId) {
            await clearStoredAuth();
            setSessionId(null);
            setUser(null);
            return;
          }

          const validation = await validateSessionFromDb(storedSessionId);
          if (validation?.valid && validation.profile) {
            await persistSession(validation.sessionId ?? storedSessionId, validation.profile);
            return;
          }

          await clearStoredAuth();
          setSessionId(null);
          setUser(null);
          return;
        }

        const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (!storedUser) return;

        setUser(JSON.parse(storedUser) as UserProfile);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSession();
  }, [persistSession]);

  const sendOtpHandler = useCallback(async (phone: string) => {
    return sendOtp(phone);
  }, []);

  const loginWithPhone = useCallback(
    async (phone: string) => {
      const normalizedPhone = normalizePhone(phone);
      const now = new Date().toISOString();
      const isSameUser = user?.phone === normalizedPhone;

      if (isSupabaseConfigured()) {
        const result = await loginByPhoneFromDb(phone);
        if (!result) {
          return { success: false, message: 'Could not log in. Try again.' };
        }

        if (!result.success) {
          return { success: false, message: result.message };
        }

        if (!result.sessionId || !result.profile) {
          return { success: false, message: 'Login failed. Please try again.' };
        }

        await persistSession(result.sessionId, result.profile);
        return { success: true, message: result.message };
      }

      const profile: UserProfile = {
        phone: normalizedPhone,
        name: isSameUser ? user?.name ?? '' : '',
        addressLine: isSameUser ? user?.addressLine : undefined,
        landmark: isSameUser ? user?.landmark : undefined,
        whatsappUpdatesEnabled: isSameUser ? user?.whatsappUpdatesEnabled ?? true : true,
        createdAt: isSameUser ? user?.createdAt ?? now : now,
        id: isSameUser ? user?.id : undefined,
      };

      await persistSession(null, profile);
      return { success: true, message: 'Logged in successfully.' };
    },
    [persistSession, user],
  );

  const loginWithPassword = useCallback(
    async (phone: string, password: string) => {
      if (isSupabaseConfigured()) {
        const result = await loginCustomerFromDb(phone, password);
        if (!result) {
          return { success: false, message: 'Could not log in. Try again.' };
        }

        if (!result.success) {
          return {
            success: false,
            message: result.message,
            needsPasswordSetup: result.needsPasswordSetup,
          };
        }

        if (!result.sessionId || !result.profile) {
          return { success: false, message: 'Login failed. Please try again.' };
        }

        await persistSession(result.sessionId, result.profile);
        return { success: true, message: result.message };
      }

      const result = await loginCustomerLocally(phone, password);
      if (!result.success || !result.profile) {
        return {
          success: false,
          message: result.message,
          needsPasswordSetup: result.needsPasswordSetup,
        };
      }

      await persistSession(null, result.profile);
      return { success: true, message: result.message };
    },
    [persistSession],
  );

  const resetPassword = useCallback(
    async (phone: string, newPassword: string) => {
      if (isSupabaseConfigured()) {
        const result = await resetCustomerPasswordFromDb(phone, newPassword);
        if (!result) {
          return { success: false, message: 'Could not reset password. Try again.' };
        }

        if (!result.success) {
          return { success: false, message: result.message };
        }

        if (!result.sessionId || !result.profile) {
          return { success: false, message: 'Password reset failed. Please try again.' };
        }

        await persistSession(result.sessionId, result.profile);
        return {
          success: true,
          message: result.message,
          legacySetup: result.legacySetup,
        };
      }

      const result = await resetCustomerPasswordLocally(phone, newPassword);
      if (!result.success || !result.profile) {
        return { success: false, message: result.message };
      }

      await persistSession(null, result.profile);
      return {
        success: true,
        message: result.message,
        legacySetup: result.legacySetup,
      };
    },
    [persistSession],
  );

  const signUp = useCallback(
    async (phone: string, password: string, name?: string) => {
      if (isSupabaseConfigured()) {
        const result = await registerCustomerFromDb(phone, password, name);
        if (!result) {
          return { success: false, message: 'Could not create account. Try again.' };
        }

        if (!result.success) {
          return {
            success: false,
            message: result.message,
            alreadyRegistered:
              result.alreadyRegistered || /already registered/i.test(result.message),
          };
        }

        if (!result.sessionId || !result.profile) {
          return { success: false, message: 'Sign up failed. Please try again.' };
        }

        await persistSession(result.sessionId, result.profile);
        return { success: true, message: result.message };
      }

      const result = await registerCustomerLocally(phone, password, name);
      if (!result.success) {
        return {
          success: false,
          message: result.message,
          alreadyRegistered:
            result.alreadyRegistered || /already registered/i.test(result.message),
        };
      }

      if (!result.profile) {
        return { success: false, message: 'Sign up failed. Please try again.' };
      }

      await persistSession(null, result.profile);
      return { success: true, message: result.message };
    },
    [persistSession],
  );

  const verifyOtp = useCallback(
    async (phone: string, otp: string) => {
      const normalizedPhone = normalizePhone(phone);
      const now = new Date().toISOString();
      const isSameUser = user?.phone === normalizedPhone;

      if (isSupabaseConfigured()) {
        const result = await verifyOtpFromDb(phone, otp);
        if (!result) {
          return { success: false, message: 'Could not verify OTP. Try again.' };
        }

        if (!result.success) {
          return { success: false, message: result.message };
        }

        if (!result.sessionId || !result.profile) {
          return { success: false, message: 'Login failed. Please request a new OTP.' };
        }

        await persistSession(result.sessionId, result.profile);
        return { success: true, message: result.message };
      }

      if (!verifyOtpLocally(otp)) {
        return { success: false, message: 'Invalid OTP. Please try again.' };
      }

      const profile: UserProfile = {
        phone: normalizedPhone,
        name: isSameUser ? user?.name ?? '' : '',
        addressLine: isSameUser ? user?.addressLine : undefined,
        landmark: isSameUser ? user?.landmark : undefined,
        whatsappUpdatesEnabled: isSameUser ? user?.whatsappUpdatesEnabled ?? true : true,
        createdAt: isSameUser ? user?.createdAt ?? now : now,
        id: isSameUser ? user?.id : undefined,
      };

      await persistSession(null, profile);
      return { success: true, message: 'Logged in successfully.' };
    },
    [persistSession, user],
  );

  const logout = useCallback(async (): Promise<{ success: boolean }> => {
    const storedSessionId =
      sessionId ?? (await AsyncStorage.getItem(SESSION_STORAGE_KEY));
    const phoneToRevoke = user?.phone ?? '';

    try {
      if (storedSessionId && isSupabaseConfigured()) {
        await revokeSessionInDb(storedSessionId, phoneToRevoke);
      }
    } catch (error) {
      console.warn('[AuthContext] logout revoke failed:', error);
    }

    setSessionId(null);
    setUser(null);
    await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, USER_STORAGE_KEY]);

    return { success: true };
  }, [sessionId, user]);

  const updateProfile = useCallback(
    async (updates: UserProfileUpdate) => {
      if (!user) return;

      let updated: UserProfile = {
        ...user,
        ...updates,
        name: updates.name?.trim() ?? user.name,
        addressLine: updates.addressLine?.trim() ?? user.addressLine,
        landmark: updates.landmark?.trim() ?? user.landmark,
      };

      if (isSupabaseConfigured() && sessionId) {
        const remote = await syncProfileUpdateToDb(sessionId, updates, user);
        if (remote) {
          updated = remote;
        }
      }

      await persistSession(sessionId, updated);
    },
    [persistSession, sessionId, user],
  );

  const value = useMemo(
    () => ({
      user,
      sessionId,
      isLoaded,
      isAuthenticated: Boolean(user),
      sendOtp: sendOtpHandler,
      loginWithPhone,
      signUp,
      loginWithPassword,
      resetPassword,
      verifyOtp,
      logout,
      updateProfile,
    }),
    [
      user,
      sessionId,
      isLoaded,
      sendOtpHandler,
      loginWithPhone,
      signUp,
      loginWithPassword,
      resetPassword,
      verifyOtp,
      logout,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
