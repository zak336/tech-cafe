'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { MenuItem } from '@/types'
import { cn, formatCurrency } from '@/lib/utils'
import Image from 'next/image'
import MenuCard from './MenuCard'

interface Props {
  menuItems: MenuItem[]
  cafeId: string
}

export default function SearchBar({ menuItems, cafeId }: Props) {
  const [query,   setQuery]   = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = query.trim().length < 2
    ? []
    : menuItems.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase())
      )

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setQuery(''); setFocused(false); inputRef.current?.blur() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div className="relative mt-4">
      <div className={cn(
        'flex items-center gap-3 bg-surface-2 border rounded-2xl px-4 py-3 transition-all duration-200',
        focused ? 'border-gold ring-1 ring-gold/20' : 'border-border'
      )}>
        <Search size={18} className="text-text-muted flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search menu…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          className="flex-1 bg-transparent text-white placeholder:text-text-muted text-sm outline-none"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-text-muted hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {focused && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-2xl overflow-hidden z-30 shadow-card max-h-80 overflow-y-auto animate-slide-down">
          {results.length === 0 ? (
            <div className="p-6 text-center text-text-muted text-sm">
              No results for "{query}"
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {results.slice(0, 8).map(item => (
                <SearchResult key={item.id} item={item} cafeId={cafeId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchResult({ item, cafeId }: { item: MenuItem; cafeId: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-2 transition-colors cursor-pointer">
      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-surface-3 flex-shrink-0">
        {item.image_url
          ? <Image src={item.image_url} alt={item.name} fill className="object-cover" />
          : <span className="text-lg flex items-center justify-center w-full h-full">🍴</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <p className="text-xs text-gold">{formatCurrency(item.base_price)}</p>
      </div>
    </div>
  )
}
