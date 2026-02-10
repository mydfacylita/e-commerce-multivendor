'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ProductCard from './ProductCard'
import { FiLoader, FiSearch, FiX, FiChevronDown } from 'react-icons/fi'

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
  type: 'products' | 'category' | 'related' | 'offers' | 'search'
  products: Product[]
  loaded: boolean
  searchTerm?: string
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
    const updated = [categoryId, ...interests.filter(i => i !== categoryId)].slice(0, 10)
    localStorage.setItem('myd_interests', JSON.stringify(updated))
  } catch {
    // Ignore errors
  }
}

// Função para obter pesquisas recentes
function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const searches = localStorage.getItem('myd_recent_searches')
    return searches ? JSON.parse(searches) : []
  } catch {
    return []
  }
}

// Função para salvar pesquisa recente
function addRecentSearch(term: string) {
  if (typeof window === 'undefined' || !term || term.length < 2) return
  try {
    const searches = getRecentSearches()
    const updated = [term.toLowerCase(), ...searches.filter(s => s !== term.toLowerCase())].slice(0, 5)
    localStorage.setItem('myd_recent_searches', JSON.stringify(updated))
  } catch {
    // Ignore errors
  }
}

// Função para embaralhar array no cliente
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const [clientInterests, setClientInterests] = useState<string[]>([])
  const [searchSections, setSearchSections] = useState<Section[]>([])
  const [currentSearch, setCurrentSearch] = useState('')
  const [noMoreToLoad, setNoMoreToLoad] = useState(false)
  
  // Manter registro de todos os produtos carregados e já exibidos
  const allProductsRef = useRef<Product[]>([])
  const allProductsLoadedRef = useRef(false)
  const shownProductIds = useRef<Set<string>>(new Set())
  const currentPageRef = useRef(0)
  const hasMoreProductsRef = useRef(true)
  
  // Carregar interesses ao montar
  useEffect(() => {
    setClientInterests(getClientInterests())
  }, [])

  // Escutar eventos de pesquisa vindos de outros componentes (navbar)
  useEffect(() => {
    const handleSearch = (event: CustomEvent) => {
      const { term } = event.detail
      if (term && term.length >= 2) {
        handleSearchProducts(term)
      }
    }

    window.addEventListener('myd_search' as any, handleSearch)
    return () => window.removeEventListener('myd_search' as any, handleSearch)
  }, [])

  // Definir as seções que serão carregadas
  const sectionDefinitions = [
    { id: 'recommended', title: 'Acho que você vai gostar', emoji: '💡', type: 'products' as const },
    { id: 'offers', title: 'Ofertas Imperdíveis', emoji: '🔥', type: 'offers' as const },
    { id: 'new-arrivals', title: 'Novidades', emoji: '✨', type: 'products' as const },
    { id: 'trending', title: 'Em Alta Agora', emoji: '📈', type: 'products' as const },
    { id: 'best-sellers', title: 'Mais Vendidos', emoji: '🏆', type: 'products' as const },
    { id: 'for-you', title: 'Selecionados Para Você', emoji: '🎁', type: 'products' as const },
    { id: 'flash-sale', title: 'Promoção Relâmpago', emoji: '⚡', type: 'offers' as const },
    { id: 'explore-more', title: 'Explore Mais', emoji: '🔍', type: 'products' as const },
    { id: 'surprise', title: 'Surpresas do Dia', emoji: '🎲', type: 'products' as const },
    { id: 'picks', title: 'Escolhas da Semana', emoji: '⭐', type: 'products' as const },
  ]

  // Buscar produtos com paginação real
  const fetchProducts = async (page: number, limit: number = 100): Promise<Product[]> => {
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', limit.toString())
      params.set('shuffle', 'true')
      params.set('diversify', 'true')
      
      if (clientInterests.length > 0) {
        params.set('interests', clientInterests.join(','))
      }
      
      const response = await fetch(`/api/products/paginated?${params.toString()}`, {
        headers: {
          'x-api-key': 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const products = data.products || data || []
        hasMoreProductsRef.current = products.length >= limit
        return products
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    }
    return []
  }

  // Buscar produtos por termo de pesquisa
  const handleSearchProducts = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return
    
    setCurrentSearch(searchTerm)
    addRecentSearch(searchTerm)
    
    try {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchTerm)}&limit=50`)
      
      if (response.ok) {
        const data = await response.json()
        const products = data.products || []
        
        if (products.length > 0) {
          // Criar seção de pesquisa
          const searchSection: Section = {
            id: `search-${Date.now()}`,
            title: `Resultados para "${searchTerm}"`,
            emoji: '🔍',
            type: 'search',
            products: products,
            loaded: true,
            searchTerm
          }
          
          // Adicionar no topo
          setSearchSections(prev => [searchSection, ...prev.filter(s => s.searchTerm !== searchTerm)])
          
          // Scroll para a seção de pesquisa com delay para renderização
          setTimeout(() => {
            const searchResultsSection = document.getElementById('search-results-section')
            if (searchResultsSection) {
              searchResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }, 150)
          
          // Criar seções relacionadas baseadas na pesquisa
          createRelatedSections(searchTerm, products)
        }
      }
    } catch (error) {
      console.error('Erro na pesquisa:', error)
    }
  }

  // Criar seções relacionadas baseadas na pesquisa
  const createRelatedSections = async (searchTerm: string, searchProducts: Product[]) => {
    // Extrair categorias dos produtos encontrados
    const categoryIds = new Set<string>()
    searchProducts.forEach(p => {
      if (p.category?.id) categoryIds.add(p.category.id)
    })

    // Se encontrou categorias, buscar mais produtos dessas categorias
    if (categoryIds.size > 0) {
      try {
        const categoryArray = Array.from(categoryIds)
        for (const catId of categoryArray.slice(0, 2)) {
          const categoryName = searchProducts.find(p => p.category?.id === catId)?.category?.name || 'Relacionados'
          
          const response = await fetch(`/api/products/paginated?category=${catId}&limit=12`)
          if (response.ok) {
            const data = await response.json()
            const products = (data.products || []).filter((p: Product) => 
              !searchProducts.some(sp => sp.id === p.id)
            )
            
            if (products.length >= 4) {
              const relatedSection: Section = {
                id: `related-${catId}-${Date.now()}`,
                title: `Mais em ${categoryName}`,
                emoji: '💫',
                type: 'related',
                products: products.slice(0, 12),
                loaded: true
              }
              
              setSearchSections(prev => {
                // Evitar duplicatas
                if (prev.some(s => s.title === relatedSection.title)) return prev
                return [...prev, relatedSection]
              })
            }
          }
        }
      } catch (error) {
        console.error('Erro ao criar seções relacionadas:', error)
      }
    }

    // Sugerir termos similares
    const similarTerms = generateSimilarTerms(searchTerm)
    for (const term of similarTerms.slice(0, 1)) {
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(term)}&limit=12`)
        if (response.ok) {
          const data = await response.json()
          const products = (data.products || []).filter((p: Product) => 
            !searchProducts.some(sp => sp.id === p.id)
          )
          
          if (products.length >= 4) {
            const suggestionSection: Section = {
              id: `suggestion-${term}-${Date.now()}`,
              title: `Você também pode gostar: ${term}`,
              emoji: '💡',
              type: 'related',
              products: products.slice(0, 12),
              loaded: true
            }
            
            setSearchSections(prev => {
              if (prev.some(s => s.title === suggestionSection.title)) return prev
              return [...prev, suggestionSection]
            })
          }
        }
      } catch (error) {
        // Ignorar erros de sugestões
      }
    }
  }

  // Gerar termos similares para sugestões
  const generateSimilarTerms = (term: string): string[] => {
    const termMap: Record<string, string[]> = {
      'geladeira': ['refrigerador', 'freezer', 'frigobar', 'eletrodomésticos'],
      'celular': ['smartphone', 'iphone', 'samsung', 'acessórios celular'],
      'televisao': ['tv', 'smart tv', 'monitor', 'home theater'],
      'tv': ['televisao', 'smart tv', 'monitor', 'home theater'],
      'notebook': ['laptop', 'computador', 'macbook', 'ultrabook'],
      'fone': ['headphone', 'earbuds', 'airpods', 'audio'],
      'roupa': ['vestuário', 'camiseta', 'calça', 'moda'],
      'sapato': ['tênis', 'calçado', 'sandália', 'chinelo'],
      'relogio': ['smartwatch', 'pulseira', 'apple watch'],
      'cozinha': ['panela', 'utensílios', 'eletrodomésticos', 'fogão'],
    }
    
    const termLower = term.toLowerCase()
    for (const [key, values] of Object.entries(termMap)) {
      if (termLower.includes(key) || key.includes(termLower)) {
        return values
      }
    }
    
    return []
  }

  // Remover seção de pesquisa
  const removeSearchSection = (sectionId: string) => {
    setSearchSections(prev => prev.filter(s => s.id !== sectionId))
  }

  // Carregar próxima seção
  const loadNextSection = async () => {
    if (loadingRef.current || currentSectionIndex >= sectionDefinitions.length) return
    
    loadingRef.current = true
    setLoading(true)
    
    try {
      const sectionDef = sectionDefinitions[currentSectionIndex]
      console.log('🔄 Carregando seção:', sectionDef.title)
      
      // Na primeira seção, carregar produtos iniciais
      if (!allProductsLoadedRef.current) {
        console.log('📦 Carregando produtos iniciais...')
        const products = await fetchProducts(0, 200)
        allProductsRef.current = shuffleClientSide(products)
        allProductsLoadedRef.current = true
        currentPageRef.current = 1
        console.log('📦 Total de produtos carregados:', allProductsRef.current.length)
      }
      
      // Pegar produtos que ainda não foram exibidos
      const availableProducts = allProductsRef.current.filter(p => !shownProductIds.current.has(p.id))
      console.log('📦 Produtos disponíveis para', sectionDef.title, ':', availableProducts.length)
      
      // Se não há mais produtos disponíveis localmente, tentar buscar mais
      if (availableProducts.length < 12 && hasMoreProductsRef.current) {
        console.log('📦 Buscando mais produtos...')
        const moreProducts = await fetchProducts(currentPageRef.current, 100)
        if (moreProducts.length > 0) {
          const newProducts = moreProducts.filter(p => !shownProductIds.current.has(p.id))
          allProductsRef.current = [...allProductsRef.current, ...newProducts]
          currentPageRef.current++
        }
      }
      
      // Atualizar produtos disponíveis após possível fetch
      const updatedAvailableProducts = allProductsRef.current.filter(p => !shownProductIds.current.has(p.id))
      
      // Pegar até 24 produtos para esta seção
      const productsPerSection = 24
      const products = updatedAvailableProducts.slice(0, productsPerSection)
      
      // Mínimo de 4 produtos para exibir uma seção
      if (products.length < 4) {
        console.log('⚠️ Poucos produtos restantes, avançando para próxima seção')
        setCurrentSectionIndex(prev => prev + 1)
        return
      }
      
      console.log('📦 Produtos para seção', sectionDef.title, ':', products.length)
      
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
      
      // Adicionar seção
      setSections(prev => [...prev, {
        id: sectionDef.id,
        title: sectionDef.title,
        emoji: sectionDef.emoji,
        type: sectionDef.type,
        products: products,
        loaded: true
      }])
      
      setCurrentSectionIndex(prev => prev + 1)
      
    } catch (error) {
      console.error('❌ Erro ao carregar seção:', error)
      setCurrentSectionIndex(prev => prev + 1)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  // Carregar mais produtos (botão)
  const loadMoreProducts = async () => {
    if (loadingMore) return
    
    setLoadingMore(true)
    
    try {
      // Buscar mais produtos da API
      const moreProducts = await fetchProducts(currentPageRef.current, 50)
      
      if (moreProducts.length > 0) {
        currentPageRef.current++
        
        // Filtrar produtos já exibidos
        const newProducts = moreProducts.filter(p => !shownProductIds.current.has(p.id))
        
        if (newProducts.length >= 4) {
          // Marcar como exibidos
          newProducts.forEach(p => shownProductIds.current.add(p.id))
          
          // Criar nova seção com os produtos
          const newSection: Section = {
            id: `more-${Date.now()}`,
            title: getRandomTitle(),
            emoji: getRandomEmoji(),
            type: 'products',
            products: newProducts.slice(0, 24),
            loaded: true
          }
          
          setSections(prev => [...prev, newSection])
          
          // Adicionar os restantes ao pool
          if (newProducts.length > 24) {
            allProductsRef.current = [...allProductsRef.current, ...newProducts.slice(24)]
          }
        } else {
          // Sem mais produtos novos
          hasMoreProductsRef.current = false
          setNoMoreToLoad(true)
        }
      } else {
        hasMoreProductsRef.current = false
        setNoMoreToLoad(true)
      }
    } catch (error) {
      console.error('Erro ao carregar mais produtos:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Títulos aleatórios para seções extras
  const getRandomTitle = () => {
    const titles = [
      'Descubra Mais',
      'Continuando a Explorar',
      'Mais Produtos para Você',
      'Veja Também',
      'Não Perca',
      'Ainda Mais Ofertas',
      'Continue Explorando',
      'Mais Opções',
    ]
    return titles[Math.floor(Math.random() * titles.length)]
  }

  // Emojis aleatórios
  const getRandomEmoji = () => {
    const emojis = ['🛍️', '✨', '🎯', '💎', '🌟', '🔥', '💫', '🎁', '🛒', '❤️']
    return emojis[Math.floor(Math.random() * emojis.length)]
  }

  // Intersection Observer para scroll infinito
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current && currentSectionIndex < sectionDefinitions.length) {
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

  const canLoadMore = hasMoreProductsRef.current && !noMoreToLoad

  return (
    <div className="space-y-12">
      {/* Seções de pesquisa (aparecem no topo) */}
      {searchSections.length > 0 && (
        <div id="search-results-section" className="bg-gradient-to-b from-primary-50 to-transparent pb-8 scroll-mt-24">
          {searchSections.map((section, sectionIdx) => (
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
                    {section.type === 'search' && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({section.products.length} produtos)
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-3">
                    <a 
                      href={`/produtos?q=${encodeURIComponent(section.searchTerm || '')}`}
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                    >
                      Ver todos →
                    </a>
                    {section.type === 'search' && (
                      <button
                        onClick={() => removeSearchSection(section.id)}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                        title="Remover pesquisa"
                      >
                        <FiX className="w-5 h-5 text-gray-500" />
                      </button>
                    )}
                  </div>
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
        </div>
      )}

      {/* Seções normais */}
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

      {/* Botão Carregar Mais */}
      {sections.length > 0 && (
        <div className="text-center py-8">
          {canLoadMore ? (
            <button
              onClick={loadMoreProducts}
              disabled={loadingMore}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:from-primary-600 hover:to-primary-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loadingMore ? (
                <>
                  <FiLoader className="animate-spin" size={24} />
                  <span>Carregando...</span>
                </>
              ) : (
                <>
                  <FiChevronDown size={24} />
                  <span>Carregar Mais Produtos</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-100 to-orange-100 text-primary-700 rounded-full">
                <span className="text-2xl">🎉</span>
                <span className="font-medium">Você viu tudo! Mas sempre tem novidades chegando.</span>
              </div>
              <p className="text-gray-500">
                <a href="/produtos" className="text-primary-600 hover:underline font-medium">
                  Explore nossa loja completa
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pesquisas recentes - sugestões inteligentes */}
      {searchSections.length === 0 && sections.length >= 2 && (
        <RecentSearchesSuggestions onSearch={handleSearchProducts} />
      )}
    </div>
  )
}

// Componente de sugestões baseado em pesquisas recentes
function RecentSearchesSuggestions({ onSearch }: { onSearch: (term: string) => void }) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  
  useEffect(() => {
    const recent = getRecentSearches()
    if (recent.length > 0) {
      setSuggestions(recent.slice(0, 3))
    }
  }, [])
  
  if (suggestions.length === 0) return null
  
  return (
    <div className="py-8 px-4">
      <div className="container mx-auto">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FiSearch className="text-primary-500" />
            Continue de onde parou
          </h3>
          <div className="flex flex-wrap gap-3">
            {suggestions.map((term, idx) => (
              <button
                key={idx}
                onClick={() => onSearch(term)}
                className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 hover:bg-primary-500 hover:text-white transition-colors shadow-sm"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
