# RROne / GT Mart — Low-level design

Read `docs/HLD.md` first. This document is the concrete shape of the code and database.

## Shop app layout

Expo Router maps files in `app/` to screens.

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `app/(tabs)/index.tsx` | Home. Search, or the category browser when search is empty. |
| `/category/[id]` | `app/category/[id].tsx` | One category, or `all`. |
| `/deals` | `app/deals.tsx` | Products whose MRP is above the sale price. |
| `/offer/bogo` | `app/offer/bogo.tsx` | Products with `offer_tag = 'bogo'`. |
| `/combos`, `/combo/[id]` | `app/combos.tsx`, `app/combo/[id].tsx` | Combo list and one pack. |
| `/announcement/[id]` | `app/announcement/[id].tsx` | One offer or news item, plus linked products. |
| `/cart`, `/checkout` | `app/(tabs)/cart.tsx`, `app/checkout.tsx` | Cart and place order. |
| `/orders`, `/order/[id]` | tabs and `app/order/[id].tsx` | Order list and detail. |
| `/login`, `/signup`, `/forgot-password`, `/edit-profile` | matching files | Customer account. |

Providers are nested in `app/_layout.tsx`: categories, combos, auth, cart, orders.

UI code lives in `src/components`. Network calls live in `src/services/api`. Screen state that must survive navigation lives in `src/context`. Shared TypeScript types live in `src/types/index.ts`.

## Home slides

`src/components/HomeOfferSlides.tsx` builds one horizontal list:

1. A deals slide, if any in-stock product has MRP greater than price.
2. A Buy 1 Get 1 slide, if any product has `offer_tag = 'bogo'`.
3. Up to six active combo slides.
4. Each active row in `shop_announcements`.

Every card is 188 points tall. A poster image is absolutely positioned inside that box so a tall image cannot stretch the page. Tapping a card routes to the screen for that kind. It does not open the category grid.

`src/components/CategoryHeroCards.tsx` renders those slides, then parent groups of category tiles. Every category tile uses the same width and a 56-point image.

## Catalog read

`fetchProductsPage` in `src/services/api/productsApi.ts` pages by 20. It does not filter `in_stock`, so unavailable items remain visible. Deal and search queries that must hide them do that themselves. `fetchDiscountDealProducts` keeps only in-stock rows and then drops rows where MRP is not above price.

The app treats `item_id` as the product id when it is present, otherwise the uuid. Order payloads send a uuid as `product_id` and any other id as `product_legacy_id`.

Out of stock is enforced again in `CartContext.addItem` and inside `place_order`.

## Cart

`CartContext` keeps two arrays: `items` (single products) and `combos` (packs). Both are stored together in AsyncStorage under `@gt_mart_cart`. An older cart that was only an array is still read as product lines.

The same SKU may appear once as a normal line and again inside a combo. Those are different lines. The combo line uses the pack price. The normal line uses the catalog price.

`itemCount` and `subtotal` add both arrays. Delivery fee is added at checkout from `DELIVERY_FEE` in `src/constants/config.ts`.

## Place order

`placeOrderInDb` calls the Postgres function `place_order`. The client total is sent, but the function recomputes it.

Product line payload:

```json
{ "product_id": "uuid or null", "product_legacy_id": "item id or null", "name": "", "price": 0, "quantity": 1, "unit": "" }
```

Combo line payload:

```json
{ "combo_id": "uuid", "quantity": 1 }
```

The function:

- Rejects an empty cart, a bad phone, or a total below the minimum.
- For a product line, loads the product, rejects it when `in_stock` is false, and uses `products.price`.
- For a combo line, loads the active combo, rejects it when any included product is missing or out of stock, and uses `combo_offers.combo_price`.
- Inserts one `orders` row and one `order_items` row per line. Combo lines set `combo_offer_id`, leave `product_id` null, and store the included names in `details`.
- Inserts the first `order_notifications` row.
- Returns the order uuid.

Payment method is `cod` or `upi`. New orders start as `payment_status = 'pending'`. Staff later set UPI orders to `verified`.

## Customer session

`src/services/api/authApi.ts` calls database functions for register, password login, OTP, session check, and logout. The session id is kept on the device. Orders are loaded with that session or with phone plus order id. The anon key cannot select every order directly.

## Admin app layout

Pages live in `gt-mart-admin/src/app/(admin)`. Writes go through files in `src/app/actions` and use `createAdminSupabaseClient()`. That client is server-only.

Roles in `src/lib/auth.ts`:

| Role | Home | Allowed work |
| --- | --- | --- |
| `admin` | `/overview` | Full catalog, offers, orders, counters, purchases. |
| `catalog` | `/products` | Products and categories. Image changes can require review. |
| `employee` | `/purchase` | Purchase entry and credit bills. |

Combo create, announcement publish, and order payment verification require `admin`.

Copying products into a combo uses `combo_offer_items`. The product row stays in its category. The same pattern is used for `shop_announcement_products`: the announcement stores product ids, and the product remains in the normal catalog.

## Database tables developers touch most

| Table | Role |
| --- | --- |
| `categories` | Text id, label, colors, image, parent group. |
| `category_parent_groups` | Section titles on the home grid. |
| `products` | `item_id`, `item_name`, `mrp`, `price`, `unit`, `image_urls`, `in_stock`, `offer_tag`. |
| `combo_offers`, `combo_offer_items` | Pack title and price, plus included products and quantities. |
| `shop_announcements` | Home slide. `kind` is `offer` or `news`. Optional `image_url` and `category_id`. |
| `shop_announcement_products` | Products copied onto that slide. |
| `profiles` | Customer name, phone, address. |
| `orders`, `order_items`, `order_notifications` | Placed orders. Status enum includes `cancelled`. |
| `admin_users` | Staff login. Passwords are hashed. Not used by the phone app. |

Public read policies:

- Products: all rows, including out of stock.
- Combos and announcements: `active = true` only.
- Announcement product links: only while the parent announcement is active.

Migrations are ordered files in `gt-mart/supabase/migrations`. Later files replace functions such as `place_order`. The latest definition wins. Apply a new file in the Supabase SQL editor. Do not rewrite a migration that has already been applied.

## Offer data, side by side

| Offer | Stored as | Price rule | Customer screen |
| --- | --- | --- | --- |
| Today's deal | `mrp > price` on `products` | Sale price is `price` | `/deals` |
| Buy 1 Get 1 | `products.offer_tag = 'bogo'` | Catalog `price` is unchanged | `/offer/bogo` |
| Combo | `combo_offers` + items | `combo_price` only | `/combo/[id]` |
| News or poster | `shop_announcements` | No price | `/announcement/[id]` |

## Config the phone reads

Public values use `EXPO_PUBLIC_*` in `.env` for local web and in `eas.json` for store builds. Names include `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SHOP_UPI_ID`, and `EXPO_PUBLIC_SHOP_UPI_PAYEE_NAME`. Shop name, minimum order, and delivery fee are constants in `src/constants/config.ts`.

The admin service-role key stays in the admin server environment. It is not an `EXPO_PUBLIC_` variable.
