'use client'

import Link from 'next/link'
import { Order } from '@/types'
import { formatCurrency, formatDateTime, getOrderStatusInfo } from '@/lib/utils'
import { useCartStore } from '@/store/cart'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { RefreshCw, ChevronRight } from 'lucide-react'

export default function OrderCard({ order }: { order: Order }) {
  const addItem   = useCartStore(s => s.addItem)
  const setCafeId = useCartStore(s => s.setCafeId)
  const clearCart = useCartStore(s => s.clearCart)
  const statusInfo = getOrderStatusInfo(order.status)

  function reorder() {
    clearCart()
    setCafeId(order.cafe_id)
    ;(order.order_items ?? []).forEach(item => {
      addItem({
        menu_item_id:        item.menu_item_id ?? '',
        name:                item.item_name,
        image_url:           item.item_image_url,
        is_veg:              item.item_is_veg,
        base_price:          item.base_price,
        variant_id:          item.variant_id,
        variant_name:        item.variant_name,
        variant_price_delta: item.variant_price_delta,
        add_ons:             item.add_ons ?? [],
        quantity:            item.quantity,
      })
    })
    toast.success('Items added to cart!')
  }

  const isActive = ['pending','confirmed','preparing','ready'].includes(order.status)

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold">{order.order_number}</p>
          <p className="text-text-muted text-xs mt-0.5">{formatDateTime(order.created_at)}</p>
        </div>
        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusInfo.bg, statusInfo.color)}>
          {statusInfo.label}
        </span>
      </div>

      {/* Items summary */}
      <div className="text-sm text-text-muted mb-3">
        {(order.order_items ?? []).slice(0, 2).map(i => (
          <span key={i.id}>{i.quantity}× {i.item_name}</span>
        )).reduce((prev: React.ReactNode, curr, idx) => idx === 0 ? curr : <>{prev}, {curr}</>, null)}
        {(order.order_items?.length ?? 0) > 2 && (
          <span> +{(order.order_items!.length) - 2} more</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="font-bold text-gold">{formatCurrency(order.total_amount)}</span>
        <div className="flex items-center gap-2">
          {(order.status === 'completed' || order.status === 'cancelled') && (
            <button
              onClick={reorder}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-gold transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-gold/40"
            >
              <RefreshCw size={12} />Reorder
            </button>
          )}
          {isActive && (
            <Link
              href={`/track/${order.id}`}
              className="flex items-center gap-1 text-xs text-gold font-medium"
            >
              Track <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
