import * as ImagePicker from 'expo-image-picker';

import { getSupabase } from '@/lib/supabase';
import { normalizePhone } from '@/services/auth';

function extensionFromMime(mime: string | undefined): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadOrderPaymentProof(
  orderId: string,
  phone: string,
  imageUri: string,
  upiReference?: string,
): Promise<{ proofUrl: string } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const response = await fetch(imageUri);
  const blob = await response.blob();
  const ext = extensionFromMime(blob.type);
  const path = `orders/${orderId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    console.warn('[paymentProofApi] upload failed:', uploadError.message);
    throw new Error(uploadError.message);
  }

  const { data: publicData } = supabase.storage.from('payment-proofs').getPublicUrl(path);
  const proofUrl = publicData.publicUrl;

  const { error: rpcError } = await supabase.rpc('submit_order_payment_proof', {
    p_order_id: orderId,
    p_phone: normalizePhone(phone),
    p_proof_url: proofUrl,
    p_upi_reference: upiReference?.trim() || null,
  });

  if (rpcError) {
    console.warn('[paymentProofApi] attach proof failed:', rpcError.message);
    throw new Error(rpcError.message);
  }

  return { proofUrl };
}

export async function pickPaymentScreenshot(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to upload payment proof.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
}
