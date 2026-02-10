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
  category?: { id: string; name: string } | null
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

// Função para obter interesses do cliente do localStorage
function getClientInterests(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const interests = localStorage.getItem('myd_interests')
    return interests ? JSON.parse(interests) : []
  } catch {
    return []
  }
}

// Função para salvar interesse do cliente
function addClientInterest(categoryId: string) {
  if (typeof window === 'undefined' || !categoryId) return
  try {
    const interests = getClientInterests()
    // Remove duplicatas e mantém no máximo 10 interesses recentes
    const updated = [categoryId, ...interests.filter(i => i !== categoryId)].slice(0, 10)
    localStorage.setItem('myd_interests', JSON.stringify(updated))
  } catch {
    // Ignore errors
  }
}

// Função para embaralhar array no cliente (para variar a cada visita)
function shuffleClientSide<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export default function InfiniteHomeSections() {
  const { data: session } = useSession()
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(false)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const [clientInterests, setClientInterests] = useState<string[]>([])
  
  // Carregar interesses ao montar
  useEffect(() => {
    setClientInterests(getClientInterests())
  }, [])

  // Definir as seções que serão carregadas (muitas seções = mais conteúdo ao scrollar)
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
    { id: 'electronics', title: 'Eletrônicos e Tecnologia', emoji: '📱', type: 'products' as const },
    { id: 'home-decor', title: 'Casa e Decoração', emoji: '🏠', type: 'products' as const },
    { id: 'fashion', title: 'Moda e Estilo', emoji: '👗', type: 'products' as const },
    { id: 'sports', title: 'Esportes e Fitness', emoji: '🏃', type: 'products' as const },
    { id: 'beauty', title: 'Beleza e Cuidados', emoji: '💄', type: 'products' as const },
    { id: 'kids', title: 'Infantil e Bebês', emoji: '🧸', type: 'products' as const },
    { id: 'kitchen', title: 'Cozinha e Utilidades', emoji: '🍳', type: 'products' as const },
    { id: 'outdoor', title: 'Jardim e Área Externa', emoji: '🌿', type: 'products' as const },
    { id: 'automotive', title: 'Automotivo', emoji: '🚗', type: 'products' as const },
    { id: 'pets', title: 'Pet Shop', emoji: '🐾', type: 'products' as const },
    { id: 'more-offers', title: 'Mais Ofertas', emoji: '🎯', type: 'offers' as const },
    { id: 'explore-more', title: 'Explore Mais', emoji: '🔍', type: 'products' as const },
    { id: 'surprise', title: 'Surpresas do Dia', emoji: '🎲', type: 'products' as const },
    { id: 'last-chance', title: 'Últimas Unidades', emoji: '⏰', type: 'offers' as const },
    { id: 'picks', title: 'Escolhas da Semana', emoji: '⭐', type: 'products' as const },
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
      
      // Adicionar parâmetros de diversificação e embaralhamento
      params.set('shuffle', 'true')
      params.set('diversify', 'true')
      
      // Adicionar interesses do cliente
      if (clientInterests.length > 0) {
        params.set('interests', clientInterests.join(','))
      }
      
      // Determinar endpoint baseado no tipo de seção
      switch (sectionDef.id) {
        case 'recommended':
          endpoint = '/api/products/paginated'
          params.set('page', '1')
          params.set('limit', '48')
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
        case 'more-offers':
        case 'last-chance':
          endpoint = '/api/products/paginated'
          params.set('page', String(Math.floor(Math.random() * 5) + 1))
          params.set('limit', '48')
          break
        case 'trending':
          endpoint = '/api/products/paginated'
          params.set('page', String(Math.floor(Math.random() * 3) + 2))
          params.set('limit', '48')
          break
        case 'new-arrivals':
          endpoint = '/api/products/paginated'
          params.set('page', '1')
          params.set('limit', '48')
          // Novidades não embaralha tanto, mantém ordem de criação
          params.set('shuffle', 'false')
          break
        case 'best-sellers':
        case 'picks':
          endpoint = '/api/products/paginated'
          params.set('page', String(Math.floor(Math.random() * 3) + 1))
          params.set('limit', '48')
          break
        case 'for-you':
        case 'surprise':
          endpoint = '/api/products/paginated'
          params.set('page', String(Math.floor(Math.random() * 5) + 1))
          params.set('limit', '48')
          // Para você prioriza os interesses
          if (clientInterests.length > 0) {
            params.set('interests', clientInterests.slice(0, 3).join(','))
          }
          break
        case 'budget-friendly':
        case 'electronics':
        case 'home-decor':
        case 'fashion':
        case 'sports':
        case 'beauty':
        case 'kids':
        case 'kitchen':
        case 'outdoor':
        case 'automotive':
        case 'pets':
          endpoint = '/api/products/paginated'
          params.set('page', String(Math.floor(Math.random() * 4) + 1))
          params.set('limit', '48')
          break
        case 'premium':
          endpoint = '/api/products/paginated'
          params.set('page', String(Math.floor(Math.random() * 3) + 1))
          params.set('limit', '48')
          break
        default:
          endpoint = '/api/products/paginated'
          params.set('page', String(Math.floor(Math.random() * 5) + 1))
          params.set('limit', '48')
      }
      
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        headers: {
          'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        let products = data.products || data || []
        
        console.log('📦 Produtos recebidos para', sectionDef.title, ':', products.length)
        
        // Embaralhamento adicional no cliente para garantir variedade
        if (sectionDef.id !== 'new-arrivals') {
          products = shuffleClientSide(products)
        }
        
        // Salvar categorias visualizadas como interesses
        products.forEach((p: Product) => {
          if (p.category?.id) {
            addClientInterest(p.category.id)
          }
        })
        
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
