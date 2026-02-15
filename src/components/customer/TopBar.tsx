'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useCartStore } from '@/store/cart'

export default function TopBar() {
  const itemCount = useCartStore(s => s.itemCount())

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-border">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl font-bold text-gold tracking-tight">
          Tech Cafe
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/orders" className="relative btn-ghost p-2 rounded-full">
            <Bell size={20} />
          </Link>

          {itemCount > 0 && (
            <Link href="/cart" className="relative">
              <div className="bg-gold text-black text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center animate-pulse-gold">
                {itemCount}
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
