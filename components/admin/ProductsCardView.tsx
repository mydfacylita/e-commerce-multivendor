'use client'

import Link from 'next/link'
import { FiEdit, FiPackage, FiStar, FiEye, FiEyeOff } from 'react-icons/fi'

interface Product {
  id: string
  name: string
  price: number
  comparePrice?: number | null
  stock: number
  active: boolean
  featured: boolean
  isDropshipping: boolean
  images: string
  category: { name: string }
  supplier?: { name: string } | null
  supplierSku?: string | null
}

interface ProductsCardViewProps {
  products: Product[]
  reviewMap?: Record<string, { avg: number; count: number }>
  visitMap?: Record<string, number>
}

export default function ProductsCardView({ products, reviewMap = {}, visitMap = {} }: ProductsCardViewProps) {
  const getImage = (product: Product): string | null => {
    try {
      if (typeof product.images === 'string' && product.images.trim()) {
        const parsed = JSON.parse(product.images)
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null
      }
    } catch {
      if (typeof product.images === 'string' && product.images.startsWith('http')) {
        return product.images
      }
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {products.map((product) => {
        const image = getImage(product)
        const review = reviewMap[product.id]
        const visits = visitMap[product.id] ?? 0
        
        return (
          <div
            key={product.id}
            className={`bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${!product.active ? 'opacity-60' : ''}`}
          >
            {/* Imagem */}
            <div className="relative aspect-square bg-gray-100">
              {image ? (
                <img
                  src={image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FiPackage className="text-gray-300" size={48} />
                </div>
              )}
              
              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {product.featured && (
                  <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <FiStar size={10} /> Destaque
                  </span>
                )}
                {product.isDropshipping && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    🚀 Drop
                  </span>
                )}
              </div>

              {/* Status */}
              <div className="absolute top-2 right-2">
                {product.active ? (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <FiEye size={10} />
                  </span>
                ) : (
                  <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <FiEyeOff size={10} />
                  </span>
                )}
              </div>

              {/* Estoque baixo */}
              {product.stock === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs text-center py-1">
                  SEM ESTOQUE
                </div>
              )}
              {product.stock > 0 && product.stock <= 10 && (
                <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 text-white text-xs text-center py-1">
                  Últimas {product.stock} unidades
                </div>
              )}
              {/* Estrelas + visitas quando há estoque */}
              {product.stock > 10 && review && review.avg > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/55 px-2 py-0.5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <FiStar className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-white text-xs font-bold">{review.avg.toFixed(1)}</span>
                    <span className="text-yellow-200 text-xs opacity-80">({review.count})</span>
                  </div>
                  {visits > 0 && (
                    <div className="flex items-center gap-1">
                      <FiEye className="w-3 h-3 text-blue-300" />
                      <span className="text-white text-xs">{visits >= 1000 ? `${(visits/1000).toFixed(1)}k` : visits}</span>
                    </div>
                  )}
                </div>
              )}
              {product.stock > 10 && (!review || review.avg === 0) && visits > 0 && (
                <div className="absolute bottom-0 right-0 bg-black/55 px-2 py-0.5 flex items-center gap-1 rounded-tl">
                  <FiEye className="w-3 h-3 text-blue-300" />
                  <span className="text-white text-xs">{visits >= 1000 ? `${(visits/1000).toFixed(1)}k` : visits}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <p className="text-sm font-medium line-clamp-2 h-10" title={product.name}>
                {product.name}
              </p>
              
              <div className="mt-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {product.category.name}
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold text-primary-600">
                  R$ {product.price.toFixed(2)}
                </span>
                {product.comparePrice && product.comparePrice > product.price && (
                  <span className="text-sm text-gray-400 line-through">
                    R$ {product.comparePrice.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {product.stock} em estoque
                </span>
                {product.supplier && (
                  <span className="text-xs text-gray-400 truncate max-w-[80px]" title={product.supplier.name}>
                    {product.supplier.name}
                  </span>
                )}
              </div>

              {/* Ações */}
              <div className="mt-3 pt-3 border-t flex justify-center">
                <Link
                  href={`/admin/produtos/${product.id}`}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800"
                >
                  <FiEdit size={14} />
                  Editar
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
