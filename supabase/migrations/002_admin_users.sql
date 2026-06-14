-- Admin users for GT Mart web admin (credentials stored in DB, not env vars)

create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;

-- No RLS policies: only the service role (server-side admin app) can read/write.

insert into public.admin_users (username, password_hash) values
  ('admin', '$2b$10$vdsY/72K9mgHsFMd2pfVV.F8Dv0SpDy9Jl9zShd/eVSKWA75E05xa')
on conflict (username) do nothing;
