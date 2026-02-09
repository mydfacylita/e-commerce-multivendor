'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { FiShoppingCart, FiHeart, FiEye } from 'react-icons/fi'
import { useCartStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { analytics } from '@/lib/analytics-client'

// Formatar moeda brasileira
const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  images: string[]
  stock: number
  isImported?: boolean  // Para cálculo de impostos
  isInternationalSupplier?: boolean  // Para fluxo/exibição
  supplierId?: string | null  // ID do fornecedor externo
  sellerId?: string | null  // ID do vendedor (marketplace)
  sellerCep?: string | null  // CEP do vendedor
  itemType?: 'ADM' | 'DROP' | 'SELLER'  // Tipo do item para roteamento
  shipFromCountry?: string | null  // País de origem do envio
  description?: string | null  // Descrição para modo lista
  hasVariants?: boolean  // Indica se o produto tem variantes (cores/modelos)
}

interface ProductCardProps {
  product: Product
  layout?: 'vertical' | 'horizontal'
}

export default function ProductCard({ product, layout = 'vertical' }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  const handleAddToCart = () => {
    // Se o produto tem variantes, redirecionar para a página do produto
    if (product.hasVariants) {
      toast('Selecione cor/modelo primeiro!', { icon: '👆' })
      router.push(`/produtos/${product.slug}`)
      return
    }
    
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || '/placeholder.jpg',
      quantity: 1,
      isImported: product.isImported || false,
      isInternationalSupplier: product.isInternationalSupplier || false,
      supplierId: product.supplierId || null,
      sellerId: product.sellerId || null,
      sellerCep: product.sellerCep || null,
      itemType: product.itemType || 'ADM',
      shipFromCountry: product.shipFromCountry || null,
    })
    
    // Rastrear AddToCart no Facebook Pixel e Google Analytics
    analytics.addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
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

  // Layout Horizontal (Lista)
  if (layout === 'horizontal') {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 flex">
        <Link href={`/produtos/${product.slug}`} className="block w-48 flex-shrink-0">
          <div className="relative h-full min-h-[180px] bg-gray-100 overflow-hidden">
            {product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-4xl">
                📦
              </div>
            )}
            {discount > 0 && (
              <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                🔥 -{discount}%
              </div>
            )}
          </div>
        </Link>
        
        <div className="p-4 flex flex-col flex-1">
          <Link href={`/produtos/${product.slug}`} className="block">
            <h3 className="font-semibold text-lg hover:text-primary-600 transition line-clamp-2 mb-2">
              {product.name}
            </h3>
          </Link>
          
          {product.description && (
            <p className="text-gray-500 text-sm line-clamp-2 mb-3">{product.description}</p>
          )}
          
          <div className="flex items-center gap-4 flex-wrap mt-auto">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary-600">
                {formatCurrency(product.price)}
              </span>
              {product.comparePrice && (
                <span className="text-gray-400 line-through text-sm">
                  {formatCurrency(product.comparePrice)}
                </span>
              )}
            </div>
            
            {discount > 0 && (
              <span className="text-green-600 text-sm font-semibold">
                Economize {formatCurrency(product.comparePrice! - product.price)}
              </span>
            )}
            
            <p className="text-xs text-gray-500">ou 3x de {formatCurrency(product.price / 3)}</p>
          </div>
          
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="bg-accent-500 text-white px-6 py-2.5 rounded-lg hover:bg-accent-600 transition flex items-center gap-2 font-bold text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <FiShoppingCart size={18} />
              <span>{product.stock === 0 ? 'ESGOTADO' : 'ADICIONAR'}</span>
            </button>
            
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>🚚 Frete Grátis</span>
              <span>🔒 Compra Segura</span>
            </div>
            
            {isLowStock && (
              <span className="text-red-600 text-xs font-semibold">
                ⚡ Últimas {product.stock} unidades!
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Layout Vertical (Grid) - Padrão
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
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl font-bold text-primary-600 whitespace-nowrap">
              {formatCurrency(product.price)}
            </span>
            {product.comparePrice && (
              <span className="text-gray-400 line-through text-xs whitespace-nowrap">
                {formatCurrency(product.comparePrice)}
              </span>
            )}
          </div>
          {discount > 0 && (
            <p className="text-green-600 text-xs font-semibold">
              💰 Economize {formatCurrency(product.comparePrice! - product.price)}
            </p>
          )}
          <p className="text-xs text-gray-500">ou 3x de {formatCurrency(product.price / 3)}</p>
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
