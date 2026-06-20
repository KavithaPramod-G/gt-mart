-- Phone-only login for launch (no OTP). Switch off when MSG91 is live.

create or replace function public.login_customer_by_phone(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_profile public.profiles;
  v_session_id uuid;
begin
  v_phone := public.normalize_phone(p_phone);

  if length(v_phone) <> 12 or substring(v_phone, 3, 1) not in ('6', '7', '8', '9') then
    return jsonb_build_object('success', false, 'message', 'Enter a valid 10-digit mobile number.');
  end if;

  v_profile := public.upsert_profile(v_phone, '', null, null, true);

  update public.customer_sessions
  set revoked_at = now()
  where phone = v_phone
    and revoked_at is null;

  insert into public.customer_sessions (profile_id, phone, expires_at)
  values (v_profile.id, v_phone, now() + interval '30 days')
  returning id into v_session_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Logged in successfully.',
    'session_id', v_session_id,
    'profile', public.profile_to_json(v_profile)
  );
end;
$$;

grant execute on function public.login_customer_by_phone(text) to anon, authenticated;
