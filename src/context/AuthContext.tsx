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
import { sendOtpMock, verifyOtpMock, normalizePhone } from '@/services/auth';
import {
  fetchProfileByPhone,
  syncProfileUpdateToDb,
  upsertProfileInDb,
} from '@/services/api/profileApi';
import { UserProfile, UserProfileUpdate } from '@/types';

const USER_STORAGE_KEY = '@gt_mart_user';

interface AuthContextValue {
  user: UserProfile | null;
  isLoaded: boolean;
  isAuthenticated: boolean;
  sendOtp: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: UserProfileUpdate) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (!stored) return;

        const localProfile = JSON.parse(stored) as UserProfile;

        if (isSupabaseConfigured()) {
          const remote = await fetchProfileByPhone(localProfile.phone);
          if (remote) {
            setUser(remote);
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(remote));
            return;
          }
        }

        setUser(localProfile);
      } finally {
        setIsLoaded(true);
      }
    };

    loadUser();
  }, []);

  const persistUser = useCallback(async (profile: UserProfile | null) => {
    setUser(profile);
    if (profile) {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
    } else {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    }
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    return sendOtpMock(phone);
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, otp: string) => {
      if (!verifyOtpMock(otp)) {
        return { success: false, message: 'Invalid OTP. Please try again.' };
      }

      const normalizedPhone = normalizePhone(phone);
      const now = new Date().toISOString();
      const isSameUser = user?.phone === normalizedPhone;

      let profile: UserProfile = {
        phone: normalizedPhone,
        name: isSameUser ? user?.name ?? '' : '',
        addressLine: isSameUser ? user?.addressLine : undefined,
        landmark: isSameUser ? user?.landmark : undefined,
        whatsappUpdatesEnabled: isSameUser ? user?.whatsappUpdatesEnabled ?? true : true,
        createdAt: isSameUser ? user?.createdAt ?? now : now,
        id: isSameUser ? user?.id : undefined,
      };

      if (isSupabaseConfigured()) {
        const remote = await upsertProfileInDb(profile);
        if (remote) {
          profile = remote;
        }
      }

      await persistUser(profile);
      return { success: true, message: 'Logged in successfully.' };
    },
    [persistUser, user],
  );

  const logout = useCallback(async () => {
    await persistUser(null);
  }, [persistUser]);

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

      await persistUser(updated);
    },
    [persistUser, user],
  );

  const value = useMemo(
    () => ({
      user,
      isLoaded,
      isAuthenticated: Boolean(user),
      sendOtp,
      verifyOtp,
      logout,
      updateProfile,
    }),
    [user, isLoaded, sendOtp, verifyOtp, logout, updateProfile],
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
