-- OTP SMS integration: store hashes from Edge Function; block direct OTP RPC from clients.

create or replace function public.store_customer_otp_hash(
  p_phone text,
  p_otp_hash text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_recent_count integer;
begin
  v_phone := public.normalize_phone(p_phone);

  if length(v_phone) <> 12 or substring(v_phone, 3, 1) not in ('6', '7', '8', '9') then
    return jsonb_build_object('success', false, 'message', 'Enter a valid 10-digit mobile number.');
  end if;

  if p_otp_hash is null or length(trim(p_otp_hash)) < 32 then
    return jsonb_build_object('success', false, 'message', 'Invalid OTP hash.');
  end if;

  if p_expires_at is null or p_expires_at <= now() then
    return jsonb_build_object('success', false, 'message', 'Invalid OTP expiry.');
  end if;

  select count(*) into v_recent_count
  from public.otp_verifications
  where phone = v_phone
    and created_at > now() - interval '10 minutes';

  if v_recent_count >= 3 then
    return jsonb_build_object(
      'success', false,
      'message', 'Too many OTP requests. Please wait and try again.'
    );
  end if;

  insert into public.otp_verifications (phone, otp_hash, expires_at)
  values (v_phone, trim(p_otp_hash), p_expires_at);

  return jsonb_build_object(
    'success', true,
    'message', 'OTP sent to your mobile number.',
    'expires_in_seconds', 300
  );
end;
$$;

revoke execute on function public.request_customer_otp(text) from anon, authenticated;
revoke execute on function public.store_customer_otp_hash(text, text, timestamptz) from anon, authenticated;
grant execute on function public.store_customer_otp_hash(text, text, timestamptz) to service_role;
