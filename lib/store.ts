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
  skuId?: string | null  // SUB-SKU do fornecedor (para produtos importados)
  stock?: number
  slug?: string
  isImported?: boolean // Para cálculo de impostos (FALSE se shipFromCountry = BR)
  isInternationalSupplier?: boolean // TRUE se fornecedor é internacional (AliExpress, etc) - para fluxo/exibição
  supplierId?: string | null // ID do fornecedor externo (AliExpress, etc)
  sellerId?: string | null // ID do vendedor (marketplace)
  sellerCep?: string | null // CEP do vendedor (para cálculo de frete)
  itemType?: 'ADM' | 'DROP' | 'SELLER' // Tipo do item para roteamento
  shipFromCountry?: string | null // País de origem do envio (BR = não paga imposto importação)
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
          
          // Estoque máximo para esta variante
          const maxStock = item.stock || 999
          
          if (existingItem) {
            // Calcular nova quantidade respeitando o estoque
            const newQuantity = Math.min(existingItem.quantity + item.quantity, maxStock)
            
            return {
              items: state.items.map((i) =>
                i.id === itemKey
                  ? { ...i, quantity: newQuantity, stock: maxStock }
                  : i
              ),
            }
          }
          
          // Novo item - garantir que quantidade não exceda estoque
          const safeQuantity = Math.min(item.quantity, maxStock)
          return { items: [...state.items, { ...item, id: itemKey, productId, quantity: safeQuantity }] }
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id === id) {
              // Respeitar o estoque máximo ao atualizar quantidade
              const maxStock = item.stock || 999
              const safeQuantity = Math.min(Math.max(1, quantity), maxStock)
              return { ...item, quantity: safeQuantity }
            }
            return item
          }),
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
      // Validar estoque ao carregar do localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Corrigir quantidades que excedem o estoque
          const correctedItems = state.items.map(item => {
            if (item.stock && item.quantity > item.stock) {
              console.warn(`⚠️ Carrinho: Corrigindo quantidade de ${item.name} de ${item.quantity} para ${item.stock}`)
              return { ...item, quantity: item.stock }
            }
            return item
          })
          
          // Se houve correções, atualizar o estado
          const hasCorrections = correctedItems.some((item, i) => item.quantity !== state.items[i].quantity)
          if (hasCorrections) {
            state.items = correctedItems
          }
        }
      }
    }
  )
)

// Função auxiliar para sincronizar estoque do carrinho com o servidor
export async function syncCartStock(items: CartItem[]): Promise<CartItem[]> {
  if (items.length === 0) return items
  
  try {
    // Extrair IDs únicos dos produtos
    const productIds = [...new Set(items.map(item => {
      const parts = item.id.split('_')
      return parts[0] // Pegar apenas o productId
    }))]
    
    const response = await fetch('/api/products/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds })
    })
    
    if (!response.ok) return items
    
    const stockData = await response.json()
    
    // Atualizar estoque de cada item
    return items.map(item => {
      const productId = item.id.split('_')[0]
      const size = item.selectedSize || 'none'
      const color = item.selectedColor || 'none'
      
      const productStock = stockData[productId]
      if (!productStock) return item
      
      // Se tem variantes, buscar estoque específico
      if (productStock.variants && size !== 'none' && color !== 'none') {
        const variant = productStock.variants.find(
          (v: { size: string; color: string }) => v.size === size && v.color === color
        )
        if (variant) {
          const newStock = variant.stock
          const safeQuantity = Math.min(item.quantity, newStock)
          return { ...item, stock: newStock, quantity: safeQuantity }
        }
      }
      
      // Senão, usar estoque geral do produto
      const newStock = productStock.stock || item.stock
      const safeQuantity = Math.min(item.quantity, newStock)
      return { ...item, stock: newStock, quantity: safeQuantity }
    })
  } catch (error) {
    console.error('Erro ao sincronizar estoque:', error)
    return items
  }
}
