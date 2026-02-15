'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Coupon } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const EMPTY: Partial<Coupon> = {
  code: '', description: '', discount_type: 'percentage', discount_value: 10,
  min_order_value: 0, max_discount_amount: null, max_uses: null,
  per_user_limit: 1, is_active: true, expires_at: null,
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [cafeId,  setCafeId]  = useState<string>('')
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null)
  const [saving,  setSaving]  = useState(false)
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('cafe_id').eq('id', user!.id).single()
    if (!profile?.cafe_id) return
    setCafeId(profile.cafe_id)
    const { data } = await supabase.from('coupons').select('*').eq('cafe_id', profile.cafe_id).order('created_at', { ascending: false })
    setCoupons(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    if (!editing?.code?.trim()) { toast.error('Coupon code required'); return }
    setSaving(true)
    const payload = {
      cafe_id: cafeId,
      code: editing.code!.toUpperCase().trim(),
      description: editing.description ?? '',
      discount_type: editing.discount_type!,
      discount_value: editing.discount_value!,
      min_order_value: editing.min_order_value ?? 0,
      max_discount_amount: editing.max_discount_amount ?? null,
      max_uses: editing.max_uses ?? null,
      per_user_limit: editing.per_user_limit ?? 1,
      is_active: editing.is_active ?? true,
      expires_at: editing.expires_at ?? null,
    }
    const { error } = editing.id
      ? await supabase.from('coupons').update(payload).eq('id', editing.id)
      : await supabase.from('coupons').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(editing.id ? 'Coupon updated' : 'Coupon created')
    setEditing(null)
    load()
    setSaving(false)
  }

  async function deleteCoupon(id: string) {
    if (!confirm('Delete this coupon?')) return
    await supabase.from('coupons').delete().eq('id', id)
    setCoupons(c => c.filter(x => x.id !== id))
    toast.success('Deleted')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Coupons</h1>
          <p className="text-text-muted mt-1">{coupons.length} coupons</p>
        </div>
        <button onClick={() => setEditing(EMPTY)} className="btn-gold flex items-center gap-2">
          <Plus size={18} />New Coupon
        </button>
      </div>

      {/* Coupon cards */}
      <div className="grid gap-3">
        {coupons.map(coupon => (
          <div key={coupon.id} className={cn('card p-5', !coupon.is_active && 'opacity-60')}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                  <Tag size={18} className="text-gold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold font-mono text-gold">{coupon.code}</p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', coupon.is_active ? 'bg-green-400/10 text-green-400' : 'bg-surface-3 text-text-muted')}>
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-text-muted text-xs mt-0.5">{coupon.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(coupon)} className="btn-ghost p-2 rounded-lg"><Pencil size={15} /></button>
                <button onClick={() => deleteCoupon(coupon.id)} className="btn-ghost p-2 rounded-lg hover:text-red-400"><Trash2 size={15} /></button>
              </div>
            </div>

            <div className="flex gap-4 mt-4 pt-4 border-t border-border text-sm">
              <div><p className="text-text-muted text-xs">Discount</p>
                <p className="font-semibold">
                  {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value)}
                  {coupon.max_discount_amount && ` (max ${formatCurrency(coupon.max_discount_amount)})`}
                </p>
              </div>
              <div><p className="text-text-muted text-xs">Min order</p><p className="font-semibold">{formatCurrency(coupon.min_order_value)}</p></div>
              <div><p className="text-text-muted text-xs">Uses</p><p className="font-semibold">{coupon.used_count}{coupon.max_uses ? `/${coupon.max_uses}` : ''}</p></div>
              {coupon.expires_at && <div><p className="text-text-muted text-xs">Expires</p><p className="font-semibold">{formatDate(coupon.expires_at)}</p></div>}
            </div>
          </div>
        ))}
        {coupons.length === 0 && <div className="text-center py-12 text-text-muted">No coupons yet</div>}
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-5">{editing.id ? 'Edit Coupon' : 'New Coupon'}</h2>
            <div className="space-y-3">
              <input className="input uppercase" placeholder="SAVE20" value={editing.code ?? ''} onChange={e => setEditing(p => ({...p!, code: e.target.value.toUpperCase()}))} />
              <input className="input" placeholder="Description" value={editing.description ?? ''} onChange={e => setEditing(p => ({...p!, description: e.target.value}))} />
              <div className="grid grid-cols-2 gap-3">
                <select className="input" value={editing.discount_type} onChange={e => setEditing(p => ({...p!, discount_type: e.target.value as any}))}>
                  <option value="percentage">Percentage %</option>
                  <option value="flat">Flat ₹</option>
                </select>
                <input className="input" type="number" min="0" placeholder="Value" value={editing.discount_value ?? ''} onChange={e => setEditing(p => ({...p!, discount_value: Number(e.target.value)}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input" type="number" min="0" placeholder="Min order ₹" value={editing.min_order_value ?? ''} onChange={e => setEditing(p => ({...p!, min_order_value: Number(e.target.value)}))} />
                <input className="input" type="number" min="0" placeholder="Max discount ₹" value={editing.max_discount_amount ?? ''} onChange={e => setEditing(p => ({...p!, max_discount_amount: e.target.value ? Number(e.target.value) : null}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input" type="number" min="1" placeholder="Max uses" value={editing.max_uses ?? ''} onChange={e => setEditing(p => ({...p!, max_uses: e.target.value ? Number(e.target.value) : null}))} />
                <input className="input" type="date" placeholder="Expires" value={editing.expires_at?.split('T')[0] ?? ''} onChange={e => setEditing(p => ({...p!, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null}))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing(p => ({...p!, is_active: e.target.checked}))} className="w-4 h-4 accent-gold" />
                <span className="text-sm">Active</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditing(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-gold flex-1">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
