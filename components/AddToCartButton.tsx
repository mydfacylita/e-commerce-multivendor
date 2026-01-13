'use client'

import { FiShoppingCart } from 'react-icons/fi'
import { useCartStore } from '@/lib/store'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  slug?: string
  price: number
  images: string[]
  stock: number
}

interface AddToCartButtonProps {
  product: Product
  disabled?: boolean
  selectedColor?: string | null
  selectedSize?: string | null
}

export default function AddToCartButton({ product, disabled, selectedColor, selectedSize }: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = () => {
    if (disabled) {
      if (product.stock === 0) {
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
      quantity: 1,
      selectedColor: selectedColor || null,
      selectedSize: selectedSize || null,
      stock: product.stock,
      slug: product.slug,
    })
    
    const sizeColorInfo = []
    if (selectedSize) sizeColorInfo.push(selectedSize)
    if (selectedColor) sizeColorInfo.push(selectedColor)
    
    const message = sizeColorInfo.length > 0
      ? `${product.name} (${sizeColorInfo.join(' - ')}) adicionado ao carrinho!`
      : `${product.name} adicionado ao carrinho!`
    
    toast.success(message)
  }

  const isDisabled = disabled || product.stock === 0

  return (
    <button
      onClick={handleAddToCart}
      disabled={isDisabled}
      className="w-full bg-primary-600 text-white py-4 rounded-lg hover:bg-primary-700 transition flex items-center justify-center space-x-2 text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      <FiShoppingCart size={24} />
      <span>{product.stock === 0 ? 'Esgotado' : 'Adicionar ao Carrinho'}</span>
    </button>
  )
}
