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
  revokeSessionInDb,
  validateSessionFromDb,
  verifyOtpFromDb,
} from '@/services/api/authApi';
import { syncProfileUpdateToDb, upsertProfileInDb } from '@/services/api/profileApi';
import { normalizePhone, sendOtp, verifyOtpLocally } from '@/services/auth';
import { UserProfile, UserProfileUpdate } from '@/types';

const SESSION_STORAGE_KEY = '@gt_mart_session_id';
const USER_STORAGE_KEY = '@gt_mart_user';

interface AuthContextValue {
  user: UserProfile | null;
  isLoaded: boolean;
  isAuthenticated: boolean;
  sendOtp: (phone: string) => Promise<{
    success: boolean;
    message: string;
    expiresInSeconds?: number;
    devOtp?: string;
  }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; message: string }>;
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

    let revoked = true;
    if (storedSessionId && isSupabaseConfigured()) {
      revoked = await revokeSessionInDb(storedSessionId);
    }

    setSessionId(null);
    setUser(null);
    await clearStoredAuth();

    return { success: revoked };
  }, [sessionId]);

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

      if (isSupabaseConfigured()) {
        const remote = await syncProfileUpdateToDb(user.phone, updates);
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
      isLoaded,
      isAuthenticated: Boolean(user),
      sendOtp: sendOtpHandler,
      verifyOtp,
      logout,
      updateProfile,
    }),
    [user, isLoaded, sendOtpHandler, verifyOtp, logout, updateProfile],
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
