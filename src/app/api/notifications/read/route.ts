import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { notificationId } = await req.json()

        if (!notificationId) {
            return NextResponse.json(
                { error: 'notificationId is required' },
                { status: 400 }
            )
        }

        // Verify ownership before updating
        const { data: notification } = await supabase
            .from('notifications')
            .select('user_id')
            .eq('id', notificationId)
            .single()

        if (!notification || notification.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Notification not found or unauthorized' },
                { status: 404 }
            )
        }

        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
