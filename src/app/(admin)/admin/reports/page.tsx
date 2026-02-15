'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Download, TrendingUp, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'

interface ReportOrder {
  order_number: string
  created_at: string
  status: string
  total_amount: number
  payment_status: string
  slot_date: string
  slot_time: string
  order_items: { item_name: string; quantity: number; total_price: number }[]
}

export default function AdminReportsPage() {
  const [orders,   setOrders]   = useState<ReportOrder[]>([])
  const [cafeId,   setCafeId]   = useState<string>('')
  const [loading,  setLoading]  = useState(true)
  const [range,    setRange]    = useState<'today' | 'week' | 'month'>('month')

  const supabase = createClient()

  async function load(r: typeof range) {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('cafe_id').eq('id', user!.id).single()
    if (!profile?.cafe_id) return
    setCafeId(profile.cafe_id)

    const now = new Date()
    let from: string
    if (r === 'today') { from = now.toISOString().split('T')[0] }
    else if (r === 'week') { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString() }
    else { const d = new Date(now.getFullYear(), now.getMonth(), 1); from = d.toISOString() }

    const { data } = await supabase
      .from('orders')
      .select('order_number, created_at, status, total_amount, payment_status, slot_date, slot_time, order_items(item_name, quantity, total_price)')
      .eq('cafe_id', profile.cafe_id)
      .gte('created_at', from)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })

    setOrders((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { load(range) }, [range])

  const totalRevenue  = orders.reduce((s, o) => s + Number(o.total_amount), 0)
  const totalOrders   = orders.length
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  function exportCSV() {
    const rows = [
      ['Order #', 'Date', 'Status', 'Slot Date', 'Slot Time', 'Items', 'Total (₹)'],
      ...orders.map(o => [
        o.order_number,
        new Date(o.created_at).toLocaleString('en-IN'),
        o.status,
        o.slot_date ?? '',
        o.slot_time ?? '',
        o.order_items.map(i => `${i.quantity}x ${i.item_name}`).join(' | '),
        String(o.total_amount),
      ])
    ]
    const csv   = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob  = new Blob([csv], { type: 'text/csv' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href      = url
    a.download  = `tech-cafe-orders-${range}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded!')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Reports</h1>
          <p className="text-text-muted mt-1">Paid orders only</p>
        </div>
        <button onClick={exportCSV} className="btn-outline flex items-center gap-2">
          <Download size={16} />Export CSV
        </button>
      </div>

      {/* Range selector */}
      <div className="flex gap-2 mb-6">
        {(['today', 'week', 'month'] as const).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all capitalize
              ${range === r ? 'bg-gold text-black border-gold' : 'border-border text-text-muted'}`}>
            {r === 'today' ? 'Today' : r === 'week' ? 'Last 7 days' : 'This month'}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Revenue',   value: formatCurrency(totalRevenue),   icon: TrendingUp  },
          { label: 'Total Orders',    value: String(totalOrders),            icon: ShoppingBag },
          { label: 'Avg Order Value', value: formatCurrency(avgOrderValue),  icon: TrendingUp  },
        ].map(stat => (
          <div key={stat.label} className="card p-5">
            <p className="text-text-muted text-xs mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-gold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Orders table */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-text-muted">No paid orders in this period</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Order #', 'Date', 'Items', 'Total'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-text-muted text-xs font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map(o => (
                <tr key={o.order_number} className="hover:bg-surface-2/50">
                  <td className="px-5 py-3 font-mono font-bold text-gold">{o.order_number}</td>
                  <td className="px-5 py-3 text-text-muted text-xs">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-3 text-text-muted text-xs max-w-xs truncate">
                    {o.order_items.map(i => `${i.quantity}× ${i.item_name}`).join(', ')}
                  </td>
                  <td className="px-5 py-3 font-semibold">{formatCurrency(Number(o.total_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
