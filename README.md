# ☕ Tech Cafe — GEC Raipur

A full-stack cafe ordering web app built with Next.js 14, Supabase, and Razorpay.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.local.example .env.local
```
Fill in all values. See comments in the file for where to find each key.

### 3. Set up Supabase
- Create a project at [supabase.com](https://supabase.com)
- Paste the contents of `cafe-app-schema.sql` into the SQL Editor and run it
- Create your first cafe in Table Editor (see README section below)
- Generate VAPID keys: `npx web-push generate-vapid-keys`

### 4. Enable Google Auth (optional)
- Supabase Dashboard → Authentication → Providers → Google → Enable
- Add your Google OAuth credentials

### 5. Run
```bash
npm run dev
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (customer)/       # Customer-facing pages
│   │   ├── page.tsx      # Home / Menu
│   │   ├── cart/         # Cart
│   │   ├── checkout/     # Checkout + Razorpay
│   │   ├── orders/       # Order history
│   │   ├── track/[id]/   # Live order tracking
│   │   └── favorites/    # Saved items
│   ├── (admin)/          # Admin panel (requires admin role)
│   │   └── admin/
│   │       ├── page.tsx        # Dashboard
│   │       ├── orders/         # All orders (coming soon)
│   │       ├── menu/           # Menu CRUD
│   │       ├── coupons/        # Coupon management
│   │       ├── banners/        # Banner CRUD (coming soon)
│   │       ├── slots/          # Slot config (coming soon)
│   │       └── reports/        # CSV export
│   ├── auth/             # Login, Signup, OAuth callback
│   └── api/              # API routes
│       ├── slots/        # GET available slots
│       ├── coupons/      # POST validate coupon
│       ├── orders/       # POST create order
│       ├── payments/     # POST verify Razorpay payment
│       └── push/         # Push notification routes
├── components/
│   ├── customer/         # Customer UI components
│   └── admin/            # Admin UI components
├── hooks/                # Custom React hooks
├── lib/
│   ├── supabase/         # Supabase clients (browser, server, service)
│   └── utils.ts          # Utility functions
├── store/
│   └── cart.ts           # Zustand cart store (persisted)
└── types/
    └── index.ts          # All TypeScript types
```

---

## 🗄️ Adding Your First Cafe

1. Supabase → Table Editor → `cafes` → Insert Row
2. Fill: `name`, `slug` (e.g. `gec-cafe`), `is_active: true`
3. Copy the `id` UUID
4. SQL Editor → run the slot seed query with your cafe UUID
5. Table Editor → `profiles` → set your user's `role = admin` and `cafe_id = <your cafe UUID>`

---

## 🔑 Environment Variables

| Variable | Where to find |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `RAZORPAY_KEY_ID` | dashboard.razorpay.com → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Same as above |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as RAZORPAY_KEY_ID |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Run: `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Same command as above |
| `VAPID_EMAIL` | Your email: `mailto:you@example.com` |

---

## 🚢 Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add all environment variables in Vercel → Project Settings → Environment Variables.

---

## ✅ Features

### Customer App
- ✅ Email + Google Auth
- ✅ Banner slider
- ✅ Category tabs + search
- ✅ Menu with variants & add-ons
- ✅ Cart (persisted)
- ✅ Pickup slot selector (real-time availability)
- ✅ Coupon apply
- ✅ Razorpay payment
- ✅ Live order tracking (Supabase Realtime)
- ✅ Countdown timer during preparation
- ✅ Order history + reorder
- ✅ Favorites
- ✅ Web push notifications

### Admin Panel
- ✅ Dashboard with today's stats
- ✅ Live order feed (accept/reject/update)
- ✅ Menu CRUD (items, variants, add-ons)
- ✅ Coupon management
- ✅ Reports + CSV export
- 🔜 Banner CRUD
- 🔜 Slot configuration UI
- 🔜 Full orders history page
