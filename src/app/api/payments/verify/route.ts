import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    order_id,
  } = await request.json()

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !order_id) {
    return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 })
  }

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')

  if (expectedSig !== razorpay_signature) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 })
  }

  const service = createServiceClient()

  // Update payment record
  await service
    .from('payments')
    .update({
      razorpay_payment_id,
      razorpay_signature,
      status: 'captured',
    })
    .eq('razorpay_order_id', razorpay_order_id)

  // Update order status to confirmed + payment paid
  const { data: order } = await service
    .from('orders')
    .update({ status: 'confirmed', payment_status: 'paid' })
    .eq('id', order_id)
    .select('cafe_id, user_id, order_number')
    .single()

  // Send notification
  if (order) {
    await service.from('notifications').insert({
      user_id:  order.user_id,
      cafe_id:  order.cafe_id,
      order_id: order_id,
      type:     'order_confirmed',
      title:    'Order Confirmed! ✅',
      body:     `Your order ${order.order_number} has been confirmed.`,
      data:     { order_id },
    })

    // Trigger web push (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: order.user_id,
        title:   'Order Confirmed! ✅',
        body:    `Your order ${order.order_number} is confirmed.`,
        data:    { url: `/track/${order_id}` },
      }),
    }).catch(console.error)
  }

  return NextResponse.json({ success: true })
}
