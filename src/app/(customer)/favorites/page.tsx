import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MenuCard from '@/components/customer/MenuCard'

export default async function FavoritesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/favorites')

  const { data: favorites } = await supabase
    .from('favorites')
    .select('menu_item_id, menu_items(*, variants(*), add_ons(*), category:categories(name,slug))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const items = (favorites ?? []).map(f => f.menu_items).filter(Boolean) as any[]
  const cafeId = items[0]?.cafe_id ?? ''

  return (
    <div className="page-container pt-6">
      <h1 className="font-display text-3xl font-bold mb-6">Saved Items</h1>
      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">❤️</p>
          <p className="text-text-muted">No saved items yet</p>
          <p className="text-text-muted text-sm mt-1">Tap the heart icon on any item to save it</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {items.map((item: any, i: number) => (
            <div key={item.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <MenuCard item={item} cafeId={cafeId} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
