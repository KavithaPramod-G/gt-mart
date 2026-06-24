-- Category icons via Supabase Storage (public URL; emoji remains fallback)

alter table public.categories
  add column if not exists image_url text;

comment on column public.categories.image_url is
  'Public Supabase Storage URL for category image; emoji used when null';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'category-images',
  'category-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "category_images_public_read" on storage.objects;

create policy "category_images_public_read"
  on storage.objects for select
  using (bucket_id = 'category-images');
