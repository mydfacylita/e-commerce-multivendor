import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  id: string // ID único do item no carrinho (productId_size_color)
  productId: string // ID real do produto no banco
  name: string
  price: number
  image: string
  quantity: number
  selectedSize?: string | null
  selectedColor?: string | null
  stock?: number
  slug?: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          // Criar ID único com base em: productId + size + color
          const productId = item.productId || item.id // Suportar ambos os formatos
          const itemKey = `${productId}_${item.selectedSize || 'none'}_${item.selectedColor || 'none'}`
          const existingItem = state.items.find((i) => i.id === itemKey)
          
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.id === itemKey
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            }
          }
          return { items: [...state.items, { ...item, id: itemKey, productId }] }
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        })),
      clearCart: () => set({ items: [] }),
      total: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        )
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)
