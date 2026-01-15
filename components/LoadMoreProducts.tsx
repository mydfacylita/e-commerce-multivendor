'use client'

import { useState, useEffect, useRef } from 'react'
import ProductCard from './ProductCard'
import { FiLoader } from 'react-icons/fi'

interface Product {
  id: string
  name: string
  price: number
  originalPrice?: number | null
  images: string[]
  category?: { name: string } | null
  featured?: boolean
  slug?: string
  stock?: number
}

interface LoadMoreProductsProps {
  initialProducts: Product[]
  totalCount: number
  itemsPerPage?: number
  title?: string
  subtitle?: string
}

export default function LoadMoreProducts({ 
  initialProducts, 
  totalCount,
  itemsPerPage = 12,
  title = "✨ Todos os Produtos",
  subtitle = "Explore nossa coleção completa"
}: LoadMoreProductsProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialProducts.length < totalCount)
  
  // Ref para o elemento sentinel (detector de scroll)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  // Função para carregar mais produtos
  const loadMore = async () => {
    if (loadingRef.current || !hasMore) return
    
    loadingRef.current = true
    setLoading(true)
    
    try {
      const nextPage = page + 1
      console.log('🔄 Carregando página:', nextPage)
      
      const response = await fetch(`/api/products/paginated?page=${nextPage}&limit=${itemsPerPage}`, {
        headers: {
          'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Produtos recebidos:', data.products?.length)
        
        if (data.products && data.products.length > 0) {
          setProducts(prev => {
            const newProducts = [...prev, ...data.products]
            // Verificar se ainda há mais produtos
            setHasMore(newProducts.length < data.total)
            return newProducts
          })
          setPage(nextPage)
        } else {
          setHasMore(false)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar mais produtos:', error)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  // Intersection Observer para scroll infinito
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        console.log('👁️ Sentinel visível:', entry.isIntersecting, 'hasMore:', hasMore, 'loading:', loadingRef.current)
        
        if (entry.isIntersecting && hasMore && !loadingRef.current) {
          loadMore()
        }
      },
      {
        root: null,
        rootMargin: '400px', // Carregar 400px antes de chegar ao final
        threshold: 0.1
      }
    )

    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [hasMore]) // Só depende do hasMore

  return (
    <section className="py-16 px-4 w-full">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">{title}</h2>
            <p className="text-gray-600">{subtitle}</p>
          </div>
          <div className="text-sm text-gray-500">
            Exibindo {products.length} de {totalCount} produtos
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {products.map((product, index) => (
            <div 
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(index, 11) * 50}ms` }}
            >
              <ProductCard product={product as any} />
            </div>
          ))}
        </div>

        {/* Sentinel - SEMPRE presente para detectar scroll */}
        <div 
          ref={sentinelRef} 
          className="h-20 flex items-center justify-center mt-8"
        >
          {loading && (
            <div className="inline-flex items-center gap-3 px-8 py-4 text-primary-600 font-bold">
              <FiLoader className="animate-spin" size={24} />
              <span>Carregando mais produtos...</span>
            </div>
          )}
        </div>

        {/* Barra de progresso */}
        {hasMore && (
          <div className="max-w-md mx-auto mt-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>{products.length} produtos</span>
              <span>{totalCount} total</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                style={{ width: `${(products.length / totalCount) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Todos os produtos carregados */}
        {!hasMore && products.length > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-full">
              <span className="text-xl">🎉</span>
              <span className="font-medium">Você viu todos os {totalCount} produtos!</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
