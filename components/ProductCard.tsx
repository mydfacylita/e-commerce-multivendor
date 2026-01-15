'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FiShoppingCart, FiHeart, FiEye } from 'react-icons/fi'
import { useCartStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { useState } from 'react'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  images: string[]
  stock: number
}

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem)
  const [isHovered, setIsHovered] = useState(false)

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || '/placeholder.jpg',
      quantity: 1,
    })
    toast.success('🎉 Produto adicionado!', {
      style: {
        background: '#10B981',
        color: '#fff',
      },
    })
  }

  const discount = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0

  const isLowStock = product.stock > 0 && product.stock <= 5

  return (
    <div 
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 group relative flex flex-col h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/produtos/${product.slug}`} className="block">
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className={`object-cover transition-transform duration-500 ${
                isHovered ? 'scale-110' : 'scale-100'
              }`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-4xl">
              📦
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
            {discount > 0 && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                🔥 -{discount}%
              </div>
            )}
            {product.stock === 0 && (
              <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-sm font-bold">
                ESGOTADO
              </div>
            )}
          </div>

          {/* Overlay com botão - Aparece no hover */}
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-all duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleAddToCart()
              }}
              disabled={product.stock === 0}
              className="bg-white text-primary-600 px-6 py-3 rounded-lg font-bold hover:bg-accent-500 hover:text-white transform hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto"
            >
              <FiShoppingCart className="inline mr-2" />
              {product.stock === 0 ? 'Indisponível' : 'COMPRAR AGORA'}
            </button>
          </div>
        </div>
      </Link>
      
      <div className="p-4 space-y-3 flex flex-col flex-1">
        <Link href={`/produtos/${product.slug}`} className="block">
          <h3 className="font-semibold text-base hover:text-primary-600 transition line-clamp-2 h-12 leading-tight">
            {product.name}
          </h3>
        </Link>
        
        {/* Preços */}
        <div className="space-y-1 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary-600">
              R$ {product.price.toFixed(2)}
            </span>
            {product.comparePrice && (
              <span className="text-gray-400 line-through text-xs">
                R$ {product.comparePrice.toFixed(2)}
              </span>
            )}
          </div>
          {discount > 0 && (
            <p className="text-green-600 text-xs font-semibold">
              💰 Economize R$ {(product.comparePrice! - product.price).toFixed(2)}
            </p>
          )}
          <p className="text-xs text-gray-500">ou 3x de R$ {(product.price / 3).toFixed(2)}</p>
        </div>

        {/* Estoque/Urgência */}
        {isLowStock && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
            <p className="text-red-600 text-xs font-semibold flex items-center gap-1">
              ⚡ Últimas {product.stock} unidades!
            </p>
          </div>
        )}

        {/* Botão Adicionar ao Carrinho */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full bg-accent-500 text-white py-2.5 rounded-lg hover:bg-accent-600 transition flex items-center justify-center gap-2 font-bold text-sm disabled:bg-gray-400 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
        >
          <FiShoppingCart size={18} />
          <span>{product.stock === 0 ? 'ESGOTADO' : 'ADICIONAR'}</span>
        </button>

        {/* Trust Badges */}
        <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
          <span>🚚 Frete Grátis</span>
          <span>🔒 Compra Segura</span>
        </div>
      </div>
    </div>
  )
}
