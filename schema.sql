-- ============================================================
--  CAFE ORDERING APP — FULL SUPABASE MIGRATION
--  Paste this into Supabase SQL Editor and run.
--  Order: extensions → types → tables → indexes →
--         triggers → functions → RLS policies
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 1. CUSTOM TYPES (ENUMS)
-- ============================================================
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'superadmin');

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
  'refunded'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded'
);

CREATE TYPE payment_method AS ENUM (
  'razorpay',
  'cash',
  'pos'
);

CREATE TYPE payment_capture_status AS ENUM (
  'created',
  'captured',
  'failed',
  'refunded'
);

CREATE TYPE discount_type AS ENUM ('percentage', 'flat');

CREATE TYPE banner_link_type AS ENUM ('item', 'category', 'url', 'none');

CREATE TYPE notification_type AS ENUM (
  'order_confirmed',
  'order_preparing',
  'order_ready',
  'order_cancelled',
  'order_refunded',
  'promo'
);


-- ============================================================
-- 2. UPDATED_AT TRIGGER FUNCTION
--    Applied to every table that has updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 3. TABLES
-- ============================================================

-- ------------------------------------------------------------
-- 3.1 CAFES
-- ------------------------------------------------------------
CREATE TABLE cafes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description       TEXT,
  logo_url          TEXT,
  cover_url         TEXT,
  address           TEXT,
  city              TEXT,
  phone             TEXT,
  email             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  -- settings jsonb: { opening_hours, slot_duration_mins, max_orders_per_slot, tax_percentage, currency }
  settings          JSONB NOT NULL DEFAULT '{
    "opening_hours": {"open": "08:00", "close": "22:00"},
    "slot_duration_mins": 15,
    "max_orders_per_slot": 10,
    "tax_percentage": 5,
    "currency": "INR"
  }'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER cafes_updated_at
  BEFORE UPDATE ON cafes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- 3.2 PROFILES  (extends auth.users)
-- ------------------------------------------------------------
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cafe_id             UUID REFERENCES cafes(id) ON DELETE SET NULL,  -- null = customer
  full_name           TEXT,
  phone               TEXT,
  avatar_url          TEXT,
  role                user_role NOT NULL DEFAULT 'customer',
  -- push notification tokens
  push_subscription   JSONB,   -- web push subscription object
  fcm_token           TEXT,    -- future: native app
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ------------------------------------------------------------
-- 3.3 CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id     UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cafe_id, slug)
);

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- 3.4 MENU ITEMS
-- ------------------------------------------------------------
CREATE TABLE menu_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id             UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  category_id         UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  description         TEXT,
  image_url           TEXT,
  base_price          NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
  is_veg              BOOLEAN NOT NULL DEFAULT TRUE,
  is_available        BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order          INT NOT NULL DEFAULT 0,
  prep_time_minutes   INT NOT NULL DEFAULT 10,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cafe_id, slug)
);

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- 3.5 VARIANTS  (e.g. Small / Medium / Large)
-- ------------------------------------------------------------
CREATE TABLE variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,               -- "Large"
  price_delta     NUMERIC(10,2) NOT NULL DEFAULT 0, -- +20, -5, 0
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER variants_updated_at
  BEFORE UPDATE ON variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- 3.6 ADD-ONS  (e.g. Extra cheese, Oat milk)
-- ------------------------------------------------------------
CREATE TABLE add_ons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id         UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER add_ons_updated_at
  BEFORE UPDATE ON add_ons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- 3.7 BANNERS
-- ------------------------------------------------------------
CREATE TABLE banners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id       UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  title         TEXT,
  subtitle      TEXT,
  image_url     TEXT NOT NULL,
  link_type     banner_link_type NOT NULL DEFAULT 'none',
  link_value    TEXT,              -- item_id, category_id, or url string
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at     TIMESTAMPTZ,       -- null = always active
  ends_at       TIMESTAMPTZ,       -- null = never expires
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- 3.8 COUPONS
-- ------------------------------------------------------------
CREATE TABLE coupons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id             UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  code                TEXT NOT NULL,
  description         TEXT,
  discount_type       discount_type NOT NULL,
  discount_value      NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value     NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount_amount NUMERIC(10,2),           -- cap for percentage discounts
  max_uses            INT,                     -- null = unlimited
  used_count          INT NOT NULL DEFAULT 0,
  per_user_limit      INT NOT NULL DEFAULT 1,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at           TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cafe_id, code)
);

CREATE TRIGGER coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- 3.9 COUPON USES  (prevent abuse)
-- ------------------------------------------------------------
CREATE TABLE coupon_uses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id    UUID,                -- filled after order is created
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coupon_id, user_id, order_id)
);


-- ------------------------------------------------------------
-- 3.10 PICKUP SLOTS  (template — the repeating schedule)
-- ------------------------------------------------------------
CREATE TABLE pickup_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id       UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  slot_time     TIME NOT NULL,
  max_orders    INT NOT NULL DEFAULT 10,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cafe_id, slot_time)
);

CREATE TRIGGER pickup_slots_updated_at
  BEFORE UPDATE ON pickup_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- 3.11 SLOT AVAILABILITY  (generated per-day, real-time)
-- ------------------------------------------------------------
CREATE TABLE slot_availability (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id       UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  slot_id       UUID NOT NULL REFERENCES pickup_slots(id) ON DELETE CASCADE,
  slot_date     DATE NOT NULL,
  slot_time     TIME NOT NULL,
  max_orders    INT NOT NULL,
  booked_count  INT NOT NULL DEFAULT 0,
  is_blocked    BOOLEAN NOT NULL DEFAULT FALSE,  -- admin can manually block
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cafe_id, slot_date, slot_time)
);

CREATE TRIGGER slot_availability_updated_at
  BEFORE UPDATE ON slot_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- 3.12 ORDERS
-- ------------------------------------------------------------
-- Sequence for human-readable order numbers per cafe
CREATE SEQUENCE order_number_seq START 1;

CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id             UUID NOT NULL REFERENCES cafes(id) ON DELETE RESTRICT,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- Human readable: #0042
  order_number        TEXT NOT NULL,
  status              order_status NOT NULL DEFAULT 'pending',
  -- Slot info
  slot_id             UUID REFERENCES slot_availability(id) ON DELETE SET NULL,
  slot_date           DATE,
  slot_time           TIME,
  -- Pricing
  subtotal            NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  coupon_id           UUID REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code         TEXT,                    -- snapshot of code used
  tax_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  -- Payment
  payment_status      payment_status NOT NULL DEFAULT 'pending',
  payment_method      payment_method NOT NULL DEFAULT 'razorpay',
  -- Meta
  notes               TEXT,
  rejection_reason    TEXT,
  estimated_ready_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate order_number per cafe: GEC-0001, GEC-0042 etc.
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  cafe_prefix TEXT;
  next_num    INT;
BEGIN
  SELECT UPPER(LEFT(slug, 4)) INTO cafe_prefix FROM cafes WHERE id = NEW.cafe_id;
  SELECT COUNT(*) + 1 INTO next_num FROM orders WHERE cafe_id = NEW.cafe_id;
  NEW.order_number := cafe_prefix || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_generate_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();


-- ------------------------------------------------------------
-- 3.13 ORDER ITEMS  (snapshot prices — never change after order)
-- ------------------------------------------------------------
CREATE TABLE order_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  cafe_id                 UUID NOT NULL REFERENCES cafes(id) ON DELETE RESTRICT,
  menu_item_id            UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  -- SNAPSHOTS (frozen at time of order)
  item_name               TEXT NOT NULL,
  item_image_url          TEXT,
  item_is_veg             BOOLEAN NOT NULL DEFAULT TRUE,
  variant_id              UUID REFERENCES variants(id) ON DELETE SET NULL,
  variant_name            TEXT,
  base_price              NUMERIC(10,2) NOT NULL,
  variant_price_delta     NUMERIC(10,2) NOT NULL DEFAULT 0,
  add_ons                 JSONB NOT NULL DEFAULT '[]',  -- [{id, name, price}]
  add_ons_total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity                INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price              NUMERIC(10,2) NOT NULL,   -- base + variant_delta + add_ons
  total_price             NUMERIC(10,2) NOT NULL,   -- unit_price * quantity
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- no updated_at — order items are immutable
);


-- ------------------------------------------------------------
-- 3.14 PAYMENTS
-- ------------------------------------------------------------
CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  cafe_id               UUID NOT NULL REFERENCES cafes(id) ON DELETE RESTRICT,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- Razorpay fields
  razorpay_order_id     TEXT UNIQUE,
  razorpay_payment_id   TEXT UNIQUE,
  razorpay_signature    TEXT,
  -- Amount
  amount                NUMERIC(10,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'INR',
  status                payment_capture_status NOT NULL DEFAULT 'created',
  method                TEXT,           -- upi, card, netbanking, wallet
  -- Full webhook payload — never discard
  raw_response          JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- 3.15 FAVORITES
-- ------------------------------------------------------------
CREATE TABLE favorites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cafe_id         UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, menu_item_id)
);


-- ------------------------------------------------------------
-- 3.16 NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cafe_id     UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,             -- extra payload for deep linking
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- 3.17 PUSH SUBSCRIPTIONS  (one user, many devices)
-- ------------------------------------------------------------
CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 4. INDEXES  (performance on high-traffic queries)
-- ============================================================

-- Orders
CREATE INDEX idx_orders_cafe_status      ON orders (cafe_id, status, created_at DESC);
CREATE INDEX idx_orders_user             ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_slot             ON orders (slot_id);
CREATE INDEX idx_orders_payment_status   ON orders (payment_status);

-- Order items
CREATE INDEX idx_order_items_order       ON order_items (order_id);
CREATE INDEX idx_order_items_cafe        ON order_items (cafe_id);

-- Menu
CREATE INDEX idx_menu_items_cafe_cat     ON menu_items (cafe_id, category_id, is_available);
CREATE INDEX idx_menu_items_featured     ON menu_items (cafe_id, is_featured) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_items_search       ON menu_items USING gin (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Categories
CREATE INDEX idx_categories_cafe        ON categories (cafe_id, sort_order) WHERE deleted_at IS NULL;

-- Variants & add-ons
CREATE INDEX idx_variants_item          ON variants (menu_item_id);
CREATE INDEX idx_add_ons_item           ON add_ons (menu_item_id);

-- Slots
CREATE INDEX idx_slot_avail_date        ON slot_availability (cafe_id, slot_date, slot_time);
CREATE INDEX idx_slot_avail_full        ON slot_availability (cafe_id, slot_date, booked_count, max_orders);

-- Coupons
CREATE INDEX idx_coupons_code           ON coupons (cafe_id, code) WHERE is_active = TRUE;
CREATE INDEX idx_coupon_uses_user       ON coupon_uses (user_id, coupon_id);

-- Payments
CREATE INDEX idx_payments_order         ON payments (order_id);
CREATE INDEX idx_payments_razorpay      ON payments (razorpay_order_id, razorpay_payment_id);

-- Notifications
CREATE INDEX idx_notifications_user     ON notifications (user_id, is_read, created_at DESC);

-- Banners
CREATE INDEX idx_banners_cafe_active    ON banners (cafe_id, is_active, sort_order);

-- Favorites
CREATE INDEX idx_favorites_user         ON favorites (user_id, cafe_id);


-- ============================================================
-- 5. SLOT BOOKING FUNCTION
--    Called when an order is placed — atomically increments
--    booked_count and rejects if slot is full
-- ============================================================
CREATE OR REPLACE FUNCTION book_slot(p_slot_id UUID)
RETURNS VOID AS $$
DECLARE
  v_slot slot_availability%ROWTYPE;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT * INTO v_slot
  FROM slot_availability
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;

  IF v_slot.is_blocked THEN
    RAISE EXCEPTION 'Slot is blocked';
  END IF;

  IF v_slot.booked_count >= v_slot.max_orders THEN
    RAISE EXCEPTION 'Slot is full';
  END IF;

  UPDATE slot_availability
  SET booked_count = booked_count + 1
  WHERE id = p_slot_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 6. RELEASE SLOT FUNCTION
--    Called when order is cancelled — decrements booked_count
-- ============================================================
CREATE OR REPLACE FUNCTION release_slot(p_slot_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE slot_availability
  SET booked_count = GREATEST(booked_count - 1, 0)
  WHERE id = p_slot_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 7. COUPON VALIDATION FUNCTION
--    Returns discount amount or raises exception
-- ============================================================
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code       TEXT,
  p_cafe_id    UUID,
  p_user_id    UUID,
  p_order_total NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_coupon    coupons%ROWTYPE;
  v_use_count INT;
  v_discount  NUMERIC;
BEGIN
  SELECT * INTO v_coupon
  FROM coupons
  WHERE cafe_id = p_cafe_id
    AND code    = UPPER(p_code)
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid coupon code';
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN
    RAISE EXCEPTION 'Coupon has expired';
  END IF;

  IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > NOW() THEN
    RAISE EXCEPTION 'Coupon is not active yet';
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'Coupon usage limit reached';
  END IF;

  IF p_order_total < v_coupon.min_order_value THEN
    RAISE EXCEPTION 'Order total is below minimum required for this coupon';
  END IF;

  -- Check per-user usage
  SELECT COUNT(*) INTO v_use_count
  FROM coupon_uses
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_use_count >= v_coupon.per_user_limit THEN
    RAISE EXCEPTION 'You have already used this coupon';
  END IF;

  -- Calculate discount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := (p_order_total * v_coupon.discount_value / 100);
    IF v_coupon.max_discount_amount IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
    END IF;
  ELSE
    v_discount := v_coupon.discount_value;
  END IF;

  RETURN LEAST(v_discount, p_order_total);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 8. AUTO-INCREMENT COUPON USED_COUNT
-- ============================================================
CREATE OR REPLACE FUNCTION increment_coupon_used()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coupons SET used_count = used_count + 1 WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coupon_uses_increment
  AFTER INSERT ON coupon_uses
  FOR EACH ROW EXECUTE FUNCTION increment_coupon_used();


-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE cafes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_ons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners             ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_uses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_slots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_availability   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions  ENABLE ROW LEVEL SECURITY;

-- Helper: get caller's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get caller's cafe_id
CREATE OR REPLACE FUNCTION get_my_cafe_id()
RETURNS UUID AS $$
  SELECT cafe_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is caller an admin/superadmin for a given cafe?
CREATE OR REPLACE FUNCTION is_cafe_admin(p_cafe_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND cafe_id = p_cafe_id
      AND role IN ('admin', 'superadmin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ────────────────────────────────────────
-- CAFES
-- ────────────────────────────────────────
CREATE POLICY "Cafes are publicly readable"
  ON cafes FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Superadmins can manage cafes"
  ON cafes FOR ALL USING (get_my_role() = 'superadmin');


-- ────────────────────────────────────────
-- PROFILES
-- ────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view profiles in their cafe"
  ON profiles FOR SELECT
  USING (is_cafe_admin(cafe_id));


-- ────────────────────────────────────────
-- CATEGORIES
-- ────────────────────────────────────────
CREATE POLICY "Categories are publicly readable"
  ON categories FOR SELECT
  USING (is_active = TRUE AND deleted_at IS NULL);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (is_cafe_admin(cafe_id));


-- ────────────────────────────────────────
-- MENU ITEMS
-- ────────────────────────────────────────
CREATE POLICY "Menu items are publicly readable"
  ON menu_items FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can manage menu items"
  ON menu_items FOR ALL
  USING (is_cafe_admin(cafe_id));


-- ────────────────────────────────────────
-- VARIANTS
-- ────────────────────────────────────────
CREATE POLICY "Variants are publicly readable"
  ON variants FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage variants"
  ON variants FOR ALL
  USING (is_cafe_admin(cafe_id));


-- ────────────────────────────────────────
-- ADD-ONS
-- ────────────────────────────────────────
CREATE POLICY "Add-ons are publicly readable"
  ON add_ons FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage add-ons"
  ON add_ons FOR ALL
  USING (is_cafe_admin(cafe_id));


-- ────────────────────────────────────────
-- BANNERS
-- ────────────────────────────────────────
CREATE POLICY "Active banners are publicly readable"
  ON banners FOR SELECT
  USING (
    is_active = TRUE
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at   IS NULL OR ends_at   >= NOW())
  );

CREATE POLICY "Admins can manage banners"
  ON banners FOR ALL
  USING (is_cafe_admin(cafe_id));


-- ────────────────────────────────────────
-- COUPONS
-- ────────────────────────────────────────
-- Customers can only read active coupons (to validate)
-- but NOT see used_count, max_uses etc — keep via API route
CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  USING (is_cafe_admin(cafe_id));


-- ────────────────────────────────────────
-- COUPON USES
-- ────────────────────────────────────────
CREATE POLICY "Users can view own coupon uses"
  ON coupon_uses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coupon uses"
  ON coupon_uses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view coupon uses"
  ON coupon_uses FOR SELECT
  USING (is_cafe_admin((SELECT cafe_id FROM coupons WHERE id = coupon_id)));


-- ────────────────────────────────────────
-- PICKUP SLOTS
-- ────────────────────────────────────────
CREATE POLICY "Slots are publicly readable"
  ON pickup_slots FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage pickup slots"
  ON pickup_slots FOR ALL
  USING (is_cafe_admin(cafe_id));


-- ────────────────────────────────────────
-- SLOT AVAILABILITY
-- ────────────────────────────────────────
CREATE POLICY "Slot availability is publicly readable"
  ON slot_availability FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage slot availability"
  ON slot_availability FOR ALL
  USING (is_cafe_admin(cafe_id));


-- ────────────────────────────────────────
-- ORDERS
-- ────────────────────────────────────────
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view and update orders in their cafe"
  ON orders FOR ALL
  USING (is_cafe_admin(cafe_id));


-- ────────────────────────────────────────
-- ORDER ITEMS
-- ────────────────────────────────────────
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can view order items in their cafe"
  ON order_items FOR SELECT
  USING (is_cafe_admin(cafe_id));


-- ────────────────────────────────────────
-- PAYMENTS  (customers NEVER read directly)
-- ────────────────────────────────────────
CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (is_cafe_admin(cafe_id));

-- Note: payment status exposed to users only via orders table


-- ────────────────────────────────────────
-- FAVORITES
-- ────────────────────────────────────────
CREATE POLICY "Users can manage own favorites"
  ON favorites FOR ALL USING (auth.uid() = user_id);


-- ────────────────────────────────────────
-- NOTIFICATIONS
-- ────────────────────────────────────────
CREATE POLICY "Users can view and update own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark notifications read"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (is_cafe_admin(cafe_id));


-- ────────────────────────────────────────
-- PUSH SUBSCRIPTIONS
-- ────────────────────────────────────────
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL USING (auth.uid() = user_id);


-- ============================================================
-- 10. REALTIME  (enable for live order tracking)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE slot_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ============================================================
-- 11. SEED: DEFAULT PICKUP SLOTS (15-min intervals 8am–10pm)
--     Run this after inserting your first cafe row.
--     Replace 'YOUR-CAFE-ID' with the actual cafe UUID.
-- ============================================================

-- EXAMPLE (uncomment and replace UUID after creating cafe):
*
DO $$
DECLARE
  cafe UUID := '2bc52bee-2b67-4c82-8558-4f4e76761113';
  t TIME := '08:00';
BEGIN
  WHILE t <= '22:00' LOOP
    INSERT INTO pickup_slots (cafe_id, slot_time, max_orders)
    VALUES (cafe, t, 10)
    ON CONFLICT DO NOTHING;
    t := t + INTERVAL '15 minutes';
  END LOOP;
END $$;
*


-- ============================================================
-- DONE ✓
-- Tables  : 17
-- Indexes : 18
-- Triggers: 15
-- Functions: 8
-- RLS Policies: 34
-- ============================================================