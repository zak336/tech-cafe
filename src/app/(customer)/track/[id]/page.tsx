'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderItem } from '@/types'
import { formatCurrency, formatTime, getOrderStatusInfo } from '@/lib/utils'
import { CheckCircle2, Circle, Clock, Package, ChefHat, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

const STATUS_STEPS = [
  { key: 'confirmed',  label: 'Confirmed',  icon: CheckCircle2 },
  { key: 'preparing',  label: 'Preparing',  icon: ChefHat      },
  { key: 'ready',      label: 'Ready!',     icon: Bell         },
  { key: 'completed',  label: 'Completed',  icon: Package      },
]

const STATUS_ORDER = ['pending','confirmed','preparing','ready','completed','cancelled','refunded']

export default function TrackPage() {
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Fetch initial order
    async function fetchOrder() {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single()
      setOrder(data)
      setLoading(false)
    }
    fetchOrder()

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, payload => {
        setOrder(prev => prev ? { ...prev, ...(payload.new as Partial<Order>) } : null)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId])

  if (loading) {
    return (
      <div className="page-container pt-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="page-container pt-6 text-center">
        <p className="text-text-muted">Order not found</p>
        <Link href="/orders" className="btn-gold mt-4 inline-block">My Orders</Link>
      </div>
    )
  }

  const statusInfo     = getOrderStatusInfo(order.status)
  const isCancelled    = order.status === 'cancelled' || order.status === 'refunded'
  const currentStepIdx = STATUS_ORDER.indexOf(order.status)

  // Countdown timer for "ready" orders
  const [timeLeft, setTimeLeft] = useState<string>('')
  useEffect(() => {
    if (order.status !== 'preparing' || !order.estimated_ready_at) return
    const interval = setInterval(() => {
      const diff = new Date(order.estimated_ready_at!).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Any moment now!'); clearInterval(interval); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${m}:${String(s).padStart(2,'0')} remaining`)
    }, 1000)
    return () => clearInterval(interval)
  }, [order.status, order.estimated_ready_at])

  return (
    <div className="page-container pt-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <p className="text-text-muted text-sm">Order</p>
        <h1 className="font-display text-3xl font-bold">{order.order_number}</h1>
        <div className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium mt-2', statusInfo.bg, statusInfo.color)}>
          {statusInfo.label}
        </div>
      </div>

      {/* Countdown */}
      {timeLeft && (
        <div className="card p-4 mb-4 flex items-center gap-3 border-gold/30">
          <Clock size={20} className="text-gold flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Estimated ready in</p>
            <p className="text-gold font-bold font-mono">{timeLeft}</p>
          </div>
        </div>
      )}

      {/* Progress steps */}
      {!isCancelled && (
        <div className="card p-5 mb-4">
          <div className="flex justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
            <div
              className="absolute top-4 left-4 h-0.5 bg-gold transition-all duration-700"
              style={{ width: `${Math.max(0, (Math.min(currentStepIdx - 1, STATUS_STEPS.length - 1)) / (STATUS_STEPS.length - 1)) * 100}%` }}
            />

            {STATUS_STEPS.map((step, i) => {
              const stepIdx  = STATUS_ORDER.indexOf(step.key)
              const done     = currentStepIdx >= stepIdx
              const active   = order.status === step.key
              const Icon     = step.icon
              return (
                <div key={step.key} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={cn(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500',
                    done   ? 'bg-gold border-gold text-black'
                           : 'bg-surface border-border text-text-muted'
                  )}>
                    <Icon size={14} strokeWidth={2.5} />
                  </div>
                  <span className={cn('text-xs font-medium', done ? 'text-white' : 'text-text-muted')}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pickup info */}
      {order.slot_time && (
        <div className="card p-4 mb-4 flex items-center gap-3">
          <Clock size={18} className="text-gold flex-shrink-0" />
          <div>
            <p className="text-text-muted text-xs">Pickup slot</p>
            <p className="font-medium text-sm">{formatTime(order.slot_time)} · {order.slot_date}</p>
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold mb-4">Items</h2>
        <div className="space-y-3">
          {(order.order_items ?? []).map(item => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-sm">
                  {item.quantity}×
                </div>
                <div>
                  <p className="text-sm font-medium">{item.item_name}</p>
                  {item.variant_name && <p className="text-text-muted text-xs">{item.variant_name}</p>}
                  {item.add_ons?.length > 0 && (
                    <p className="text-text-muted text-xs">+ {item.add_ons.map((a: any) => a.name).join(', ')}</p>
                  )}
                </div>
              </div>
              <p className="text-sm font-medium">{formatCurrency(item.total_price)}</p>
            </div>
          ))}
        </div>
        <div className="divider-gold" />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span className="text-gold">{formatCurrency(order.total_amount)}</span>
        </div>
      </div>

      {/* Rejection reason */}
      {order.status === 'cancelled' && order.rejection_reason && (
        <div className="bg-red-400/10 border border-red-400/30 rounded-2xl p-4 mb-4">
          <p className="text-red-400 text-sm font-medium">Cancellation reason</p>
          <p className="text-sm mt-1">{order.rejection_reason}</p>
        </div>
      )}

      <Link href="/orders" className="btn-outline w-full text-center block">
        All Orders
      </Link>
    </div>
  )
}
