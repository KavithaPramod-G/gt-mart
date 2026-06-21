-- Fix duplicate registration detection (phone format + unique constraint).

create or replace function public.profile_phone_exists(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where public.normalize_phone(p.phone) = public.normalize_phone(p_phone)
  );
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

  if public.profile_phone_exists(v_phone) then
    return jsonb_build_object(
      'success', false,
      'already_registered', true,
      'message', 'This mobile number is already registered. Please log in.'
    );
  end if;

  begin
    insert into public.profiles (phone, name, password_hash)
    values (
      v_phone,
      coalesce(trim(p_name), ''),
      extensions.crypt(trim(p_password), extensions.gen_salt('bf'))
    )
    returning * into v_profile;
  exception
    when unique_violation then
      return jsonb_build_object(
        'success', false,
        'already_registered', true,
        'message', 'This mobile number is already registered. Please log in.'
      );
  end;

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
  where public.normalize_phone(phone) = v_phone;

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
