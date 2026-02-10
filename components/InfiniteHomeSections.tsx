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
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(false)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const [clientInterests, setClientInterests] = useState<string[]>([])
  const [noMoreProducts, setNoMoreProducts] = useState(false)
  
  // Manter registro de todos os produtos já exibidos para evitar repetições
  const shownProductIds = useRef<Set<string>>(new Set())
  
  // Carregar interesses ao montar
  useEffect(() => {
    setClientInterests(getClientInterests())
  }, [])

  // Definir as seções que serão carregadas - apenas seções genéricas que fazem sentido
  // Cada seção busca produtos diferentes e para quando acabarem os produtos novos
  const sectionDefinitions = [
    { id: 'recommended', title: 'Acho que você vai gostar', emoji: '💡', type: 'products' as const, page: 1 },
    { id: 'offers', title: 'Ofertas Imperdíveis', emoji: '🔥', type: 'offers' as const, page: 2 },
    { id: 'new-arrivals', title: 'Novidades da Semana', emoji: '✨', type: 'products' as const, page: 3 },
    { id: 'trending', title: 'Em Alta Agora', emoji: '📈', type: 'products' as const, page: 4 },
    { id: 'best-sellers', title: 'Mais Vendidos', emoji: '🏆', type: 'products' as const, page: 5 },
    { id: 'for-you', title: 'Selecionados Para Você', emoji: '🎁', type: 'products' as const, page: 6 },
    { id: 'flash-sale', title: 'Promoção Relâmpago', emoji: '⚡', type: 'offers' as const, page: 7 },
    { id: 'explore-more', title: 'Explore Mais', emoji: '🔍', type: 'products' as const, page: 8 },
    { id: 'surprise', title: 'Surpresas do Dia', emoji: '🎲', type: 'products' as const, page: 9 },
    { id: 'picks', title: 'Escolhas da Semana', emoji: '⭐', type: 'products' as const, page: 10 },
  ]

  // Carregar próxima seção
  const loadNextSection = async () => {
    if (loadingRef.current || currentSectionIndex >= sectionDefinitions.length || noMoreProducts) return
    
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
      
      // Usar a página definida na seção para buscar produtos diferentes em cada uma
      endpoint = '/api/products/paginated'
      params.set('page', String(sectionDef.page))
      params.set('limit', '48')
      
      // Novidades não embaralha, mantém ordem de criação
      if (sectionDef.id === 'new-arrivals') {
        params.set('shuffle', 'false')
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
        
        // Filtrar produtos que já foram exibidos em outras seções
        products = products.filter((p: Product) => !shownProductIds.current.has(p.id))
        
        console.log('📦 Produtos únicos (não repetidos):', products.length)
        
        // Se não sobrou nenhum produto novo, parar de mostrar seções
        if (products.length === 0) {
          console.log('⚠️ Sem produtos novos, parando de carregar seções')
          setNoMoreProducts(true)
          setCurrentSectionIndex(prev => prev + 1)
          return
        }
        
        // Mínimo de 6 produtos para exibir uma seção (evita seções muito vazias)
        if (products.length < 6) {
          console.log('⚠️ Poucos produtos novos, parando de carregar seções')
          setNoMoreProducts(true)
          setCurrentSectionIndex(prev => prev + 1)
          return
        }
        
        // Embaralhamento adicional no cliente para garantir variedade
        if (sectionDef.id !== 'new-arrivals') {
          products = shuffleClientSide(products)
        }
        
        // Registrar os IDs dos produtos que serão exibidos
        products.forEach((p: Product) => {
          shownProductIds.current.add(p.id)
        })
        
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

  const hasMore = currentSectionIndex < sectionDefinitions.length && !noMoreProducts

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
