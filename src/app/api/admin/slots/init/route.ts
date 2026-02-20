import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get cafe_id from user's profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('cafe_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.cafe_id) {
            return NextResponse.json(
                { error: 'User is not associated with a cafe' },
                { status: 403 }
            )
        }

        if (!['admin', 'superadmin'].includes(profile.role)) {
            return NextResponse.json(
                { error: 'Only admins can initialize slots' },
                { status: 403 }
            )
        }

        // Check if slots already exist
        const { data: existingSlots } = await supabase
            .from('pickup_slots')
            .select('id', { count: 'exact', head: true })
            .eq('cafe_id', profile.cafe_id)

        if (existingSlots && existingSlots.length > 0) {
            return NextResponse.json({
                message: 'Slots already exist for this cafe',
                count: existingSlots.length,
            })
        }

        // Create slots: 8:00 AM to 10:00 PM in 15-minute intervals
        const slots = []
        let hour = 8
        let minute = 0

        while (hour < 22 || (hour === 22 && minute === 0)) {
            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
            slots.push({
                cafe_id: profile.cafe_id,
                slot_time: timeStr,
                max_orders: 10,
                is_active: true,
            })

            // Increment by 15 minutes
            minute += 15
            if (minute >= 60) {
                minute -= 60
                hour += 1
            }
        }

        // Insert all slots
        const { error, data } = await supabase
            .from('pickup_slots')
            .insert(slots)
            .select()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Created ${slots.length} pickup slots`,
            slots_created: slots.length,
            time_range: '08:00 - 22:00',
            interval: '15 minutes',
        })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
