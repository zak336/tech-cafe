import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cafe_id = searchParams.get('cafe_id')
  const date = searchParams.get('date')
  const debug = searchParams.get('debug') === 'true'

  if (!cafe_id || !date) {
    return NextResponse.json({ error: 'cafe_id and date required' }, { status: 400 })
  }

  const supabase = createClient()

  // Try to get existing slot_availability rows for this date
  let { data: slots, error: slotError } = await supabase
    .from('slot_availability')
    .select('*')
    .eq('cafe_id', cafe_id)
    .eq('slot_date', date)
    .order('slot_time')

  if (slotError) {
    console.error('Slots fetch error:', slotError)
    return NextResponse.json({ error: 'Failed to fetch slots', details: slotError.message }, { status: 500 })
  }

  // If no rows for this date, generate them from pickup_slots template
  if (!slots || slots.length === 0) {
    const { data: templates, error: templateError } = await supabase
      .from('pickup_slots')
      .select('*')
      .eq('cafe_id', cafe_id)
      .eq('is_active', true)
      .order('slot_time')

    if (templateError) {
      console.error('Templates fetch error:', templateError)
      return NextResponse.json({ error: 'Failed to fetch templates', details: templateError.message }, { status: 500 })
    }

    if (templates && templates.length > 0) {
      if (debug) {
        console.log(`[DEBUG] Found ${templates.length} active templates for cafe ${cafe_id}`)
      }

      const rows = templates.map(t => ({
        cafe_id,
        slot_id: t.id,
        slot_date: date,
        slot_time: t.slot_time,
        max_orders: t.max_orders,
        booked_count: 0,
        is_blocked: false,
      }))

      // Insert in batches of 50 to avoid overwhelming the database
      let allInserted: any[] = []
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50)
        if (debug) {
          console.log(`[DEBUG] Inserting batch ${Math.floor(i / 50) + 1} with ${batch.length} slots`)
        }

        const { data: inserted, error: insertError } = await supabase
          .from('slot_availability')
          .insert(batch)
          .select()

        if (insertError) {
          // If insert fails due to duplicate, fetch existing ones instead
          if (insertError.code === '23505') {
            if (debug) {
              console.log(`[DEBUG] Batch ${Math.floor(i / 50) + 1} had duplicates, fetching existing slots`)
            }
            const { data: existing } = await supabase
              .from('slot_availability')
              .select('*')
              .eq('cafe_id', cafe_id)
              .eq('slot_date', date)
              .order('slot_time')
            if (existing) {
              allInserted = existing
              break
            }
          } else {
            console.error(`Insert batch error:`, insertError)
            return NextResponse.json(
              { error: 'Failed to create slots', details: insertError.message },
              { status: 500 }
            )
          }
        } else if (inserted) {
          allInserted = allInserted.concat(inserted)
        }
      }

      slots = allInserted.length > 0 ? allInserted : slots
    }
  }

  // Filter out past slots for today
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const currentHours = String(now.getHours()).padStart(2, '0')
  const currentMins = String(now.getMinutes()).padStart(2, '0')
  const currentTime = `${currentHours}:${currentMins}`

  const filtered = (slots ?? []).filter(slot => {
    if (date > today) return true // Future dates: include all slots
    if (date < today) return false // Past dates: include no slots

    // Same day: filter out past times
    // Slot time format: HH:MM or HH:MM:SS, compare just HH:MM portion
    const slotHHMM = (slot.slot_time || '').substring(0, 5)
    return slotHHMM >= currentTime
  })

  if (debug) {
    console.log(`[DEBUG] Total fetched: ${slots?.length || 0}, After filtering: ${filtered.length}`)
    return NextResponse.json({ data: filtered, debug: { total: slots?.length, filtered: filtered.length } })
  }

  return NextResponse.json({ data: filtered })
}
