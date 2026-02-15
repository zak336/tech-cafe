import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { code, cafe_id, order_total } = await request.json()

  if (!code || !cafe_id || order_total === undefined) {
    return NextResponse.json({ error: 'code, cafe_id, and order_total required' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Call the DB function
  const { data, error } = await supabase
    .rpc('validate_coupon', {
      p_code:        code.toUpperCase(),
      p_cafe_id:     cafe_id,
      p_user_id:     user.id,
      p_order_total: order_total,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ discount: data })
}
