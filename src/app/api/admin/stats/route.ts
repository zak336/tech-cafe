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
                { error: 'Only admins can access statistics' },
                { status: 403 }
            )
        }

        const { timeRange = 'today' } = await req.json()

        // Calculate date range
        const now = new Date()
        const today = now.toISOString().split('T')[0]
        let from: string

        if (timeRange === 'today') {
            from = today
        } else if (timeRange === 'week') {
            const weekAgo = new Date(now)
            weekAgo.setDate(weekAgo.getDate() - 7)
            from = weekAgo.toISOString()
        } else if (timeRange === 'month') {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
            from = monthStart.toISOString()
        } else {
            from = today
        }

        // Fetch orders in range
        const { data: orders } = await supabase
            .from('orders')
            .select('id, status, payment_status, total_amount, created_at, order_items(item_name, quantity)')
            .eq('cafe_id', profile.cafe_id)
            .gte('created_at', from)
            .eq('payment_status', 'paid')

        // Calculate metrics
        const totalOrders = orders?.length || 0
        const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

        // Status breakdown
        const statusBreakdown = {
            pending: orders?.filter(o => o.status === 'pending').length || 0,
            confirmed: orders?.filter(o => o.status === 'confirmed').length || 0,
            preparing: orders?.filter(o => o.status === 'preparing').length || 0,
            ready: orders?.filter(o => o.status === 'ready').length || 0,
            completed: orders?.filter(o => o.status === 'completed').length || 0,
            cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
            refunded: orders?.filter(o => o.status === 'refunded').length || 0,
        }

        // Top menu items
        const itemMap = new Map<string, { count: number; name: string }>()
        orders?.forEach(order => {
            order.order_items?.forEach((item: any) => {
                const existing = itemMap.get(item.item_name) || { count: 0, name: item.item_name }
                itemMap.set(item.item_name, {
                    count: existing.count + (item.quantity || 1),
                    name: item.item_name,
                })
            })
        })

        const topItems = Array.from(itemMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(item => ({ name: item.name, quantity: item.count }))

        return NextResponse.json({
            timeRange,
            totalOrders,
            totalRevenue,
            averageOrderValue: Number(averageOrderValue.toFixed(2)),
            statusBreakdown,
            topItems,
            timestamp: new Date().toISOString(),
        })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
