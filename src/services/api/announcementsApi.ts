import { getSupabase } from '@/lib/supabase';
import { ShopAnnouncement } from '@/types';

interface DbAnnouncement {
  id: string;
  kind?: string | null;
  title: string;
  subtitle: string | null;
  body: string | null;
  badge: string | null;
  emoji: string | null;
  image_url?: string | null;
  category_id: string | null;
}

const ANNOUNCEMENT_COLUMNS =
  'id, kind, title, subtitle, body, badge, emoji, image_url, category_id';

function mapAnnouncement(row: DbAnnouncement): ShopAnnouncement {
  return {
    id: row.id,
    kind: row.kind === 'offer' ? 'offer' : 'news',
    title: row.title,
    subtitle: row.subtitle?.trim() ?? '',
    body: row.body?.trim() ?? '',
    badge: row.badge?.trim() ?? '',
    emoji: row.emoji?.trim() || '📢',
    imageUrl: row.image_url?.trim() || null,
    categoryId: row.category_id,
  };
}

export async function fetchActiveAnnouncements(): Promise<ShopAnnouncement[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('shop_announcements')
    .select(ANNOUNCEMENT_COLUMNS)
    .eq('active', true)
    .order('sort_order')
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.warn('[announcementsApi] list failed:', error?.message);
    return [];
  }

  return (data as DbAnnouncement[]).map(mapAnnouncement);
}

export async function fetchAnnouncementById(id: string): Promise<ShopAnnouncement | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('shop_announcements')
    .select(ANNOUNCEMENT_COLUMNS)
    .eq('id', id)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) {
    console.warn('[announcementsApi] fetch failed:', error?.message);
    return null;
  }

  return mapAnnouncement(data as DbAnnouncement);
}

export async function fetchAnnouncementProductIds(announcementId: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase || !announcementId) return [];

  const { data, error } = await supabase
    .from('shop_announcement_products')
    .select('product_id, sort_order')
    .eq('announcement_id', announcementId)
    .order('sort_order');

  if (error || !data) {
    console.warn('[announcementsApi] product links failed:', error?.message);
    return [];
  }

  return data.map((row) => String(row.product_id)).filter(Boolean);
}
