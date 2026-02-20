import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const cafe_id = searchParams.get('cafe_id')
    const date = searchParams.get('date')

    if (!cafe_id || !date) {
        return NextResponse.json(
            { error: 'cafe_id and date required' },
            { status: 400 }
        )
    }

    const supabase = createClient()

    try {
        // Count pickup_slots templates
        const { count: pickupSlotsCount } = await supabase
            .from('pickup_slots')
            .select('*', { count: 'exact', head: true })
            .eq('cafe_id', cafe_id)
            .eq('is_active', true)

        // Count slot_availability for date
        const { count: availCount } = await supabase
            .from('slot_availability')
            .select('*', { count: 'exact', head: true })
            .eq('cafe_id', cafe_id)
            .eq('slot_date', date)

        // Get first 5 pickup slots
        const { data: samplePickupSlots } = await supabase
            .from('pickup_slots')
            .select('id, slot_time, is_active')
            .eq('cafe_id', cafe_id)
            .limit(5)
            .order('slot_time')

        // Get first 5 availability slots
        const { data: sampleAvailSlots } = await supabase
            .from('slot_availability')
            .select('id, slot_time, slot_date, booked_count, max_orders, is_blocked')
            .eq('cafe_id', cafe_id)
            .eq('slot_date', date)
            .limit(5)
            .order('slot_time')

        return NextResponse.json({
            cafe_id,
            date,
            statistics: {
                pickup_slots_templates_active: pickupSlotsCount || 0,
                slot_availability_for_date: availCount || 0,
            },
            sample_pickup_slots: samplePickupSlots,
            sample_availability_slots: sampleAvailSlots,
        })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        )
    }
}
