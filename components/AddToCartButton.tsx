'use client'

import { FiShoppingCart } from 'react-icons/fi'
import { useCartStore } from '@/lib/store'
import toast from 'react-hot-toast'

interface Product {
  id: string
  name: string
  price: number
  images: string[]
  stock: number
}

export default function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = () => {
    if (product.stock === 0) {
      toast.error('Produto esgotado!')
      return
    }

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || '/placeholder.jpg',
      quantity: 1,
    })
    toast.success('Produto adicionado ao carrinho!')
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={product.stock === 0}
      className="w-full bg-primary-600 text-white py-4 rounded-lg hover:bg-primary-700 transition flex items-center justify-center space-x-2 text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      <FiShoppingCart size={24} />
      <span>{product.stock === 0 ? 'Esgotado' : 'Adicionar ao Carrinho'}</span>
    </button>
  )
}
