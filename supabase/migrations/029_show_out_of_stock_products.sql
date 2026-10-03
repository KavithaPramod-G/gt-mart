-- Let the shop app read out-of-stock products.
-- Does not delete or change product rows. Customers still cannot edit products.
-- Orders still reject an out-of-stock item at checkout.

drop policy if exists "products_public_read_in_stock" on public.products;
drop policy if exists "products_public_read" on public.products;

create policy "products_public_read"
  on public.products for select
  to anon, authenticated
  using (true);
