# RROne / GT Mart — High-level design

This document explains the system for a developer who is new to the shop. The customer app is branded **RROne**. The store in Kavali is **GT Mart**. Both names refer to the same system.

## What the system does

Customers browse a live grocery catalog, add items or combo packs to a cart, and place an order for local delivery. Staff run the catalog, offers, and orders from a separate admin website. Money is collected as cash on delivery, or as a shop UPI payment that staff confirm by hand. Razorpay is not part of the system yet.

## System context

```text
Customer phone (RROne)
        |
        | anon Supabase key, read catalog, call place_order
        v
Supabase Postgres + Auth RPCs
        ^
        | service-role key, server actions only
        |
Admin website (staff browser)
```

There is no custom API server. The database is the backend. Postgres functions enforce order prices, stock, and customer sessions.

## Repositories

| Repo | Runtime | Who uses it |
| --- | --- | --- |
| `gt-mart` | Expo SDK 56, React Native 0.85, expo-router, NativeWind | Customers. Android package `com.gtmart.app`. Web preview on port 8081. |
| `gt-mart-admin` | Next.js 16, React 19 | Shop staff. Local dev on port 3000. |
| Supabase project | Postgres, Row Level Security, RPCs | Shared by both apps. SQL lives in `gt-mart/supabase/migrations`. |

A change in the mobile JavaScript is visible on localhost immediately. Customers on the Play Store receive it only after a new Android App Bundle is built and rolled out. Admin changes are visible as soon as that website is deployed. Database changes are visible only after the SQL file is run in the Supabase SQL editor.

## Main parts

**Shop app.** Home shows offer slides, then category tiles. Product lists, cart, checkout, orders, and profile are separate screens. The cart is stored on the device. Catalog and orders come from Supabase.

**Admin app.** Staff sign in with an admin account, not a customer account. Full admins manage products, categories, combo packs, announcements, orders, counters, and purchases. Catalog staff can edit products and categories. Employees are limited to purchase and credit screens.

**Database.** Products, categories, customers, orders, combo packs, and home announcements. Customers can read the catalog and call a small set of functions. They cannot update prices or stock. The admin website uses the service-role key on the server, so it bypasses Row Level Security.

## Important business rules

- A product keeps one catalog sale price. Putting it in a combo or an announcement copies the link. It does not move the product or change `products.price`.
- A combo discount exists only as `combo_offers.combo_price`.
- Today's deals are not a separate table. A product is a deal when its MRP is higher than its sale price and it is in stock.
- Buy 1 Get 1 is a tag on the product (`offer_tag = 'bogo'`). The tag does not change the price.
- Out-of-stock products stay visible with a label. The cart and `place_order` refuse them.
- The phone may send a price. `place_order` ignores it and reads the current price from the database.
- Minimum order amount is ₹500. Delivery fee is ₹0.

## Main flows

**Browse.** The app loads categories, parent groups, active combos, discounted products, Buy 1 Get 1 products, and active announcements. The home screen builds slides from that data. A slide opens its own screen. Category tiles open the normal category grid.

**Order.** Checkout sends product lines and combo lines to `place_order`. The function checks stock, prices each line, writes `orders` and `order_items`, and returns the new order id. The app then loads that order and opens WhatsApp with the order message when the customer allows it.

**UPI.** The customer pays the shop UPI id outside the app, then can attach a screenshot. Staff mark the order payment as verified in admin. There is no payment gateway callback.

**Catalog edit.** Admin writes products with the service-role client. The next catalog read on the phone shows the change. Image uploads from catalog staff can wait for admin review before they appear in the app.

## Security boundary

| Actor | Can do | Cannot do |
| --- | --- | --- |
| Customer app (anon key) | Read products, active combos, active announcements. Register, log in, place an order, read own orders. | Change prices, stock, offers, or another customer's order. |
| Admin server (service role) | Create and edit catalog, offers, and order status. | This key must never ship inside the phone app. |

Customer login is a phone session stored by the app, backed by database functions. It is not Supabase Auth email login.

## What this design leaves out

Razorpay, card payments, and automatic payment capture are not implemented. Offline mode is limited to the cart and a local fallback order only when Supabase is not configured. iOS is configured but the released client is Android.
