-- Check whether admin login is configured (used by admin app setup status endpoint)

create or replace function public.admin_login_ready()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users limit 1);
$$;

grant execute on function public.admin_login_ready() to anon, authenticated;
