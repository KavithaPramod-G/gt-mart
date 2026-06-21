-- Customer sign up / login with mobile number + password (bcrypt).

create extension if not exists pgcrypto with schema extensions;

alter table public.profiles
  add column if not exists password_hash text;

create table if not exists public.customer_login_attempts (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_login_attempts_phone_created_idx
  on public.customer_login_attempts (phone, created_at desc);

alter table public.customer_login_attempts enable row level security;

create or replace function public.create_customer_session(p_profile public.profiles)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  update public.customer_sessions
  set revoked_at = now()
  where phone = p_profile.phone
    and revoked_at is null;

  insert into public.customer_sessions (profile_id, phone, expires_at)
  values (p_profile.id, p_profile.phone, now() + interval '30 days')
  returning id into v_session_id;

  return v_session_id;
end;
$$;

create or replace function public.register_customer(
  p_phone text,
  p_password text,
  p_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
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

  if p_password is null or length(trim(p_password)) < 6 then
    return jsonb_build_object(
      'success', false,
      'message', 'Password must be at least 6 characters.'
    );
  end if;

  if exists (select 1 from public.profiles where phone = v_phone) then
    return jsonb_build_object(
      'success', false,
      'already_registered', true,
      'message', 'This mobile number is already registered. Please log in.'
    );
  end if;

  insert into public.profiles (phone, name, password_hash)
  values (
    v_phone,
    coalesce(trim(p_name), ''),
    extensions.crypt(trim(p_password), extensions.gen_salt('bf'))
  )
  returning * into v_profile;

  v_session_id := public.create_customer_session(v_profile);

  return jsonb_build_object(
    'success', true,
    'message', 'Account created successfully.',
    'session_id', v_session_id,
    'profile', public.profile_to_json(v_profile)
  );
end;
$$;

create or replace function public.login_customer(
  p_phone text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text;
  v_profile public.profiles;
  v_session_id uuid;
  v_recent_failures integer;
begin
  v_phone := public.normalize_phone(p_phone);

  if length(v_phone) <> 12 or substring(v_phone, 3, 1) not in ('6', '7', '8', '9') then
    return jsonb_build_object('success', false, 'message', 'Invalid mobile number or password.');
  end if;

  if p_password is null or length(trim(p_password)) = 0 then
    return jsonb_build_object('success', false, 'message', 'Invalid mobile number or password.');
  end if;

  select count(*) into v_recent_failures
  from public.customer_login_attempts
  where phone = v_phone
    and created_at > now() - interval '15 minutes';

  if v_recent_failures >= 5 then
    return jsonb_build_object(
      'success', false,
      'message', 'Too many failed attempts. Please wait 15 minutes and try again.'
    );
  end if;

  select * into v_profile
  from public.profiles
  where phone = v_phone;

  if not found
    or v_profile.password_hash is null
    or v_profile.password_hash <> extensions.crypt(trim(p_password), v_profile.password_hash)
  then
    insert into public.customer_login_attempts (phone)
    values (v_phone);

    return jsonb_build_object(
      'success', false,
      'message', 'Invalid mobile number or password.'
    );
  end if;

  delete from public.customer_login_attempts
  where phone = v_phone;

  v_session_id := public.create_customer_session(v_profile);

  return jsonb_build_object(
    'success', true,
    'message', 'Logged in successfully.',
    'session_id', v_session_id,
    'profile', public.profile_to_json(v_profile)
  );
end;
$$;

revoke execute on function public.login_customer_by_phone(text) from anon, authenticated;

grant execute on function public.register_customer(text, text, text) to anon, authenticated;
grant execute on function public.login_customer(text, text) to anon, authenticated;
