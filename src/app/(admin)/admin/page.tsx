import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBag, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import AdminOrdersLive from '@/components/admin/AdminOrdersLive'

async function getStats(cafeId: string) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [todayOrders, monthOrders, pending] = await Promise.all([
    supabase
      .from('orders')
      .select('total_amount, status')
      .eq('cafe_id', cafeId)
      .gte('created_at', today)
      .eq('payment_status', 'paid'),
    supabase
      .from('orders')
      .select('total_amount')
      .eq('cafe_id', cafeId)
      .gte('created_at', monthStart)
      .eq('payment_status', 'paid'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('cafe_id', cafeId)
      .in('status', ['pending', 'confirmed', 'preparing']),
  ])

  return {
    today_orders:         todayOrders.data?.length ?? 0,
    today_revenue:        todayOrders.data?.reduce((s, o) => s + Number(o.total_amount), 0) ?? 0,
    month_orders:         monthOrders.data?.length ?? 0,
    month_revenue:        monthOrders.data?.reduce((s, o) => s + Number(o.total_amount), 0) ?? 0,
    pending_orders:       pending.count ?? 0,
  }
}

export default async function AdminDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('cafe_id')
    .eq('id', user!.id)
    .single()

  const stats = await getStats(profile!.cafe_id!)

  const STATS = [
    { label: "Today's Orders",   value: stats.today_orders,           icon: ShoppingBag,  sub: 'orders placed'     },
    { label: "Today's Revenue",  value: formatCurrency(stats.today_revenue),   icon: TrendingUp,   sub: 'earned today'      },
    { label: 'Active Orders',    value: stats.pending_orders,         icon: Clock,        sub: 'need attention'    },
    { label: "Month's Revenue",  value: formatCurrency(stats.month_revenue),   icon: CheckCircle,  sub: `${stats.month_orders} orders`},
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold">Dashboard</h1>
        <p className="text-text-muted mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {STATS.map(stat => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-text-muted text-sm">{stat.label}</p>
              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                <stat.icon size={16} className="text-gold" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-text-muted text-xs mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Live orders */}
      <AdminOrdersLive cafeId={profile!.cafe_id!} />
    </div>
  )
}
