'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MenuItem, Category, Variant, AddOn } from '@/types'
import { X, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Props {
  item:       MenuItem | null
  cafeId:     string
  categories: Category[]
  onClose:    () => void
  onSaved:    () => void
}

export default function MenuItemModal({ item, cafeId, categories, onClose, onSaved }: Props) {
  const isNew = !item?.id

  const [name,         setName]         = useState(item?.name         ?? '')
  const [description,  setDescription]  = useState(item?.description  ?? '')
  const [basePrice,    setBasePrice]    = useState(item?.base_price    ?? 0)
  const [categoryId,   setCategoryId]   = useState(item?.category_id  ?? categories[0]?.id ?? '')
  const [isVeg,        setIsVeg]        = useState(item?.is_veg       ?? true)
  const [isAvailable,  setIsAvailable]  = useState(item?.is_available ?? true)
  const [isFeatured,   setIsFeatured]   = useState(item?.is_featured  ?? false)
  const [prepTime,     setPrepTime]     = useState(item?.prep_time_minutes ?? 10)
  const [imageUrl,     setImageUrl]     = useState(item?.image_url    ?? '')
  const [variants,     setVariants]     = useState<Partial<Variant>[]>(item?.variants ?? [])
  const [addOns,       setAddOns]       = useState<Partial<AddOn>[]>(item?.add_ons ?? [])
  const [saving,       setSaving]       = useState(false)

  const supabase = createClient()

  async function handleSave() {
    if (!name.trim() || !categoryId) { toast.error('Name and category required'); return }
    setSaving(true)

    try {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const payload = { cafe_id: cafeId, category_id: categoryId, name, slug, description, base_price: basePrice, is_veg: isVeg, is_available: isAvailable, is_featured: isFeatured, prep_time_minutes: prepTime, image_url: imageUrl || null }

      let itemId = item?.id

      if (isNew) {
        const { data, error } = await supabase.from('menu_items').insert(payload).select().single()
        if (error) throw error
        itemId = data.id
      } else {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', itemId!)
        if (error) throw error
        // Delete old variants/add_ons and re-insert
        await supabase.from('variants').delete().eq('menu_item_id', itemId!)
        await supabase.from('add_ons').delete().eq('menu_item_id', itemId!)
      }

      // Upsert variants
      if (variants.length > 0) {
        const vRows = variants.filter(v => v.name).map((v, i) => ({
          cafe_id: cafeId, menu_item_id: itemId, name: v.name!, price_delta: v.price_delta ?? 0,
          is_default: v.is_default ?? i === 0, is_available: true, sort_order: i,
        }))
        if (vRows.length) await supabase.from('variants').insert(vRows)
      }

      // Upsert add-ons
      if (addOns.length > 0) {
        const aoRows = addOns.filter(a => a.name).map((a, i) => ({
          cafe_id: cafeId, menu_item_id: itemId, name: a.name!, price: a.price ?? 0,
          is_available: true, sort_order: i,
        }))
        if (aoRows.length) await supabase.from('add_ons').insert(aoRows)
      }

      toast.success(isNew ? 'Item created!' : 'Item updated!')
      onSaved()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-surface border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{isNew ? 'Add Item' : 'Edit Item'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white p-1"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm text-text-muted mb-1.5 block">Name *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Masala Chai" />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-text-muted mb-1.5 block">Description</label>
            <textarea className="input resize-none" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="A warming blend of spices…" />
          </div>

          {/* Price + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-text-muted mb-1.5 block">Base Price (₹) *</label>
              <input className="input" type="number" min="0" step="0.5" value={basePrice} onChange={e => setBasePrice(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm text-text-muted mb-1.5 block">Category *</label>
              <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Prep time + Image */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-text-muted mb-1.5 block">Prep Time (mins)</label>
              <input className="input" type="number" min="1" value={prepTime} onChange={e => setPrepTime(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm text-text-muted mb-1.5 block">Image URL</label>
              <input className="input text-xs" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-4">
            {[
              { label: 'Veg',       val: isVeg,       set: setIsVeg       },
              { label: 'Available', val: isAvailable,  set: setIsAvailable  },
              { label: 'Featured',  val: isFeatured,   set: setIsFeatured   },
            ].map(({ label, val, set }) => (
              <button key={label} onClick={() => set(!val)}
                className={cn('flex-1 py-2 rounded-xl text-xs font-medium border transition-all',
                  val ? 'border-gold bg-gold/10 text-gold' : 'border-border text-text-muted')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-text-muted">Variants</label>
              <button onClick={() => setVariants(v => [...v, { name: '', price_delta: 0 }])} className="text-gold text-xs flex items-center gap-1"><Plus size={12} />Add</button>
            </div>
            {variants.map((v, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className="input flex-1 text-sm py-2" placeholder="e.g. Large" value={v.name ?? ''} onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <input className="input w-24 text-sm py-2" type="number" placeholder="+20" value={v.price_delta ?? 0} onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, price_delta: Number(e.target.value) } : x))} />
                <button onClick={() => setVariants(vs => vs.filter((_, j) => j !== i))} className="text-text-muted hover:text-red-400 p-2"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          {/* Add-ons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-text-muted">Add-ons</label>
              <button onClick={() => setAddOns(a => [...a, { name: '', price: 0 }])} className="text-gold text-xs flex items-center gap-1"><Plus size={12} />Add</button>
            </div>
            {addOns.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className="input flex-1 text-sm py-2" placeholder="e.g. Extra cheese" value={a.name ?? ''} onChange={e => setAddOns(as => as.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <input className="input w-24 text-sm py-2" type="number" min="0" placeholder="₹20" value={a.price ?? 0} onChange={e => setAddOns(as => as.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} />
                <button onClick={() => setAddOns(as => as.filter((_, j) => j !== i))} className="text-text-muted hover:text-red-400 p-2"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-gold flex-1">
            {saving ? 'Saving…' : isNew ? 'Create Item' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
