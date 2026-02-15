'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Minus, Clock } from 'lucide-react'
import { MenuItem, Variant,  CartAddOn } from '@/types'
import { useCartStore } from '@/store/cart'
import { cn, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  item: MenuItem
  cafeId: string
}

export default function MenuCard({ item, cafeId }: Props) {
  const [open, setOpen] = useState(false)

  const hasVariants = (item.variants?.length ?? 0) > 0
  const hasAddOns   = (item.add_ons?.length ?? 0) > 0
  const needsModal  = hasVariants || hasAddOns

  const addItem = useCartStore(s => s.addItem)
  const setCafeId = useCartStore(s => s.setCafeId)

  function quickAdd() {
    if (needsModal) { setOpen(true); return }
    setCafeId(cafeId)
    addItem({
      menu_item_id: item.id,
      name: item.name,
      image_url: item.image_url,
      is_veg: item.is_veg,
      base_price: item.base_price,
      variant_id: null,
      variant_name: null,
      variant_price_delta: 0,
      add_ons: [],
      quantity: 1,
    })
    toast.success(`${item.name} added to cart`)
  }

  return (
    <>
      <div className={cn('card-hover flex gap-4 p-4', !item.is_available && 'opacity-50')}>
        {/* Image */}
        <div className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-surface-2">
          {item.image_url ? (
            <Image src={item.image_url} alt={item.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🍴</div>
          )}
          {!item.is_available && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <span className="text-xs text-white font-medium">Unavailable</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <VegBadge isVeg={item.is_veg} />
              </div>
              <h3 className="font-semibold text-white text-sm leading-tight truncate">{item.name}</h3>
              {item.description && (
                <p className="text-text-muted text-xs mt-1 line-clamp-2">{item.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-gold font-bold text-base">{formatCurrency(item.base_price)}</span>
              {hasVariants && <span className="text-text-muted text-xs ml-1">onwards</span>}
            </div>

            <div className="flex items-center gap-2">
              {item.prep_time_minutes && (
                <span className="flex items-center gap-1 text-text-muted text-xs">
                  <Clock size={10} />{item.prep_time_minutes}m
                </span>
              )}
              {item.is_available && (
                <button
                  onClick={quickAdd}
                  className="w-8 h-8 rounded-lg bg-gold text-black flex items-center justify-center hover:bg-gold-light transition-colors"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customisation Modal */}
      {open && (
        <ItemModal
          item={item}
          cafeId={cafeId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ─── Veg Badge ───────────────────────────────────────────────
function VegBadge({ isVeg }: { isVeg: boolean }) {
  return (
    <span className={cn('w-4 h-4 rounded-sm border-2 flex items-center justify-center flex-shrink-0',
      isVeg ? 'border-green-500' : 'border-red-500')}>
      <span className={cn('w-2 h-2 rounded-full', isVeg ? 'bg-green-500' : 'bg-red-500')} />
    </span>
  )
}

// ─── Item Modal ───────────────────────────────────────────────
function ItemModal({ item, cafeId, onClose }: { item: MenuItem; cafeId: string; onClose: () => void }) {
  const defaultVariant = item.variants?.find(v => v.is_default) ?? item.variants?.[0] ?? null
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(defaultVariant)
  const [selectedAddOns, setSelectedAddOns]   = useState<Set<string>>(new Set())
  const [quantity, setQuantity]               = useState(1)

  const addItem   = useCartStore(s => s.addItem)
  const setCafeId = useCartStore(s => s.setCafeId)

  const addOnsTotal = Array.from(selectedAddOns).reduce((sum, id) => {
    const ao = item.add_ons?.find(a => a.id === id)
    return sum + (ao?.price ?? 0)
  }, 0)

  const variantDelta = selectedVariant?.price_delta ?? 0
  const unitPrice    = item.base_price + variantDelta + addOnsTotal
  const totalPrice   = unitPrice * quantity

  function toggleAddOn(id: string) {
    setSelectedAddOns(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleAdd() {
    setCafeId(cafeId)
    const cartAddOns: CartAddOn[] = Array.from(selectedAddOns).map(id => {
      const ao = item.add_ons!.find(a => a.id === id)!
      return { id: ao.id, name: ao.name, price: ao.price }
    })
    addItem({
      menu_item_id:        item.id,
      name:                item.name,
      image_url:           item.image_url,
      is_veg:              item.is_veg,
      base_price:          item.base_price,
      variant_id:          selectedVariant?.id ?? null,
      variant_name:        selectedVariant?.name ?? null,
      variant_price_delta: variantDelta,
      add_ons:             cartAddOns,
      quantity,
    })
    toast.success(`${item.name} added to cart`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl bg-surface rounded-t-3xl border-t border-border p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex gap-4 mb-6">
          {item.image_url && (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-surface-2">
              <Image src={item.image_url} alt={item.name} fill className="object-cover" />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-lg">{item.name}</h2>
            {item.description && <p className="text-text-muted text-sm mt-1">{item.description}</p>}
            <p className="text-gold font-bold mt-1">{formatCurrency(item.base_price)}</p>
          </div>
        </div>

        {/* Variants */}
        {(item.variants?.length ?? 0) > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Size</h3>
            <div className="flex flex-wrap gap-2">
              {item.variants!.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200',
                    selectedVariant?.id === v.id
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-border text-text-muted hover:border-gold/40'
                  )}
                >
                  {v.name}
                  {v.price_delta !== 0 && (
                    <span className="ml-1 text-xs">
                      {v.price_delta > 0 ? '+' : ''}{formatCurrency(v.price_delta)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons */}
        {(item.add_ons?.length ?? 0) > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Add-ons</h3>
            <div className="space-y-2">
              {item.add_ons!.map(ao => (
                <label key={ao.id} className={cn(
                  'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200',
                  selectedAddOns.has(ao.id) ? 'border-gold bg-gold/5' : 'border-border'
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                      selectedAddOns.has(ao.id) ? 'border-gold bg-gold' : 'border-border'
                    )}>
                      {selectedAddOns.has(ao.id) && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-sm">{ao.name}</span>
                  </div>
                  <span className="text-gold text-sm font-medium">+{formatCurrency(ao.price)}</span>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedAddOns.has(ao.id)}
                    onChange={() => toggleAddOn(ao.id)}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Quantity + Add */}
        <div className="flex items-center gap-4 mt-6">
          <div className="flex items-center gap-3 bg-surface-2 rounded-xl px-2 py-1 border border-border">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-white">
              <Minus size={14} />
            </button>
            <span className="w-6 text-center font-semibold">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-white">
              <Plus size={14} />
            </button>
          </div>

          <button onClick={handleAdd} className="btn-gold flex-1">
            Add to cart · {formatCurrency(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  )
}
