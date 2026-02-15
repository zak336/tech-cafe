import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    cafe_id, items, slot_id, slot_date, slot_time,
    subtotal, discount_amount, coupon_code, tax_amount, total_amount, notes,
  } = body

  // Validation
  if (!cafe_id || !items?.length || !slot_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const service = createServiceClient()

  try {
    // 1. Book the slot (atomic, race-condition safe)
    const { error: slotError } = await service.rpc('book_slot', { p_slot_id: slot_id })
    if (slotError) return NextResponse.json({ error: slotError.message }, { status: 400 })

    // 2. Create Razorpay order
    const rzpOrder = await razorpay.orders.create({
      amount:   Math.round(total_amount * 100),  // in paise
      currency: 'INR',
      receipt:  `tc_${Date.now()}`,
    })

    // 3. Insert order
    const { data: order, error: orderError } = await service
      .from('orders')
      .insert({
        cafe_id,
        user_id:         user.id,
        status:          'pending',
        slot_id,
        slot_date,
        slot_time,
        subtotal,
        discount_amount: discount_amount ?? 0,
        coupon_code:     coupon_code ?? null,
        tax_amount,
        total_amount,
        payment_status:  'pending',
        payment_method:  'razorpay',
        notes:           notes ?? null,
      })
      .select()
      .single()

    if (orderError) throw new Error(orderError.message)

    // 4. Insert order items
    const orderItems = items.map((item: any) => ({
      order_id:            order.id,
      cafe_id,
      menu_item_id:        item.menu_item_id || null,
      item_name:           item.name,
      item_image_url:      item.image_url ?? null,
      item_is_veg:         item.is_veg ?? true,
      variant_id:          item.variant_id ?? null,
      variant_name:        item.variant_name ?? null,
      base_price:          item.base_price,
      variant_price_delta: item.variant_price_delta ?? 0,
      add_ons:             item.add_ons ?? [],
      add_ons_total:       item.add_ons_total ?? 0,
      quantity:            item.quantity,
      unit_price:          item.unit_price,
      total_price:         item.total_price,
    }))

    const { error: itemsError } = await service.from('order_items').insert(orderItems)
    if (itemsError) throw new Error(itemsError.message)

    // 5. Create payment record
    await service.from('payments').insert({
      order_id:          order.id,
      cafe_id,
      user_id:           user.id,
      razorpay_order_id: rzpOrder.id,
      amount:            total_amount,
      currency:          'INR',
      status:            'created',
    })

    // 6. Record coupon use if applied
    if (coupon_code) {
      const { data: coupon } = await service
        .from('coupons')
        .select('id')
        .eq('cafe_id', cafe_id)
        .eq('code', coupon_code.toUpperCase())
        .single()

      if (coupon) {
        await service.from('coupon_uses').insert({
          coupon_id: coupon.id,
          user_id:   user.id,
          order_id:  order.id,
        })
      }
    }

    return NextResponse.json({ order, razorpay_order_id: rzpOrder.id })
  } catch (err: any) {
    console.error('Order creation error:', err)
    // Release slot if order creation failed after booking
    await service.rpc('release_slot', { p_slot_id: slot_id }).match(() => {})
    return NextResponse.json({ error: err.message ?? 'Order creation failed' }, { status: 500 })
  }
}
