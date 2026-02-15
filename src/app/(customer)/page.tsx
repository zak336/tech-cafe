import { createClient } from '@/lib/supabase/server'
import BannerSlider from '@/components/customer/BannerSlider'
import CategoryTabs from '@/components/customer/CategoryTabs'
//import MenuGrid from '@/components/customer/MenuGrid'
import SearchBar from '@/components/customer/SearchBar'

export const revalidate = 60 // ISR every 60s

async function getData() {
  const supabase = createClient()

  const [cafes, banners, categories, menuItems] = await Promise.all([
    supabase.from('cafes').select('*').eq('is_active', true).limit(1).single(),
    supabase.from('banners').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('categories').select('*').eq('is_active', true).is('deleted_at', null).order('sort_order'),
    supabase
      .from('menu_items')
      .select('*, variants(*), add_ons(*), category:categories(name,slug)')
      .is('deleted_at', null)
      .eq('is_available', true)
      .order('sort_order'),
  ])

  return {
    cafe:       cafes.data,
    banners:    banners.data ?? [],
    categories: categories.data ?? [],
    menuItems:  menuItems.data ?? [],
  }
}

export default async function HomePage() {
  const { cafe, banners, categories, menuItems } = await getData()

  if (!cafe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-text-muted">No cafe found. Please contact admin.</p>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Welcome */}
      <div className="pt-4 pb-2 animate-fade-in">
        <p className="text-text-muted text-sm">Good {getGreeting()} 👋</p>
        <h1 className="font-display text-3xl font-bold text-white mt-1">
          What are you having?
        </h1>
      </div>

      {/* Search */}
      <SearchBar menuItems={menuItems} cafeId={cafe.id} />

      {/* Banner Slider */}
      {banners.length > 0 && (
        <div className="mt-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <BannerSlider banners={banners} />
        </div>
      )}

      {/* Categories + Menu */}
      <div className="mt-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <CategoryTabs
          categories={categories}
          menuItems={menuItems}
          cafeId={cafe.id}
        />
      </div>
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
