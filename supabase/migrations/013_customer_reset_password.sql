-- Forgot / set password for legacy users (no password_hash) and password resets.

create table if not exists public.customer_password_resets (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_password_resets_phone_created_idx
  on public.customer_password_resets (phone, created_at desc);

alter table public.customer_password_resets enable row level security;

create or replace function public.reset_customer_password(
  p_phone text,
  p_new_password text
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
  v_recent_resets integer;
  v_is_legacy boolean;
begin
  v_phone := public.normalize_phone(p_phone);

  if length(v_phone) <> 12 or substring(v_phone, 3, 1) not in ('6', '7', '8', '9') then
    return jsonb_build_object('success', false, 'message', 'Enter a valid 10-digit mobile number.');
  end if;

  if p_new_password is null or length(trim(p_new_password)) < 6 then
    return jsonb_build_object(
      'success', false,
      'message', 'Password must be at least 6 characters.'
    );
  end if;

  select count(*) into v_recent_resets
  from public.customer_password_resets
  where phone = v_phone
    and created_at > now() - interval '15 minutes';

  if v_recent_resets >= 3 then
    return jsonb_build_object(
      'success', false,
      'message', 'Too many password reset attempts. Please wait and try again.'
    );
  end if;

  select * into v_profile
  from public.profiles
  where public.normalize_phone(phone) = v_phone;

  if not found then
    return jsonb_build_object(
      'success', false,
      'message', 'No account found for this mobile number. Please sign up.'
    );
  end if;

  v_is_legacy := v_profile.password_hash is null;

  insert into public.customer_password_resets (phone)
  values (v_phone);

  update public.profiles
  set
    password_hash = extensions.crypt(trim(p_new_password), extensions.gen_salt('bf')),
    updated_at = now()
  where id = v_profile.id
  returning * into v_profile;

  delete from public.customer_login_attempts
  where phone = v_phone;

  v_session_id := public.create_customer_session(v_profile);

  return jsonb_build_object(
    'success', true,
    'legacy_setup', v_is_legacy,
    'message', case
      when v_is_legacy then 'Password created successfully. You are now logged in.'
      else 'Password updated successfully. You are now logged in.'
    end,
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
  where public.normalize_phone(phone) = v_phone;

  if not found then
    insert into public.customer_login_attempts (phone)
    values (v_phone);

    return jsonb_build_object(
      'success', false,
      'message', 'Invalid mobile number or password.'
    );
  end if;

  if v_profile.password_hash is null then
    return jsonb_build_object(
      'success', false,
      'needs_password_setup', true,
      'message', 'This account has no password yet. Use Forgot password to set one.'
    );
  end if;

  if v_profile.password_hash <> extensions.crypt(trim(p_password), v_profile.password_hash) then
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

grant execute on function public.reset_customer_password(text, text) to anon, authenticated;
