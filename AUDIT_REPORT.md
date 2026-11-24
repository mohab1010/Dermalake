# Dermalake — Audit Report

_Status: Phase 1 done · Step 1 fixes done (commits b7f91ad, 483bad5, 78d922c). Decision: only the store admin logs in; customer accounts are out of scope._

## 1. Stack

| Layer | What it is |
|---|---|
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind v4, react-router 7, zustand, i18next (AR/EN, RTL) |
| Backend | **None.** The browser talks to Firebase directly. |
| Database | Cloud Firestore (`eur3`) — collections: `products`, `categories`, `home_slides`, `offers`, `reviews`, `orders` |
| Auth | Firebase Auth (email/password), admin only. No customer accounts. |
| Storage | Firebase Storage (product/category images) |
| Payment | Cash on delivery only. No payment provider. |
| Hosting | Firebase Hosting (`dist/`, SPA rewrite) |
| Security | `firebase/firestore.rules`, `firebase/storage.rules` (admin = hard-coded email list) |
| Env | `.env.local` (git-ignored, OK), `.env.example` committed |

Run: `npm install && npm run dev`. Without `.env.local` the site runs in demo mode using the bundled seed data.

Current health: `npm run build` ✅ (warning: firebase chunk 594 kB) · `npm run lint` ✅ · `npm run test:e2e` ✅ 14/14 (desktop + mobile).

## 2. Flow map

### Customer flows — existing
- Home (slides, featured, categories), offers popup
- Shop: category filter, skin-type filter, search, sort
- Product page: images, price/sale price, stock, ingredients, how-to-use, leaflet sections, reviews + rating breakdown, submit review
- Cart (localStorage): add/remove/qty, capped at stock
- Wishlist (localStorage)
- Checkout (guest, COD): form validation, Egyptian phone check, re-fetches prices/stock before submitting → order-success page
- Language switch AR/EN

### Admin flows — existing
- Login / logout
- Dashboard stats (from live orders + products)
- Orders: live list, status filter, details, change status
- Products CRUD + image upload + active toggle
- Categories CRUD, home slides CRUD, offers CRUD, reviews delete

### Missing compared with a standard store
- ~~Customer accounts~~ — out of scope (owner decision: guest checkout only)
- Order tracking for customers (status changes are invisible to them)
- **Coupon field at checkout.** Offers show a coupon code the customer can't use anywhere.
- Order confirmation email / WhatsApp notification to the customer and to the admin
- Online payment
- Stock decrement on order, inventory management
- Variants/sizes, brand/concern/price filters, pagination on the shop page
- Customers page in admin, coupon management
- SEO: per-page titles/descriptions, product structured data (single static `<title>` today)
- Automated tests

## 3. Findings

| # | Pri | Issue | Status |
|---|---|---|---|
| 0 | **P0 — SECURITY INCIDENT** | `eslint.config.js` contained obfuscated malware, hidden after a long run of spaces on line 25. It reads a blockchain wallet's transactions to find a command server, downloads code from it, and runs it as a detached hidden `node` process. It arrived in commit `a5a7165` (2026-07-24), which was committed from the owner's machine alongside normal work, so the machine was most likely already infected. This copy could not run: it re-declared `createRequire`, which is why `npm run lint` crashed. Repo scan: no other infected files, and none in `node_modules`. | fixed in repo; **machine + credentials need owner action** |
| 1 | P0 | **Client-reported bug.** Firestore/Storage rules accept only `ferashatem02@gmail.com` as admin, but the app lets *any* signed-in Firebase user into `/admin`. Other accounts see "حصلت مشكلة" on every page and can't save anything. | fixed — app now signs out non-admin accounts with a clear message. If the admin still sees the error on the admin account, the deployed rules are out of date → run `npx firebase-tools deploy --only firestore:rules,storage` |
| 2 | P0 | Orders page shows the error **and** "جاري التحميل..." forever when loading fails (no final error state). Same pattern on the dashboard, categories, home slides. | fixed — specific message (no permission / connection) + retry |
| 3 | P0 | **Prices/totals are trusted from the browser.** Rules check only that fields exist, so anyone can create an order with `price: 1, total: 1`. Checkout's re-check runs in the browser and can be bypassed. | open |
| 4 | P0 | **Stock is never decremented** when an order is placed, so the same last unit can be sold many times. | open |
| 5 | P1 | The `sales_count` rule lets anyone add up to +50 per write with no order, so best-seller rankings can be gamed. | open |
| 6 | P1 | The review rule lets anyone write any `rating` value as long as `reviews_count` goes up by 1, so product stars can be forged. No spam limit on reviews. | open |
| 7 | P1 | Cart stores a product snapshot, so prices shown in the cart can be stale until checkout. | open |
| 8 | P1 | Offers popup advertises coupon codes, but checkout has no coupon support. | needs decision |
| 9 | P1 | `npm run lint` is broken. | fixed (cause was the malware, #0) + 3 lint errors fixed |
| 10 | P2 | Root `firestore.rules` (deny-all) duplicates `firebase/firestore.rules`, which is confusing. README still says to paste rules by hand. | open |
| 11 | P2 | Firebase bundle is 594 kB (all modules in one chunk; could split auth/storage to admin only). | open |
| 12 | P2 | No per-page SEO titles/meta, no product JSON-LD. | open |
| 13 | P2 | No automated tests. | fixed — see Tests |

## 4. Needs your decision

1. ~~Admin email(s)~~ — only the owner's admin account is used.
2. **Server-side order validation (#3, #4).** Two options:
   - **A (free):** enforce in Firestore rules. Cap orders at ~10 line items, check each item's price against the product with `get()`, check `subtotal + shipping == total`, and decrement stock in the same transaction. This covers the main tampering cases without paid services.
   - **B (paid):** a Cloud Function `placeOrder` that computes everything server-side and can also send emails. Requires the Firebase **Blaze** plan (pay-as-you-go, usually ~$0 at this scale, but a card is needed).
3. **Coupons (#8).** Implement real coupons (percent/fixed, expiry, min order), or remove the code box from offers?
4. **Customer accounts / order tracking / emails.** Are these in scope for this release? Emails need Blaze or a third-party service.
5. **Shipping rules.** Currently a flat 60 EGP, free above 800. Any per-city pricing?

## 5. Plan

- **Step 1 (P0, today, no decisions needed except #1):** admin-email gate in the app plus a clear "not authorized" screen, proper error/empty states on Orders and Dashboard, fix lint, add Playwright smoke tests (storefront → cart → checkout in demo mode; admin redirect/guard).
- **Step 2 (P0, after decision #2):** order integrity (prices, totals, stock) plus tightened review/sales rules, with rules tests.
- **Step 3 (P1/P2):** cart price refresh, coupons if approved, SEO titles/meta/JSON-LD, bundle split, README/rules cleanup.

## 6. Tests

`npm run test:e2e` (first time: `npx playwright install chromium`). Starts Vite in demo mode, so it never touches production Firestore. Runs on desktop Chrome and Pixel 7.

Covers: home renders with no console errors · shop lists products, search with no results · cart persists across reload, quantity update · checkout required-field and phone validation → order placed → cart cleared · empty cart can't check out · `/admin/*` redirects to login when signed out · 404 page.

Not automated: real admin login/rejection (needs a Firebase test project or the emulator; recommended next).
