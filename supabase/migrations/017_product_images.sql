-- Product photos via Supabase Storage (public URL on each product; emoji remains fallback)

alter table public.products
  add column if not exists image_url text;

comment on column public.products.image_url is
  'Public Supabase Storage URL for product photo; emoji used when null';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_public_read" on storage.objects;

create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');
