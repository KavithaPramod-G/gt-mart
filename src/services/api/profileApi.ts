import { getSupabase } from '@/lib/supabase';
import { normalizePhone } from '@/services/auth';
import { UserProfile, UserProfileUpdate } from '@/types';

interface DbProfile {
  id: string;
  phone: string;
  name: string;
  address_line: string | null;
  landmark: string | null;
  whatsapp_updates_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function mapDbProfile(row: DbProfile): UserProfile {
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

export async function upsertProfileInDb(
  profile: Pick<UserProfile, 'phone' | 'name' | 'addressLine' | 'landmark' | 'whatsappUpdatesEnabled'>,
): Promise<UserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('upsert_profile', {
    p_phone: normalizePhone(profile.phone),
    p_name: profile.name ?? '',
    p_address_line: profile.addressLine ?? null,
    p_landmark: profile.landmark ?? null,
    p_whatsapp_updates_enabled: profile.whatsappUpdatesEnabled ?? true,
  });

  if (error || !data) {
    console.warn('[profileApi] upsert failed:', error?.message);
    return null;
  }

  return mapDbProfile(data as DbProfile);
}

export async function fetchProfileByPhone(phone: string): Promise<UserProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const normalized = normalizePhone(phone);
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', normalized)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapDbProfile(data as DbProfile);
}

export async function syncProfileUpdateToDb(
  phone: string,
  updates: UserProfileUpdate,
): Promise<UserProfile | null> {
  const existing = await fetchProfileByPhone(phone);
  if (!existing) return null;

  return upsertProfileInDb({
    phone: existing.phone,
    name: updates.name ?? existing.name,
    addressLine: updates.addressLine ?? existing.addressLine,
    landmark: updates.landmark ?? existing.landmark,
    whatsappUpdatesEnabled:
      updates.whatsappUpdatesEnabled ?? existing.whatsappUpdatesEnabled,
  });
}
