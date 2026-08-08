-- Health check — run after bootstrap or sync

select 'tables' as check_group, table_name from information_schema.tables
where table_schema = 'public' and table_name in (
  'categories', 'products', 'profiles', 'orders', 'admin_users', 'customer_sessions'
) order by table_name;

select 'categories' as check_group,
  count(*) filter (where is_active) as active_count from public.categories;

select 'admin' as check_group,
  case when exists (select 1 from public.admin_users limit 1) then 'ok' else 'missing' end as status;
