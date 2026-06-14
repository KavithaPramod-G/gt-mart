-- Allow admin login via RPC without exposing admin_users to anon key table reads.
-- Run after 002_admin_users.sql

create extension if not exists pgcrypto with schema extensions;

create or replace function public.verify_admin_login(
  p_username text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user record;
begin
  select id, password_hash into v_user
  from public.admin_users
  where username = trim(p_username);

  if not found then
    return null;
  end if;

  if v_user.password_hash = extensions.crypt(p_password, v_user.password_hash) then
    return v_user.id;
  end if;

  return null;
end;
$$;

grant execute on function public.verify_admin_login(text, text) to anon, authenticated;

-- Re-hash default admin password with pgcrypto so verify_admin_login can validate it.
update public.admin_users
set password_hash = extensions.crypt('gtmart-admin-2026', extensions.gen_salt('bf'))
where username = 'admin';
