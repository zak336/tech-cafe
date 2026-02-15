// ============================================================
//  TECH CAFE — GLOBAL TYPE DEFINITIONS
//  Mirrors the database schema exactly
// ============================================================

export type UserRole = 'customer' | 'admin' | 'superadmin'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod = 'razorpay' | 'cash' | 'pos'
export type PaymentCaptureStatus = 'created' | 'captured' | 'failed' | 'refunded'
export type DiscountType = 'percentage' | 'flat'
export type BannerLinkType = 'item' | 'category' | 'url' | 'none'
export type NotificationType = 'order_confirmed' | 'order_preparing' | 'order_ready' | 'order_cancelled' | 'order_refunded' | 'promo'

// ─── Cafe ─────────────────────────────────────────────────────
export interface CafeSettings {
  opening_hours: { open: string; close: string }
  slot_duration_mins: number
  max_orders_per_slot: number
  tax_percentage: number
  currency: string
}

export interface Cafe {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  cover_url: string | null
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  settings: CafeSettings
  created_at: string
  updated_at: string
}

// ─── Profile ──────────────────────────────────────────────────
export interface Profile {
  id: string
  cafe_id: string | null
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: UserRole
  push_subscription: PushSubscriptionJSON | null
  fcm_token: string | null
  created_at: string
  updated_at: string
}

// ─── Category ─────────────────────────────────────────────────
export interface Category {
  id: string
  cafe_id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// ─── Menu Item ────────────────────────────────────────────────
export interface MenuItem {
  id: string
  cafe_id: string
  category_id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  base_price: number
  is_veg: boolean
  is_available: boolean
  is_featured: boolean
  sort_order: number
  prep_time_minutes: number
  deleted_at: string | null
  created_at: string
  updated_at: string
  // joined
  category?: Category
  variants?: Variant[]
  add_ons?: AddOn[]
}

// ─── Variant ──────────────────────────────────────────────────
export interface Variant {
  id: string
  cafe_id: string
  menu_item_id: string
  name: string
  price_delta: number
  is_default: boolean
  is_available: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ─── Add-on ───────────────────────────────────────────────────
export interface AddOn {
  id: string
  cafe_id: string
  menu_item_id: string
  name: string
  price: number
  is_available: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ─── Banner ───────────────────────────────────────────────────
export interface Banner {
  id: string
  cafe_id: string
  title: string | null
  subtitle: string | null
  image_url: string
  link_type: BannerLinkType
  link_value: string | null
  sort_order: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
}

// ─── Coupon ───────────────────────────────────────────────────
export interface Coupon {
  id: string
  cafe_id: string
  code: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  min_order_value: number
  max_discount_amount: number | null
  max_uses: number | null
  used_count: number
  per_user_limit: number
  is_active: boolean
  starts_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

// ─── Slot ─────────────────────────────────────────────────────
export interface PickupSlot {
  id: string
  cafe_id: string
  slot_time: string
  max_orders: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SlotAvailability {
  id: string
  cafe_id: string
  slot_id: string
  slot_date: string
  slot_time: string
  max_orders: number
  booked_count: number
  is_blocked: boolean
  created_at: string
  updated_at: string
  // computed
  is_full?: boolean
  is_available?: boolean
}

// ─── Order ────────────────────────────────────────────────────
export interface Order {
  id: string
  cafe_id: string
  user_id: string
  order_number: string
  status: OrderStatus
  slot_id: string | null
  slot_date: string | null
  slot_time: string | null
  subtotal: number
  discount_amount: number
  coupon_id: string | null
  coupon_code: string | null
  tax_amount: number
  total_amount: number
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  notes: string | null
  rejection_reason: string | null
  estimated_ready_at: string | null
  created_at: string
  updated_at: string
  // joined
  order_items?: OrderItem[]
  cafe?: Cafe
}

// ─── Order Item ───────────────────────────────────────────────
export interface OrderItemAddOn {
  id: string
  name: string
  price: number
}

export interface OrderItem {
  id: string
  order_id: string
  cafe_id: string
  menu_item_id: string | null
  item_name: string
  item_image_url: string | null
  item_is_veg: boolean
  variant_id: string | null
  variant_name: string | null
  base_price: number
  variant_price_delta: number
  add_ons: OrderItemAddOn[]
  add_ons_total: number
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

// ─── Payment ──────────────────────────────────────────────────
export interface Payment {
  id: string
  order_id: string
  cafe_id: string
  user_id: string
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  razorpay_signature: string | null
  amount: number
  currency: string
  status: PaymentCaptureStatus
  method: string | null
  raw_response: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// ─── Notification ─────────────────────────────────────────────
export interface AppNotification {
  id: string
  user_id: string
  cafe_id: string
  order_id: string | null
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown> | null
  is_read: boolean
  sent_at: string | null
  created_at: string
}

// ─── Cart (client-side only) ──────────────────────────────────
export interface CartAddOn {
  id: string
  name: string
  price: number
}

export interface CartItem {
  id: string          // unique cart item id (uuid v4)
  menu_item_id: string
  name: string
  image_url: string | null
  is_veg: boolean
  base_price: number
  variant_id: string | null
  variant_name: string | null
  variant_price_delta: number
  add_ons: CartAddOn[]
  add_ons_total: number
  quantity: number
  unit_price: number
  total_price: number
}

// ─── API Response wrappers ────────────────────────────────────
export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Razorpay ─────────────────────────────────────────────────
export interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpayResponse) => void
  prefill?: { name?: string; email?: string; contact?: string }
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
}

export interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void }
  }
}

// ─── Push Notifications ───────────────────────────────────────
export interface PushSubscriptionJSON {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

// ─── Admin Dashboard ──────────────────────────────────────────
export interface DashboardStats {
  today_orders: number
  today_revenue: number
  pending_orders: number
  total_orders_month: number
  total_revenue_month: number
  popular_items: { name: string; count: number }[]
}
