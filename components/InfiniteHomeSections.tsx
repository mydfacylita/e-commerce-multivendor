'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
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

interface Section {
  id: string
  title: string
  emoji: string
  type: 'products' | 'category' | 'related' | 'offers'
  products: Product[]
  loaded: boolean
}

export default function InfiniteHomeSections() {
  const { data: session } = useSession()
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(false)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  // Definir as seções que serão carregadas
  const sectionDefinitions = [
    { id: 'recommended', title: 'Acho que você vai gostar', emoji: '💡', type: 'products' as const },
    { id: 'last-purchase', title: 'Baseado na sua última compra', emoji: '🛒', type: 'related' as const },
    { id: 'offers', title: 'Ofertas Imperdíveis', emoji: '🔥', type: 'offers' as const },
    { id: 'trending', title: 'Em Alta Agora', emoji: '📈', type: 'products' as const },
    { id: 'new-arrivals', title: 'Novidades da Semana', emoji: '✨', type: 'products' as const },
    { id: 'best-sellers', title: 'Mais Vendidos', emoji: '🏆', type: 'products' as const },
    { id: 'flash-sale', title: 'Promoção Relâmpago', emoji: '⚡', type: 'offers' as const },
    { id: 'for-you', title: 'Selecionados Para Você', emoji: '🎁', type: 'products' as const },
    { id: 'budget-friendly', title: 'Cabe no Bolso', emoji: '💰', type: 'products' as const },
    { id: 'premium', title: 'Produtos Premium', emoji: '👑', type: 'products' as const },
  ]

  // Carregar próxima seção
  const loadNextSection = async () => {
    if (loadingRef.current || currentSectionIndex >= sectionDefinitions.length) return
    
    loadingRef.current = true
    setLoading(true)
    
    try {
      const sectionDef = sectionDefinitions[currentSectionIndex]
      console.log('🔄 Carregando seção:', sectionDef.title)
      
      let endpoint = ''
      let params = new URLSearchParams()
      
      // Determinar endpoint baseado no tipo de seção
      switch (sectionDef.id) {
        case 'recommended':
          endpoint = '/api/products/paginated'
          params.set('page', '1')
          params.set('limit', '24')
          break
        case 'last-purchase':
          if (!session?.user) {
            // Se não logado, pular essa seção
            setCurrentSectionIndex(prev => prev + 1)
            loadingRef.current = false
            setLoading(false)
            return
          }
          endpoint = '/api/products/related'
          params.set('type', 'last-purchase')
          break
        case 'offers':
        case 'flash-sale':
          endpoint = '/api/products/paginated'
          params.set('page', String(Math.floor(Math.random() * 3) + 1))
          params.set('limit', '24')
          break
        case 'trending':
          endpoint = '/api/products/paginated'
          params.set('page', '2')
          params.set('limit', '24')
          break
        case 'new-arrivals':
          endpoint = '/api/products/paginated'
          params.set('page', '1')
          params.set('limit', '24')
          break
        case 'best-sellers':
          endpoint = '/api/products/paginated'
          params.set('page', '3')
          params.set('limit', '24')
          break
        case 'for-you':
        case 'budget-friendly':
        case 'premium':
          endpoint = '/api/products/paginated'
          params.set('page', String(currentSectionIndex + 1))
          params.set('limit', '24')
          break
        default:
          endpoint = '/api/products/paginated'
          params.set('page', String(currentSectionIndex + 1))
          params.set('limit', '24')
      }
      
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        headers: {
          'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const products = data.products || data || []
        
        console.log('📦 Produtos recebidos para', sectionDef.title, ':', products.length)
        
        if (products.length > 0) {
          setSections(prev => [...prev, {
            id: sectionDef.id,
            title: sectionDef.title,
            emoji: sectionDef.emoji,
            type: sectionDef.type,
            products: products,
            loaded: true
          }])
        }
        
        setCurrentSectionIndex(prev => prev + 1)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar seção:', error)
      setCurrentSectionIndex(prev => prev + 1)
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
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadNextSection()
        }
      },
      {
        root: null,
        rootMargin: '600px',
        threshold: 0.1
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [currentSectionIndex])

  // Carregar primeira seção ao montar
  useEffect(() => {
    if (sections.length === 0) {
      loadNextSection()
    }
  }, [])

  const hasMore = currentSectionIndex < sectionDefinitions.length

  return (
    <div className="space-y-12">
      {sections.map((section, sectionIdx) => (
        <section 
          key={section.id} 
          className="py-8 px-4 animate-fade-in"
          style={{ animationDelay: `${sectionIdx * 100}ms` }}
        >
          <div className="container mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <span className="text-3xl">{section.emoji}</span>
                {section.title}
              </h2>
              <a 
                href="/produtos" 
                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                Ver todos →
              </a>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {section.products.map((product, idx) => (
                <div 
                  key={`${section.id}-${product.id}`}
                  className="animate-fade-in"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <ProductCard product={product as any} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Sentinel para carregar mais seções */}
      <div ref={sentinelRef} className="h-20 flex items-center justify-center">
        {loading && (
          <div className="inline-flex items-center gap-3 px-8 py-4 text-primary-600 font-bold">
            <FiLoader className="animate-spin" size={24} />
            <span>Carregando mais ofertas...</span>
          </div>
        )}
      </div>

      {/* Fim das seções */}
      {!hasMore && sections.length > 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-100 to-orange-100 text-primary-700 rounded-full">
            <span className="text-2xl">🎉</span>
            <span className="font-medium">Uau! Você explorou todas as nossas ofertas!</span>
          </div>
          <p className="text-gray-500 mt-4">
            <a href="/produtos" className="text-primary-600 hover:underline">Clique aqui</a> para ver todos os produtos
          </p>
        </div>
      )}
    </div>
  )
}
