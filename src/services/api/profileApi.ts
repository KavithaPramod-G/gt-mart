import { getSupabase } from '@/lib/supabase';
import { normalizePhone } from '@/services/auth';
import { UserProfile, UserProfileUpdate } from '@/types';

interface DbProfilePayload {
  id: string;
  phone: string;
  name: string;
  address_line: string | null;
  landmark: string | null;
  whatsapp_updates_enabled: boolean;
  created_at: string;
}

export function mapDbProfile(row: DbProfilePayload): UserProfile {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    addressLine: row.address_line ?? undefined,
    landmark: row.landmark ?? undefined,
    whatsappUpdatesEnabled: row.whatsapp_updates_enabled,
    createdAt: row.created_at,
  };
}

export async function syncProfileUpdateToDb(
  sessionId: string,
  updates: UserProfileUpdate,
  current: UserProfile,
): Promise<UserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('update_customer_profile', {
    p_session_id: sessionId,
    p_name: updates.name ?? current.name,
    p_address_line: updates.addressLine ?? current.addressLine ?? '',
    p_landmark: updates.landmark ?? current.landmark ?? '',
    p_whatsapp_updates_enabled:
      updates.whatsappUpdatesEnabled ?? current.whatsappUpdatesEnabled,
  });

  if (error || !data) {
    console.warn('[profileApi] update failed:', error?.message);
    return null;
  }

  const result = data as {
    success: boolean;
    profile?: DbProfilePayload;
    message?: string;
  };

  if (!result.success || !result.profile) {
    return null;
  }

  return mapDbProfile(result.profile);
}
