-- Customer OTP login + sessions for GT Mart mobile app
-- Run after 001_initial_schema.sql

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.otp_verifications (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index otp_verifications_phone_created_idx
  on public.otp_verifications (phone, created_at desc);

create table public.customer_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  phone text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index customer_sessions_phone_active_idx
  on public.customer_sessions (phone)
  where revoked_at is null;

alter table public.otp_verifications enable row level security;
alter table public.customer_sessions enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.normalize_phone(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
begin
  digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if length(digits) = 10 then
    return '91' || digits;
  end if;

  if length(digits) = 12 and left(digits, 2) = '91' then
    return digits;
  end if;

  return digits;
end;
$$;

create or replace function public.hash_customer_otp(p_phone text, p_otp text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(trim(p_otp) || public.normalize_phone(p_phone), 'sha256'), 'hex');
$$;

create or replace function public.profile_to_json(p_profile public.profiles)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p_profile.id,
    'phone', p_profile.phone,
    'name', p_profile.name,
    'address_line', p_profile.address_line,
    'landmark', p_profile.landmark,
    'whatsapp_updates_enabled', p_profile.whatsapp_updates_enabled,
    'created_at', p_profile.created_at
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC: request OTP
-- ---------------------------------------------------------------------------

create or replace function public.request_customer_otp(
  p_phone text,
  p_dev_mode boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text;
  v_recent_count integer;
  v_otp text;
  v_expires_at timestamptz;
begin
  v_phone := public.normalize_phone(p_phone);

  if length(v_phone) <> 12 or substring(v_phone, 3, 1) not in ('6', '7', '8', '9') then
    return jsonb_build_object('success', false, 'message', 'Enter a valid 10-digit mobile number.');
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

  v_otp := lpad(floor(random() * 1000000)::text, 6, '0');
  v_expires_at := now() + interval '5 minutes';

  insert into public.otp_verifications (phone, otp_hash, expires_at)
  values (v_phone, public.hash_customer_otp(v_phone, v_otp), v_expires_at);

  return jsonb_build_object(
    'success', true,
    'message', 'OTP sent to your mobile number.',
    'expires_in_seconds', 300,
    'dev_otp', case when coalesce(p_dev_mode, false) then v_otp else null end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: verify OTP + create session
-- ---------------------------------------------------------------------------

create or replace function public.verify_customer_otp(
  p_phone text,
  p_otp text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text;
  v_hash text;
  v_record record;
  v_profile public.profiles;
  v_session_id uuid;
begin
  v_phone := public.normalize_phone(p_phone);
  v_hash := public.hash_customer_otp(v_phone, p_otp);

  select * into v_record
  from public.otp_verifications
  where phone = v_phone
    and verified_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'success', false,
      'message', 'OTP expired or not found. Request a new one.'
    );
  end if;

  if v_record.attempts >= v_record.max_attempts then
    return jsonb_build_object(
      'success', false,
      'message', 'Too many attempts. Request a new OTP.'
    );
  end if;

  update public.otp_verifications
  set attempts = attempts + 1
  where id = v_record.id;

  if v_record.otp_hash <> v_hash then
    return jsonb_build_object('success', false, 'message', 'Invalid OTP. Please try again.');
  end if;

  update public.otp_verifications
  set verified_at = now()
  where id = v_record.id;

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

-- ---------------------------------------------------------------------------
-- RPC: validate session (app startup)
-- ---------------------------------------------------------------------------

create or replace function public.validate_customer_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_profile public.profiles;
begin
  if p_session_id is null then
    return jsonb_build_object('valid', false);
  end if;

  select * into v_session
  from public.customer_sessions
  where id = p_session_id
    and revoked_at is null
    and expires_at > now();

  if not found then
    return jsonb_build_object('valid', false);
  end if;

  select * into v_profile
  from public.profiles
  where id = v_session.profile_id;

  if not found then
    return jsonb_build_object('valid', false);
  end if;

  update public.customer_sessions
  set last_seen_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'valid', true,
    'session_id', v_session.id,
    'profile', public.profile_to_json(v_profile)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: logout
-- ---------------------------------------------------------------------------

create or replace function public.revoke_customer_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_id is null then
    return jsonb_build_object('success', true);
  end if;

  update public.customer_sessions
  set revoked_at = now()
  where id = p_session_id
    and revoked_at is null;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.normalize_phone(text) to anon, authenticated;
grant execute on function public.request_customer_otp(text, boolean) to anon, authenticated;
grant execute on function public.verify_customer_otp(text, text) to anon, authenticated;
grant execute on function public.validate_customer_session(uuid) to anon, authenticated;
grant execute on function public.revoke_customer_session(uuid) to anon, authenticated;
