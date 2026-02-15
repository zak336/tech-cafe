'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cart'
import { SlotAvailability } from '@/types'
import { formatCurrency, formatTime, getTodayDate, getTomorrowDate } from '@/lib/utils'
import { Tag, Clock, ChevronRight, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Script from 'next/script'

export default function CheckoutPage() {
  const router   = useRouter()
  const items    = useCartStore(s => s.items)
  const subtotal = useCartStore(s => s.subtotal())
  const cafeId   = useCartStore(s => s.cafeId)
  const clearCart = useCartStore(s => s.clearCart)

  const [slots,        setSlots]        = useState<SlotAvailability[]>([])
  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null)
  const [slotDate,     setSlotDate]     = useState<'today' | 'tomorrow'>('today')
  const [couponCode,   setCouponCode]   = useState('')
  const [discount,     setDiscount]     = useState(0)
  const [couponError,  setCouponError]  = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [notes,        setNotes]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(true)

  const taxAmount    = subtotal * 0.05
  const totalAmount  = subtotal - discount + taxAmount

  const dateStr = slotDate === 'today' ? getTodayDate() : getTomorrowDate()

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) router.push('/')
  }, [items, router])

  // Fetch slots
  useEffect(() => {
    if (!cafeId) return
    setSlotsLoading(true)
    fetch(`/api/slots?cafe_id=${cafeId}&date=${dateStr}`)
      .then(r => r.json())
      .then(d => { setSlots(d.data ?? []); setSelectedSlot(null) })
      .finally(() => setSlotsLoading(false))
  }, [cafeId, dateStr])

  async function applyCoupon() {
    if (!couponCode.trim()) return
    setCouponError('')
    try {
      const res  = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, cafe_id: cafeId, order_total: subtotal }),
      })
      const data = await res.json()
      if (!res.ok) { setCouponError(data.error); return }
      setDiscount(data.discount)
      setCouponApplied(true)
      toast.success(`Saved ${formatCurrency(data.discount)}!`)
    } catch {
      setCouponError('Failed to apply coupon')
    }
  }

  async function handleCheckout() {
    if (!selectedSlot) { toast.error('Please select a pickup slot'); return }
    if (items.length === 0) return
    setLoading(true)

    try {
      // 1. Create order + Razorpay order
      const res  = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafe_id: cafeId,
          items,
          slot_id: selectedSlot.id,
          slot_date: dateStr,
          slot_time: selectedSlot.slot_time,
          subtotal,
          discount_amount: discount,
          coupon_code: couponApplied ? couponCode : null,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes,
        }),
      })
      const { order, razorpay_order_id, error } = await res.json()
      if (error) throw new Error(error)

      // 2. Open Razorpay
      const rzp = new window.Razorpay({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount:      Math.round(totalAmount * 100),
        currency:    'INR',
        name:        'Tech Cafe',
        description: `Order ${order.order_number}`,
        order_id:    razorpay_order_id,
        handler: async (response) => {
          // 3. Verify payment
          const vRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, order_id: order.id }),
          })
          const vData = await vRes.json()
          if (vData.success) {
            clearCart()
            toast.success('Order placed! 🎉')
            router.push(`/track/${order.id}`)
          } else {
            toast.error('Payment verification failed')
          }
        },
        modal: { ondismiss: () => toast.error('Payment cancelled') },
        theme: { color: '#D4AF37' },
      })
      rzp.open()
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) return null

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="page-container pt-6">
        <h1 className="font-display text-3xl font-bold mb-6">Checkout</h1>

        {/* Slot Picker */}
        <section className="card p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-gold" />
            <h2 className="font-semibold">Pickup Slot</h2>
          </div>

          {/* Date toggle */}
          <div className="flex gap-2 mb-4">
            {(['today', 'tomorrow'] as const).map(d => (
              <button
                key={d}
                onClick={() => setSlotDate(d)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                  ${slotDate === d ? 'bg-gold text-black border-gold' : 'border-border text-text-muted'}`}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>

          {slotsLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-4">No slots available</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto no-scrollbar">
              {slots.map(slot => {
                const full = slot.booked_count >= slot.max_orders || slot.is_blocked
                return (
                  <button
                    key={slot.id}
                    disabled={full}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-medium border transition-all
                      ${selectedSlot?.id === slot.id
                        ? 'bg-gold text-black border-gold'
                        : full
                          ? 'border-border text-text-muted/40 cursor-not-allowed line-through'
                          : 'border-border text-text-muted hover:border-gold/50 hover:text-white'
                      }`}
                  >
                    {formatTime(slot.slot_time)}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Coupon */}
        <section className="card p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={18} className="text-gold" />
            <h2 className="font-semibold">Coupon</h2>
          </div>

          {couponApplied ? (
            <div className="flex items-center justify-between bg-green-400/10 border border-green-400/30 rounded-xl px-4 py-3">
              <span className="text-green-400 text-sm font-medium">"{couponCode}" applied!</span>
              <button
                onClick={() => { setDiscount(0); setCouponApplied(false); setCouponCode('') }}
                className="text-text-muted text-xs hover:text-white"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input uppercase text-sm"
                  placeholder="SAVE20"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }}
                />
                <button onClick={applyCoupon} className="btn-outline px-4 text-sm flex-shrink-0">
                  Apply
                </button>
              </div>
              {couponError && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle size={12} />{couponError}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Notes */}
        <section className="card p-5 mb-4">
          <h2 className="font-semibold mb-3">Special Instructions</h2>
          <textarea
            className="input resize-none text-sm"
            rows={2}
            placeholder="E.g. Less sugar, extra hot…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </section>

        {/* Summary */}
        <section className="card p-5 mb-6">
          <h2 className="font-semibold mb-4">Bill Summary</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Discount</span><span>− {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-text-muted">
              <span>Tax (5%)</span><span>{formatCurrency(taxAmount)}</span>
            </div>
          </div>
          <div className="divider-gold" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-gold text-xl">{formatCurrency(totalAmount)}</span>
          </div>
        </section>

        <button onClick={handleCheckout} disabled={loading || !selectedSlot} className="btn-gold w-full">
          {loading ? 'Processing…' : `Pay ${formatCurrency(totalAmount)}`}
        </button>
      </div>
    </>
  )
}
