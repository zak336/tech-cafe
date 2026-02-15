'use client'

import { useState, useRef } from 'react'
import { Category, MenuItem } from '@/types'
import { cn } from '@/lib/utils'
import MenuCard from './MenuCard'

interface Props {
  categories: Category[]
  menuItems: MenuItem[]
  cafeId: string
}

export default function CategoryTabs({ categories, menuItems, cafeId }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const tabsRef = useRef<HTMLDivElement>(null)

  const filtered = activeCategory === 'all'
    ? menuItems
    : menuItems.filter(m => m.category_id === activeCategory)

  function selectCategory(id: string) {
    setActiveCategory(id)
    // Scroll tab into view
    const tab = tabsRef.current?.querySelector(`[data-cat="${id}"]`) as HTMLElement
    tab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  const allCategories = [
    { id: 'all', name: 'All', slug: 'all' } as Category,
    ...categories,
  ]

  return (
    <div>
      {/* Category Tabs */}
      <div
        ref={tabsRef}
        className="flex gap-2 overflow-x-auto no-scrollbar pb-2"
      >
        {allCategories.map(cat => (
          <button
            key={cat.id}
            data-cat={cat.id}
            onClick={() => selectCategory(cat.id)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              activeCategory === cat.id
                ? 'bg-gold text-black shadow-gold'
                : 'bg-surface-2 text-text-muted hover:text-white border border-border'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-text-muted text-xs mt-3 mb-4">
        {filtered.length} item{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-3">🍽️</p>
          <p>No items in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((item, i) => (
            <div
              key={item.id}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <MenuCard item={item} cafeId={cafeId} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
