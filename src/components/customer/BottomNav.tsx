'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, Clock, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/store/cart'

const NAV = [
  { href: '/',          label: 'Menu',    icon: Home       },
  { href: '/cart',      label: 'Cart',    icon: ShoppingBag },
  { href: '/orders',    label: 'Orders',  icon: Clock      },
  { href: '/favorites', label: 'Saved',   icon: Heart      },
]

export default function BottomNav() {
  const pathname    = usePathname()
  const itemCount   = useCartStore(s => s.itemCount())

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border">
      <div className="max-w-2xl mx-auto px-2 h-20 flex items-center justify-around">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          const isCart = href === '/cart'

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
                active ? 'text-gold' : 'text-text-muted hover:text-white'
              )}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                {isCart && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gold text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] font-medium', active && 'text-gold')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
