import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = createClient()

        // Get the first active cafe (there should typically only be one)
        const { data: cafe } = await supabase
            .from('cafes')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .single()

        if (!cafe) {
            return NextResponse.json(
                { error: 'No active cafe found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ cafe_id: cafe.id })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Server error' },
            { status: 500 }
        )
    }
}
