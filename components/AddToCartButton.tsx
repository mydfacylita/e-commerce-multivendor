'use client'

import { FiShoppingCart } from 'react-icons/fi'
import { useCartStore } from '@/lib/store'
import { analytics } from '@/lib/analytics-client'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  slug?: string
  price: number
  images: string[]
  stock: number
  isImported?: boolean  // Para cálculo de impostos
  isInternationalSupplier?: boolean  // Para fluxo/exibição
  supplierId?: string | null  // ID do fornecedor externo
  sellerId?: string | null  // ID do vendedor (marketplace)
  sellerCep?: string | null  // CEP do vendedor
  itemType?: 'ADM' | 'DROP' | 'SELLER'  // Tipo do item para roteamento
  shipFromCountry?: string | null  // País de origem do envio
}

interface AddToCartButtonProps {
  product: Product
  disabled?: boolean
  selectedColor?: string | null
  selectedSize?: string | null
  quantity?: number
  variantStock?: number // Estoque específico da variante
}

export default function AddToCartButton({ 
  product, 
  disabled, 
  selectedColor, 
  selectedSize, 
  quantity = 1,
  variantStock 
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem)
  
  // Usar estoque da variante se disponível, senão usar estoque do produto
  const currentStock = variantStock !== undefined ? variantStock : product.stock

  const handleAddToCart = () => {
    if (disabled) {
      if (currentStock === 0) {
        toast.error('Produto esgotado!')
      } else {
        toast.error('Por favor, selecione cor e tamanho!')
      }
      return
    }

    addItem({
      id: product.id,
      productId: product.id, // ID real do produto (sem variantes)
      name: product.name,
      price: product.price,
      image: product.images[0] || '/placeholder.jpg',
      quantity: quantity,
      selectedColor: selectedColor || null,
      selectedSize: selectedSize || null,
      stock: currentStock,
      slug: product.slug,
      isImported: product.isImported || false,
      isInternationalSupplier: product.isInternationalSupplier || false,
      supplierId: product.supplierId || null,
      sellerId: product.sellerId || null,
      sellerCep: product.sellerCep || null,
      itemType: product.itemType || 'ADM',
      shipFromCountry: product.shipFromCountry || null,
    })
    
    const sizeColorInfo = []
    if (selectedSize) sizeColorInfo.push(selectedSize)
    if (selectedColor) sizeColorInfo.push(selectedColor)
    
    const qtyInfo = quantity > 1 ? ` x${quantity}` : ''
    const message = sizeColorInfo.length > 0
      ? `${product.name} (${sizeColorInfo.join(' - ')})${qtyInfo} adicionado ao carrinho!`
      : `${product.name}${qtyInfo} adicionado ao carrinho!`
    
    toast.success(message)
    
    // Registrar evento de analytics
    analytics.addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity
    })
  }

  const isDisabled = disabled || currentStock === 0

  return (
    <button
      onClick={handleAddToCart}
      disabled={isDisabled}
      className="w-full bg-primary-600 text-white py-4 rounded-lg hover:bg-primary-700 transition flex items-center justify-center space-x-2 text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      <FiShoppingCart size={24} />
      <span>{currentStock === 0 ? 'Esgotado' : 'Adicionar ao Carrinho'}</span>
    </button>
  )
}
