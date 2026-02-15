'use client'

import { useCartStore } from '@/store/cart'
import { formatCurrency } from '@/lib/utils'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function CartPage() {
  const items          = useCartStore(s => s.items)
  const subtotal       = useCartStore(s => s.subtotal())
  const removeItem     = useCartStore(s => s.removeItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)

  if (items.length === 0) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShoppingBag size={48} className="text-text-muted mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-text-muted text-sm mb-6">Add some delicious items from the menu</p>
        <Link href="/" className="btn-gold">Browse Menu</Link>
      </div>
    )
  }

  return (
    <div className="page-container pt-6">
      <h1 className="font-display text-3xl font-bold mb-6">Your Cart</h1>

      {/* Items */}
      <div className="space-y-3 mb-6">
        {items.map((item, i) => (
          <div key={item.id} className="card p-4 animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
            <div className="flex gap-3">
              {/* Image */}
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-surface-2 flex-shrink-0">
                {item.image_url
                  ? <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  : <span className="text-2xl flex items-center justify-center w-full h-full">🍴</span>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{item.name}</h3>
                {item.variant_name && (
                  <p className="text-text-muted text-xs mt-0.5">{item.variant_name}</p>
                )}
                {item.add_ons.length > 0 && (
                  <p className="text-text-muted text-xs mt-0.5">
                    + {item.add_ons.map(a => a.name).join(', ')}
                  </p>
                )}
                <p className="text-gold text-sm font-semibold mt-1">{formatCurrency(item.unit_price)}</p>
              </div>

              {/* Delete */}
              <button
                onClick={() => removeItem(item.id)}
                className="text-text-muted hover:text-red-400 transition-colors p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-3 bg-surface-2 rounded-xl px-2 py-1 border border-border">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-white"
                >
                  <Minus size={13} />
                </button>
                <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-white"
                >
                  <Plus size={13} />
                </button>
              </div>
              <p className="font-semibold text-sm">{formatCurrency(item.total_price)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="card p-5 mb-6">
        <h3 className="font-semibold mb-4">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Subtotal ({items.length} items)</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Taxes (5%)</span>
            <span>{formatCurrency(subtotal * 0.05)}</span>
          </div>
        </div>
        <div className="divider-gold" />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span className="text-gold text-lg">{formatCurrency(subtotal * 1.05)}</span>
        </div>
      </div>

      {/* Checkout */}
      <Link href="/checkout" className="btn-gold w-full text-center block">
        Proceed to Checkout
      </Link>
    </div>
  )
}
