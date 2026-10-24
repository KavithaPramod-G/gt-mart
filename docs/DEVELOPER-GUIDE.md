# RROne / GT Mart — Developer guide

Use this when you need to change the shop. The design background is in `docs/HLD.md`. Table and function detail is in `docs/LLD.md`.

## Run it locally

Shop app, from `gt-mart`:

```bash
npx expo start --web --port 8081
```

Open `http://localhost:8081`. The customer name on screen is RROne.

Admin, from `gt-mart-admin`:

```bash
npm run dev
```

Open `http://localhost:3000`. Only one Next dev server can own that folder. If port 3000 is already taken, stop that process before starting another.

Both apps need their `.env` files. The shop needs the Supabase URL and anon key. Admin needs the service-role key. Do not commit either file.

## Where to make a change

| Task | Start here |
| --- | --- |
| Home offer slides | `gt-mart/src/components/HomeOfferSlides.tsx` |
| Category grid | `gt-mart/src/components/CategoryHeroCards.tsx` |
| Product card, photos, out of stock | `gt-mart/src/components/ProductCard.tsx`, `ProductImage.tsx` |
| Cart rules | `gt-mart/src/context/CartContext.tsx` |
| What the phone sends when ordering | `gt-mart/src/services/api/ordersApi.ts` |
| Price and stock checks | `place_order` in the latest combo migration, then a new migration if the rules change |
| Combo admin | `gt-mart-admin/src/app/(admin)/combos` and `src/app/actions/combos.ts` |
| Announcements admin | `gt-mart-admin/src/app/(admin)/announcements` |
| Product form, including Buy 1 Get 1 | `gt-mart-admin/src/components/ProductForm.tsx` |
| Staff permissions | `gt-mart-admin/src/lib/auth.ts` |

## Database changes

Add a new file under `gt-mart/supabase/migrations`. Number it after the highest existing file. Prefer `add column if not exists` and `create table if not exists`. Do not delete products, orders, or prices to ship a feature.

The person running the shop applies that file in the Supabase SQL editor. Until then, the app should keep working: queries for a missing column or table should fail softly on optional features such as announcements.

After replacing a function, keep the same argument list the app already sends unless you update `ordersApi.ts` in the same change. `place_order` is the sensitive one.

## Pricing checklist

Before shipping an offer, answer these:

- Does the product row stay in its category? It should.
- Does `products.price` stay the shelf price? It should, unless staff edit that product on purpose.
- Where is the discount stored? Combo price on `combo_offers`, or a lower `products.price` for a normal deal.
- Can the customer add an out-of-stock item? The UI and `place_order` must both say no.

## Phone release versus local preview

`npx expo start` serves the current JavaScript. The Play Store app is a built bundle. Shipping a screen or a bugfix to customers requires a new production Android build with a higher version code, then a Play Console rollout. Admin and SQL do not ride inside that bundle. A catalog edit is live for old and new apps as soon as the database has it.

Release Android builds enable R8 minify and resource shrinking through `expo-build-properties` in `app.json`. Do not turn that off to hide a crash. Fix the keep rules instead.

## Repo map

```text
gt-mart/
  app/                      screens
  src/components            UI
  src/context               cart, auth, catalog, orders
  src/services/api          Supabase reads and RPCs
  src/constants/config.ts   shop name, fees, public env
  supabase/migrations       schema, in order
  docs/                     HLD, LLD, this guide

gt-mart-admin/
  src/app/(admin)           staff pages
  src/app/actions           server writes
  src/lib/auth.ts           roles
```

## Conventions

- Customer-facing copy uses RROne. Internal folders and the Expo slug stay `gt-mart`.
- Prices are rupees with two decimal places in Postgres (`numeric(10,2)`).
- Combo and announcement links copy product ids. They do not move catalog rows.
- Do not put the service-role key, Razorpay secret, or any private key in the Expo app.
