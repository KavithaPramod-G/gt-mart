# RROne — Marketing pamphlet & banner

Print-ready materials to promote **RROne** (GT Mart, Kavali) with a **QR code** to download the app.

## Files

| File | Use |
|------|-----|
| `pamphlet-a4.html` | **A4 pamphlet** (front + back) — handouts, shop counter |
| `banner-shop.html` | **Large shop banner** (A3 landscape) — wall, entrance |
| `config.js` | App name, WhatsApp, **download URL for QR code** |

## 1. Set your download link (important)

Edit `config.js`:

```js
appDownloadUrl: 'https://play.google.com/store/apps/details?id=com.gtmart.app',
```

- **Public Play Store:** use the link above (when app is live).
- **Alpha / closed testing:** paste your **opt-in link** from Play Console instead.

## 2. Save as PDF (easiest)

1. Open `pamphlet-a4.html` in **Chrome**.
2. Wait until the **QR code** appears.
3. **Ctrl+P** → Save as PDF → A4 → Margins **None** → **Background graphics On**.
4. Save as `RROne-pamphlet.pdf`.

Repeat for `banner-shop.html` (landscape).

## 3. Where to distribute

- GT Mart shop entrance & billing counter
- Nearby apartments & colonies
- Bus stops / busy areas in Kavali
- Partner shops, delivery bags

## 4. Print tips

- Colour print, 130–170 GSM paper; laminate for outdoor use.
- Test QR with your phone **before** bulk printing.
