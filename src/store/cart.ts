import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, CartAddOn } from '@/types'
import { generateId, calcUnitPrice } from '@/lib/utils'

interface CartState {
  items: CartItem[]
  cafeId: string | null

  // Actions
  addItem: (item: Omit<CartItem, 'id' | 'add_ons_total' | 'unit_price' | 'total_price'>) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  clearCart: () => void
  setCafeId: (cafeId: string) => void

  // Computed
  itemCount: () => number
  subtotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      cafeId: null,

      addItem: (item) => {
        const addOnsTotal = item.add_ons.reduce((sum, a) => sum + a.price, 0)
        const unit_price = calcUnitPrice(item.base_price, item.variant_price_delta, addOnsTotal)
        const newItem: CartItem = {
          ...item,
          id: generateId(),
          add_ons_total: addOnsTotal,
          unit_price,
          total_price: unit_price * item.quantity,
        }
        set(state => ({ items: [...state.items, newItem] }))
      },

      removeItem: (cartItemId) => {
        set(state => ({ items: state.items.filter(i => i.id !== cartItemId) }))
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId)
          return
        }
        set(state => ({
          items: state.items.map(i =>
            i.id === cartItemId
              ? { ...i, quantity, total_price: i.unit_price * quantity }
              : i
          ),
        }))
      },

      clearCart: () => set({ items: [], cafeId: null }),

      setCafeId: (cafeId) => set({ cafeId }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () => get().items.reduce((sum, i) => sum + i.total_price, 0),
    }),
    {
      name: 'tech-cafe-cart',
    }
  )
)
