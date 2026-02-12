'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { FiShoppingCart, FiUser, FiMenu, FiX, FiSearch, FiTruck, FiLock, FiAward, FiPackage, FiHeart, FiMail, FiGrid, FiHome, FiUsers } from 'react-icons/fi'
import { FaFacebook, FaTwitter, FaYoutube, FaWhatsapp } from 'react-icons/fa'
import { useCartStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import PartnerChoiceModal from './PartnerChoiceModal'

interface SearchProduct {
  id: string
  name: string
  slug: string
  description: string
  price: number
  images: string[]
  stock: number
}

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parentId?: string | null
  children?: Category[]
}

interface SocialLinks {
  facebook: string
  twitter: string
  youtube: string
  whatsapp: string
  instagram: string
  tiktok: string
}

export default function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    facebook: 'https://facebook.com',
    twitter: 'https://twitter.com',
    youtube: 'https://youtube.com',
    whatsapp: '',
    instagram: '',
    tiktok: ''
  })
  const [freeShippingMin, setFreeShippingMin] = useState(299)
  const [categories, setCategories] = useState<Category[]>([])
  const [isDepartmentsOpen, setIsDepartmentsOpen] = useState(false)
  const [isAffiliate, setIsAffiliate] = useState(false)
  const departmentsRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const items = useCartStore((state) => state.items)
  const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0)

  // Verificar se o usuário é afiliado
  useEffect(() => {
    const checkAffiliate = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/affiliate/me')
          if (response.ok) {
            setIsAffiliate(true)
          } else {
            setIsAffiliate(false)
          }
        } catch (error) {
          setIsAffiliate(false)
        }
      }
    }
    checkAffiliate()
  }, [session])

  // Buscar categorias
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/public/categories')
        if (response.ok) {
          const data = await response.json()
          // A API já retorna categorias organizadas com children
          // Verificar se já vem com children ou se precisa organizar
          if (data.length > 0 && data[0].children !== undefined) {
            // Já vem organizado da API
            setCategories(data)
          } else {
            // Fallback: organizar manualmente se necessário
            const parentCategories = data.filter((c: Category) => !c.parentId)
            const organizedCategories = parentCategories.map((parent: Category) => ({
              ...parent,
              children: data.filter((c: Category) => c.parentId === parent.id)
            }))
            setCategories(organizedCategories)
          }
        }
      } catch (error) {
        console.error('Erro ao buscar categorias:', error)
      }
    }
    fetchCategories()
  }, [])

  // Buscar configurações
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config/public')
        const data = await response.json()
        if (data) {
          setSocialLinks({
            facebook: data['social.facebook'] || 'https://facebook.com',
            twitter: data['social.twitter'] || 'https://twitter.com',
            youtube: data['social.youtube'] || 'https://youtube.com',
            whatsapp: data['social.whatsapp'] || '',
            instagram: data['social.instagram'] || '',
            tiktok: data['social.tiktok'] || ''
          })
          if (data['ecommerce.freeShippingMin']) {
            setFreeShippingMin(parseInt(data['ecommerce.freeShippingMin']))
          }
        }
      } catch (error) {
        console.error('Erro ao buscar configurações:', error)
      }
    }
    fetchConfig()
  }, [])

  // Pesquisa de produtos
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true)
        try {
          const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`)
          const data = await response.json()
          setSearchResults(data.products || [])
          setShowResults(true)
        } catch (error) {
          console.error('Erro na busca:', error)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
        setShowResults(false)
      }
    }, 300)

    return () => clearTimeout(delaySearch)
  }, [searchQuery])

  // Click outside para fechar dropdown de perfil
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
      if (departmentsRef.current && !departmentsRef.current.contains(event.target as Node)) {
        setIsDepartmentsOpen(false)
      }
    }
    
    // Separar o handler da busca para usar 'click' em vez de 'mousedown'
    // Isso permite que a scrollbar funcione corretamente
    function handleSearchClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('click', handleSearchClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('click', handleSearchClickOutside)
    }
  }, [])

  const handleProductClick = (slug: string) => {
    console.log('🔍 Clicou no produto:', slug)
    if (!slug) {
      console.error('❌ Slug vazio!')
      return
    }
    setShowResults(false)
    setSearchQuery('')
    window.location.href = `/produtos/${slug}`
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileRef])

  return (
    <>
      {/* Barra de Benefícios */}
      <div className="bg-primary-500 text-white text-sm py-2">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FiTruck className="text-lg" />
            <span className="font-semibold">FRETE GRÁTIS {freeShippingMin > 0 ? `ACIMA DE R$ ${freeShippingMin}` : 'PARA TODO BRASIL'}</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <FiLock className="text-lg" />
            <span className="font-semibold">COMPRA RÁPIDA & SEGURA</span>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <FiAward className="text-lg" />
            <span className="font-semibold">SATISFAÇÃO GARANTIDA</span>
          </div>
        </div>
      </div>

      {/* Header Principal */}
      <nav className="bg-white shadow-md z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center gap-4">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image 
                src="/logo-animated.svg" 
                alt="MYDSHOP" 
                width={200} 
                height={55}
                priority
              />
            </Link>

            {/* Barra de Busca */}
            <div className="hidden md:flex flex-1 max-w-2xl">
              <div ref={searchRef} className="relative w-full">
                <input
                  type="text"
                  placeholder="Procurar Produtos"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                      // Disparar evento de pesquisa para a home
                      window.dispatchEvent(new CustomEvent('myd_search', { detail: { term: searchQuery.trim() } }))
                      // Salvar pesquisa recente
                      try {
                        const searches = JSON.parse(localStorage.getItem('myd_recent_searches') || '[]')
                        const updated = [searchQuery.toLowerCase(), ...searches.filter((s: string) => s !== searchQuery.toLowerCase())].slice(0, 5)
                        localStorage.setItem('myd_recent_searches', JSON.stringify(updated))
                      } catch {}
                      setShowResults(false)
                    }
                  }}
                  className="w-full pl-4 pr-12 py-3 border-2 border-gray-300 rounded-l-lg focus:outline-none focus:border-accent-500"
                />
                <button 
                  onClick={() => {
                    if (searchQuery.trim().length >= 2) {
                      // Disparar evento de pesquisa para a home
                      window.dispatchEvent(new CustomEvent('myd_search', { detail: { term: searchQuery.trim() } }))
                      // Salvar pesquisa recente
                      try {
                        const searches = JSON.parse(localStorage.getItem('myd_recent_searches') || '[]')
                        const updated = [searchQuery.toLowerCase(), ...searches.filter((s: string) => s !== searchQuery.toLowerCase())].slice(0, 5)
                        localStorage.setItem('myd_recent_searches', JSON.stringify(updated))
                      } catch {}
                      setShowResults(false)
                    }
                  }}
                  className="absolute right-0 top-0 bottom-0 bg-accent-500 text-white px-6 rounded-r-lg hover:bg-accent-600"
                >
                  <FiSearch size={20} />
                </button>

                {/* Dropdown de Resultados */}
                {showResults && (
                  <div className="absolute top-full left-0 right-0 bg-white mt-2 shadow-2xl rounded-lg border max-h-96 overflow-y-auto z-50">
                    {isSearching ? (
                      <div className="p-4 text-center text-gray-500">
                        Buscando...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="py-2">
                        {searchResults.map((product) => {
                          // Garantir que temos uma URL válida para a imagem
                          let imageUrl = '/placeholder-product.jpg'
                          
                          if (Array.isArray(product.images) && product.images.length > 0) {
                            const firstImage = product.images[0]
                            // Verificar se é uma URL válida
                            if (firstImage && typeof firstImage === 'string' && 
                                (firstImage.startsWith('http') || firstImage.startsWith('/'))) {
                              imageUrl = firstImage
                            }
                          }
                          
                          return (
                            <Link
                              key={product.id}
                              href={`/produtos/${product.slug}`}
                              onClick={() => {
                                setShowResults(false)
                                setSearchQuery('')
                              }}
                              className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded">
                                <Image
                                  src={imageUrl}
                                  alt={product.name}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover rounded"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-product.jpg'
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                                <p className="text-sm text-gray-500 line-clamp-1">{product.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="font-bold text-primary-600">
                                    R$ {product.price.toFixed(2)}
                                  </span>
                                  {product.stock > 0 ? (
                                    <span className="text-xs text-green-600">Em estoque</span>
                                  ) : (
                                    <span className="text-xs text-red-600">Esgotado</span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    ) : searchQuery.length >= 2 ? (
                      <div className="p-4 text-center text-gray-500">
                        Nenhum produto encontrado para &quot;{searchQuery}&quot;
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Login e Carrinho */}
            <div className="flex items-center gap-4">
              {session ? (
                <div ref={profileRef} className="relative hidden md:block">
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 hover:text-primary-600 cursor-pointer"
                  >
                    <FiUser size={24} />
                    <div className="text-left">
                      <div className="text-xs text-gray-600">Olá, {session.user.name}</div>
                      <div className="text-sm font-semibold">Minha Conta</div>
                    </div>
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                      <Link 
                        href="/perfil" 
                        className="block px-4 py-2 text-0m hover:bg-gray-100"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Meu Perfil
                      </Link>
                      <Link 
                        href="/pedidos" 
                        className="block px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        Meus Pedidos
                      </Link>
                      {session.user.role === 'ADMIN' && (
                        <Link 
                          href="/admin" 
                          className="block px-4 py-2 text-sm hover:bg-gray-100"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Painel Admin
                        </Link>
                      )}
                      {session.user.role === 'SELLER' && (
                        <Link 
                          href="/vendedor/dashboard" 
                          className="block px-4 py-2 text-sm hover:bg-gray-100"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Painel Vendedor
                        </Link>
                      )}
                      {isAffiliate && (
                        <Link 
                          href="/afiliado/dashboard" 
                          className="block px-4 py-2 text-sm hover:bg-gray-100"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Painel Afiliado
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setIsProfileOpen(false)
                          signOut()
                        }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="hidden md:flex items-center gap-2 hover:text-accent-500 text-gray-800">
                  <FiUser size={24} />
                  <div className="text-left">
                    <div className="text-xs text-gray-600">Entre ou</div>
                    <div className="text-sm font-semibold text-gray-800">Cadastre-se</div>
                  </div>
                </Link>
              )}

              <Link href="/carrinho" className="relative">
                <FiShoppingCart size={32} className="text-gray-800" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden text-gray-800"
              >
                {isMenuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mt-3">
            <div ref={searchRef} className="relative">
              <input
                type="text"
                placeholder="Procurar Produtos"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                    window.dispatchEvent(new CustomEvent('myd_search', { detail: { term: searchQuery.trim() } }))
                    try {
                      const searches = JSON.parse(localStorage.getItem('myd_recent_searches') || '[]')
                      const updated = [searchQuery.toLowerCase(), ...searches.filter((s: string) => s !== searchQuery.toLowerCase())].slice(0, 5)
                      localStorage.setItem('myd_recent_searches', JSON.stringify(updated))
                    } catch {}
                    setShowResults(false)
                    setIsMenuOpen(false)
                  }
                }}
                className="w-full pl-4 pr-12 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-accent-500"
              />
              <button 
                onClick={() => {
                  if (searchQuery.trim().length >= 2) {
                    window.dispatchEvent(new CustomEvent('myd_search', { detail: { term: searchQuery.trim() } }))
                    try {
                      const searches = JSON.parse(localStorage.getItem('myd_recent_searches') || '[]')
                      const updated = [searchQuery.toLowerCase(), ...searches.filter((s: string) => s !== searchQuery.toLowerCase())].slice(0, 5)
                      localStorage.setItem('myd_recent_searches', JSON.stringify(updated))
                    } catch {}
                    setShowResults(false)
                    setIsMenuOpen(false)
                  }
                }}
                className="absolute right-2 top-2 text-accent-500"
              >
                <FiSearch size={20} />
              </button>

              {/* Dropdown de Resultados Mobile */}
              {showResults && (
                <div className="absolute top-full left-0 right-0 bg-white mt-2 shadow-2xl rounded-lg border max-h-96 overflow-y-auto z-50">
                  {isSearching ? (
                    <div className="p-4 text-center text-gray-500">
                      Buscando...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((product) => {
                        // Garantir que temos uma URL válida para a imagem
                        let imageUrl = '/placeholder-product.jpg'
                        
                        if (Array.isArray(product.images) && product.images.length > 0) {
                          const firstImage = product.images[0]
                          // Verificar se é uma URL válida
                          if (firstImage && typeof firstImage === 'string' && 
                              (firstImage.startsWith('http') || firstImage.startsWith('/'))) {
                            imageUrl = firstImage
                          }
                        }
                        
                        return (
                          <Link
                            key={product.id}
                            href={`/produtos/${product.slug}`}
                            onClick={() => {
                              setShowResults(false)
                              setSearchQuery('')
                              setIsMenuOpen(false)
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded">
                              <Image
                                src={imageUrl}
                                alt={product.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder-product.jpg'
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 text-sm truncate">{product.name}</h4>
                              <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-bold text-primary-600 text-sm">
                                  R$ {product.price.toFixed(2)}
                                </span>
                                {product.stock > 0 ? (
                                  <span className="text-xs text-green-600">Em estoque</span>
                                ) : (
                                  <span className="text-xs text-red-600">Esgotado</span>
                                )}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Nenhum produto encontrado para &quot;{searchQuery}&quot;
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Menu de Navegação */}
      <div className="bg-primary-500 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="hidden md:flex items-center justify-between py-3">
            <div className="flex items-center gap-8">
              {/* Mega Menu de Departamentos - Primeiro item */}
              <div ref={departmentsRef} className="relative">
                <button 
                  onClick={() => setIsDepartmentsOpen(!isDepartmentsOpen)}
                  onMouseEnter={() => setIsDepartmentsOpen(true)}
                  className="flex items-center gap-2 hover:text-accent-500 font-semibold"
                >
                  <FiGrid size={20} />
                  <span>Departamentos</span>
                  <span className={`transition-transform ${isDepartmentsOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>
                
                {/* Mega Menu Dropdown */}
                {isDepartmentsOpen && (
                  <div 
                    className="fixed left-4 right-4 mt-3 bg-white text-gray-800 rounded-lg shadow-2xl border border-gray-200 z-50"
                    style={{ maxWidth: '1200px', marginLeft: 'auto', marginRight: 'auto' }}
                    onMouseLeave={() => setIsDepartmentsOpen(false)}
                  >
                    {/* Header do Mega Menu */}
                    <div className="bg-primary-500 text-white px-6 py-3 rounded-t-lg flex justify-between items-center">
                      <h3 className="font-bold text-lg">Todos os Departamentos</h3>
                      <button 
                        onClick={() => setIsDepartmentsOpen(false)}
                        className="hover:text-accent-300"
                      >
                        <FiX size={20} />
                      </button>
                    </div>
                    
                    {/* Grid de Categorias */}
                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {categories.map((category) => (
                          <div key={category.id} className="space-y-2">
                            {/* Categoria Pai */}
                            <Link 
                              href={`/categorias/${category.slug}`}
                              onClick={() => setIsDepartmentsOpen(false)}
                              className="block font-bold text-gray-900 hover:text-primary-600 border-b border-gray-200 pb-2"
                            >
                              {category.name}
                            </Link>
                            
                            {/* Subcategorias */}
                            {category.children && category.children.length > 0 && (
                              <ul className="space-y-1">
                                {category.children.slice(0, 8).map((child) => (
                                  <li key={child.id}>
                                    <Link 
                                      href={`/categorias/${child.slug}`}
                                      onClick={() => setIsDepartmentsOpen(false)}
                                      className="text-sm text-gray-600 hover:text-primary-600 hover:underline block py-0.5"
                                    >
                                      {child.name}
                                    </Link>
                                  </li>
                                ))}
                                {category.children.length > 8 && (
                                  <li>
                                    <Link 
                                      href={`/categorias/${category.slug}`}
                                      onClick={() => setIsDepartmentsOpen(false)}
                                      className="text-sm text-primary-600 font-medium hover:underline"
                                    >
                                      ver mais +
                                    </Link>
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Ver Todas as Categorias */}
                      <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                        <Link 
                          href="/categorias"
                          onClick={() => setIsDepartmentsOpen(false)}
                          className="inline-flex items-center gap-2 px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium"
                        >
                          Ver Todas as Categorias
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <Link href="/rastrear" className="flex items-center gap-2 hover:text-accent-500">
                <FiPackage size={20} />
                <span>Rastrear Pedido</span>
              </Link>
              <Link href="/" className="flex items-center gap-2 hover:text-accent-500">
                <FiHome size={20} />
                <span>Home</span>
              </Link>
              <Link href="/desejos" className="flex items-center gap-2 hover:text-accent-500">
                <FiHeart size={20} />
                <span>Desejos</span>
              </Link>
              <Link href="/contato" className="flex items-center gap-2 hover:text-accent-500">
                <FiMail size={20} />
                <span>Contato</span>
              </Link>
              <button 
                onClick={() => setIsPartnerModalOpen(true)}
                className="flex items-center gap-2 hover:text-accent-500 font-semibold px-4 py-2"
              >
                <FiUsers size={20} />
                <span>Seja um Parceiro</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              {socialLinks.facebook && (
                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-accent-500">
                  <FaFacebook size={24} />
                </a>
              )}
              {socialLinks.twitter && (
                <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-accent-500">
                  <FaTwitter size={24} />
                </a>
              )}
              {socialLinks.youtube && (
                <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-accent-500">
                  <FaYoutube size={24} />
                </a>
              )}
              <a href="https://wa.me/5598988489512" target="_blank" rel="noopener noreferrer" className="hover:text-accent-500" title="WhatsApp">
                <FaWhatsapp size={24} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-2 space-y-1">
            <Link href="/" className="flex items-center gap-2 py-2 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
              <FiHome size={18} /> Home
            </Link>
            <Link href="/rastrear" className="flex items-center gap-2 py-2 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
              <FiPackage size={18} /> Rastrear Pedido
            </Link>
            
            {/* Departamentos Mobile */}
            <div className="py-2">
              <button 
                onClick={() => setIsDepartmentsOpen(!isDepartmentsOpen)}
                className="flex items-center justify-between w-full font-semibold text-primary-600"
              >
                <span className="flex items-center gap-2"><FiGrid size={18} /> Departamentos</span>
                <span className={`transition-transform ${isDepartmentsOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              
              {isDepartmentsOpen && (
                <div className="mt-2 pl-4 space-y-2 max-h-64 overflow-y-auto">
                  {categories.map((category) => (
                    <div key={category.id}>
                      <Link 
                        href={`/categorias/${category.slug}`}
                        onClick={() => { setIsMenuOpen(false); setIsDepartmentsOpen(false); }}
                        className="block py-1 font-medium text-gray-800 hover:text-primary-600"
                      >
                        {category.name}
                      </Link>
                      {category.children && category.children.length > 0 && (
                        <div className="pl-3 mt-1 space-y-1">
                          {category.children.slice(0, 4).map((child) => (
                            <Link 
                              key={child.id}
                              href={`/categorias/${child.slug}`}
                              onClick={() => { setIsMenuOpen(false); setIsDepartmentsOpen(false); }}
                              className="block py-0.5 text-sm text-gray-600 hover:text-primary-600"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <Link 
                    href="/categorias"
                    onClick={() => { setIsMenuOpen(false); setIsDepartmentsOpen(false); }}
                    className="block py-2 text-primary-600 font-medium"
                  >
                    Ver Todas →
                  </Link>
                </div>
              )}
            </div>
            
            <Link href="/desejos" className="flex items-center gap-2 py-2 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
              <FiHeart size={18} /> Desejos
            </Link>
            <Link href="/contato" className="flex items-center gap-2 py-2 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
              <FiMail size={18} /> Contato
            </Link>
            <button 
              onClick={() => {
                setIsMenuOpen(false)
                setIsPartnerModalOpen(true)
              }}
              className="flex items-center justify-center gap-2 bg-accent-500 text-white px-4 py-3 rounded-md hover:bg-accent-600 text-center mt-4 font-semibold w-full"
            >
              <FiUsers size={18} /> Seja um Parceiro
            </button>
            {!session && (
              <Link
                href="/login"
                className="block bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 text-center mt-4"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Modal de Escolha de Parceiro */}
      <PartnerChoiceModal 
        isOpen={isPartnerModalOpen} 
        onClose={() => setIsPartnerModalOpen(false)} 
      />
    </>
  )
}
