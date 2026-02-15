'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'
import { formatCurrency, formatTime, getOrderStatusInfo } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, ChefHat, Bell, Package } from 'lucide-react'

const STATUS_FLOW: Record<string, string> = {
  confirmed: 'preparing',
  preparing: 'ready',
  ready:     'completed',
}

const NEXT_ACTION: Record<string, { label: string; icon: typeof ChefHat; color: string }> = {
  confirmed: { label: 'Start Preparing', icon: ChefHat,  color: 'bg-blue-500/10 text-blue-400 border-blue-500/30'  },
  preparing: { label: 'Mark Ready',      icon: Bell,     color: 'bg-green-500/10 text-green-400 border-green-500/30'},
  ready:     { label: 'Mark Completed',  icon: Package,  color: 'bg-text-muted/10 text-text-muted border-border'   },
}

export default function AdminOrdersLive({ cafeId }: { cafeId: string }) {
  const [orders, setOrders]   = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('cafe_id', cafeId)
      .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
      .order('created_at', { ascending: true })
    setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `cafe_id=eq.${cafeId}`,
      }, () => fetchOrders())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [cafeId])

  async function updateStatus(orderId: string, status: string, reason?: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status, ...(reason ? { rejection_reason: reason } : {}) })
      .eq('id', orderId)

    if (error) { toast.error(error.message); return }

    // Send push notification
    const order = orders.find(o => o.id === orderId)
    if (order) {
      const notifMap: Record<string, { type: string; title: string; body: string }> = {
        confirmed:  { type: 'order_confirmed',  title: 'Order Confirmed ✅',  body: `Your order ${order.order_number} is confirmed!`      },
        preparing:  { type: 'order_preparing',  title: 'Preparing Now 👨‍🍳',  body: `Your order ${order.order_number} is being prepared!`  },
        ready:      { type: 'order_ready',      title: 'Ready for Pickup 🎉', body: `Your order ${order.order_number} is ready! Come pick it up.` },
        cancelled:  { type: 'order_cancelled',  title: 'Order Cancelled',     body: `Your order ${order.order_number} was cancelled.`     },
      }
      const notif = notifMap[status]
      if (notif) {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: order.user_id, ...notif, data: { url: `/track/${orderId}` } }),
        })
      }
    }

    toast.success(`Order updated to ${status}`)
  }

  async function handleReject(orderId: string) {
    const reason = prompt('Rejection reason (shown to customer):')
    if (reason === null) return
    await updateStatus(orderId, 'cancelled', reason || 'Order rejected by cafe')

    // Release the slot
    const order = orders.find(o => o.id === orderId)
    if (order?.slot_id) {
      await supabase.rpc('release_slot', { p_slot_id: order.slot_id })
    }
  }

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
    </div>
  )

  return (
    <div>
      <h2 className="font-semibold text-lg mb-4">
        Live Orders
        {orders.length > 0 && (
          <span className="ml-2 bg-gold text-black text-xs font-bold px-2 py-0.5 rounded-full">
            {orders.length}
          </span>
        )}
      </h2>

      {orders.length === 0 ? (
        <div className="card p-10 text-center text-text-muted">
          <p className="text-3xl mb-2">✅</p>
          <p>No active orders right now</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const statusInfo = getOrderStatusInfo(order.status)
            const nextAction = NEXT_ACTION[order.status]
            const isPending  = order.status === 'pending'

            return (
              <div key={order.id} className={cn('card p-5', isPending && 'border-gold/40 shadow-gold')}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{order.order_number}</p>
                      {isPending && (
                        <span className="text-[10px] bg-gold text-black font-bold px-2 py-0.5 rounded-full animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    {order.slot_time && (
                      <p className="text-text-muted text-xs mt-0.5">
                        Pickup: {formatTime(order.slot_time)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusInfo.bg, statusInfo.color)}>
                      {statusInfo.label}
                    </span>
                    <p className="text-gold font-bold text-sm mt-1">{formatCurrency(order.total_amount)}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="text-sm text-text-muted mb-4">
                  {(order.order_items ?? []).map((item, i) => (
                    <span key={item.id}>
                      {i > 0 && ', '}
                      {item.quantity}× {item.item_name}
                      {item.variant_name && ` (${item.variant_name})`}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => updateStatus(order.id, 'confirmed')}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all"
                      >
                        <CheckCircle size={15} />Accept
                      </button>
                      <button
                        onClick={() => handleReject(order.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all"
                      >
                        <XCircle size={15} />Reject
                      </button>
                    </>
                  ) : nextAction ? (
                    <button
                      onClick={() => updateStatus(order.id, STATUS_FLOW[order.status])}
                      className={cn('flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border transition-all hover:opacity-80', nextAction.color)}
                    >
                      <nextAction.icon size={15} />{nextAction.label}
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
