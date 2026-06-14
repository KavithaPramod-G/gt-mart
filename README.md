# GT Mart

React Native mobile app for **GT Mart**, a local grocery shop with basic shopping, cash-on-delivery checkout, and WhatsApp order notifications.

## Features

- Browse groceries by category and search
- Add items to cart with quantity controls
- Checkout with delivery address (cash on delivery)
- Unique order numbers (`GT-YYYYMMDD-0001`)
- WhatsApp notification to the shop on checkout
- Order tracking timeline from placed → delivered
- WhatsApp status updates to the customer phone number

## Tech stack

- Expo SDK 56
- React Native
- TypeScript
- **NativeWind** (Tailwind CSS utility classes)
- Expo Router (file-based navigation)
- AsyncStorage for cart and order persistence

## Styling

This project uses [NativeWind](https://www.nativewind.dev/) so you can style with Tailwind classes:

```tsx
<View className="rounded-2xl bg-surface p-4">
  <Text className="text-base font-bold text-primary">GT Mart</Text>
</View>
```

Brand colors are defined in `tailwind.config.js` (`primary`, `primary-light`, `whatsapp`, etc.).

## Recommended libraries (by phase)

| Phase | Library | Why |
|-------|---------|-----|
| **Now** | NativeWind | Tailwind styling (installed) |
| **Now** | AsyncStorage | Cart/order persistence (installed) |
| **Soon** | **Zustand** or **TanStack Query** | Cleaner state + API calls when you add a backend |
| **Soon** | **React Hook Form** + **Zod** | Checkout/delivery form validation |
| **Soon** | **Supabase** or **Firebase** | Products, orders, admin panel, auth |
| **Later** | **WhatsApp Business API** (via Twilio/Meta) | Automatic order notifications without opening WhatsApp |
| **Later** | **Expo Notifications** | Push alerts for delivery status |
| **Optional** | **FlashList** | Faster product lists at scale |
| **Optional** | **expo-image** | Optimized product images when you add photos |

**Skip for now:** Redux (too heavy), payment SDKs (you chose COD), maps (unless you add live delivery tracking).

## Getting started

### Prerequisites

- Node.js **20.19.4+** (recommended; older versions may show engine warnings)
- npm
- [Expo Go](https://expo.dev/go) on your phone, or Android Studio / Xcode for emulators

### Install and run

```bash
cd C:\Users\ADMIN\Projects\gt-mart
npm install
npm start
```

Then scan the QR code with Expo Go, or press `a` for Android / `w` for web.

## Configuration

Update the shop WhatsApp number in:

`src/constants/config.ts`

```ts
export const SHOP_WHATSAPP_NUMBER = '919876543210';
```

Use country code without `+` or spaces (example above is India `91` + 10-digit mobile).

## WhatsApp flow

1. **Checkout** — opens WhatsApp with a pre-filled order message to the shop, including order number, items, total, and address.
2. **Delivery updates** — when order status advances, WhatsApp opens with an update message to the customer's phone number.
3. **Order detail screen** — view notification history and resend updates manually.

> **Note:** This MVP uses WhatsApp deep links (`wa.me`). Fully automated push notifications without opening the app require the [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp) and a backend server.

## Project structure

```
app/                 Expo Router screens
  (tabs)/            Shop, Cart, Orders tabs
  checkout.tsx       Checkout flow
  order/[id].tsx     Order details & tracking
src/
  components/        Reusable UI
  constants/         Shop config & theme
  context/           Cart & order state
  data/              Sample product catalog
  services/          WhatsApp & order number helpers
  types/             Shared TypeScript types
```

## Next steps

- Replace mock products with a real catalog (API or admin panel)
- Add shop admin app to update order status
- Integrate WhatsApp Business API for automatic notifications
- Add user accounts and saved addresses
