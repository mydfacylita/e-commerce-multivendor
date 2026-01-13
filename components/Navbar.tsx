'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { FiShoppingCart, FiUser, FiMenu, FiX, FiSearch, FiTruck, FiLock, FiAward, FiPackage, FiHeart, FiMail } from 'react-icons/fi'
import { FaFacebook, FaTwitter, FaYoutube, FaWhatsapp } from 'react-icons/fa'
import { useCartStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

interface SearchProduct {
  id: string
  name: string
  slug: string
  description: string
  price: number
  images: string[]
  stock: number
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
  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const items = useCartStore((state) => state.items)
  const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0)

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
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleProductClick = (slug: string) => {
    setShowResults(false)
    setSearchQuery('')
    router.push(`/produtos/${slug}`)
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
      <nav className="bg-white shadow-md sticky top-0 z-50">
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
                  className="w-full pl-4 pr-12 py-3 border-2 border-gray-300 rounded-l-lg focus:outline-none focus:border-accent-500"
                />
                <button className="absolute right-0 top-0 bottom-0 bg-accent-500 text-white px-6 rounded-r-lg hover:bg-accent-600">
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
                            <button
                              key={product.id}
                              onClick={() => handleProductClick(product.slug)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
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
                            </button>
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
                className="w-full pl-4 pr-12 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-accent-500"
              />
              <button className="absolute right-2 top-2 text-accent-500">
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
                          <button
                            key={product.id}
                            onClick={() => handleProductClick(product.slug)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
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
                          </button>
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
              <Link href="/rastrear" className="flex items-center gap-2 hover:text-accent-500">
                <FiPackage size={20} />
                <span>Rastrear Pedido</span>
              </Link>
              <Link href="/" className="flex items-center gap-2 hover:text-accent-500">
                <span>🏠 Home</span>
              </Link>
              <div className="relative group">
                <button className="flex items-center gap-2 hover:text-accent-500">
                  <span>🏷️ Departamentos</span>
                  <span>▼</span>
                </button>
                <div className="absolute left-0 mt-2 w-64 bg-white text-gray-800 rounded-md shadow-lg py-2 hidden group-hover:block">
                  <Link href="/categorias/eletronicos" className="block px-4 py-2 hover:bg-gray-100">
                    Eletrônicos
                  </Link>
                  <Link href="/categorias/moda" className="block px-4 py-2 hover:bg-gray-100">
                    Moda
                  </Link>
                  <Link href="/categorias/casa-decoracao" className="block px-4 py-2 hover:bg-gray-100">
                    Casa e Decoração
                  </Link>
                  <Link href="/categorias/esportes" className="block px-4 py-2 hover:bg-gray-100">
                    Esportes
                  </Link>
                  <Link href="/categorias/livros" className="block px-4 py-2 hover:bg-gray-100">
                    Livros
                  </Link>
                </div>
              </div>
              <Link href="/desejos" className="flex items-center gap-2 hover:text-accent-500">
                <FiHeart size={20} />
                <span>Desejos</span>
              </Link>
              <Link href="/contato" className="flex items-center gap-2 hover:text-accent-500">
                <FiMail size={20} />
                <span>Contato</span>
              </Link>
              <Link href="/vendedor/cadastro" className="flex items-center gap-2 hover:text-accent-500 font-semibold px-4 py-2">
                <span>🤝 Seja um Parceiro</span>
              </Link>
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
              {socialLinks.whatsapp && (
                <a href={`https://wa.me/${socialLinks.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-accent-500">
                  <FaWhatsapp size={24} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-2 space-y-1">
            <Link href="/" className="block py-2 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
              🏠 Home
            </Link>
            <Link href="/rastrear" className="block py-2 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
              Rastrear Pedido
            </Link>
            <Link href="/categorias" className="block py-2 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
              🏷️ Departamentos
            </Link>
            <Link href="/desejos" className="block py-2 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
              ❤️ Desejos
            </Link>
            <Link href="/contato" className="block py-2 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
              ✉️ Contato
            </Link>
            <Link 
              href="/vendedor/cadastro" 
              className="block bg-accent-500 text-white px-4 py-3 rounded-md hover:bg-accent-600 text-center mt-4 font-semibold"
              onClick={() => setIsMenuOpen(false)}
            >
              🤝 Seja um Parceiro
            </Link>
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
    </>
  )
}
