import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cafe_id = searchParams.get('cafe_id')
  const date    = searchParams.get('date')

  if (!cafe_id || !date) {
    return NextResponse.json({ error: 'cafe_id and date required' }, { status: 400 })
  }

  const supabase = createClient()

  // Try to get existing slot_availability rows for this date
  let { data: slots } = await supabase
    .from('slot_availability')
    .select('*')
    .eq('cafe_id', cafe_id)
    .eq('slot_date', date)
    .order('slot_time')

  // If no rows for today, generate them from pickup_slots template
  if (!slots || slots.length === 0) {
    const { data: templates } = await supabase
      .from('pickup_slots')
      .select('*')
      .eq('cafe_id', cafe_id)
      .eq('is_active', true)
      .order('slot_time')

    if (templates && templates.length > 0) {
      const rows = templates.map(t => ({
        cafe_id,
        slot_id:     t.id,
        slot_date:   date,
        slot_time:   t.slot_time,
        max_orders:  t.max_orders,
        booked_count: 0,
        is_blocked:  false,
      }))
      const { data: inserted } = await supabase
        .from('slot_availability')
        .insert(rows)
        .select()
      slots = inserted
    }
  }

  // Filter out past slots for today
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  const filtered = (slots ?? []).filter(slot => {
    if (date > today) return true
    return slot.slot_time > currentTime
  })

  return NextResponse.json({ data: filtered })
}
