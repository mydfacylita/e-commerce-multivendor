'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

// Helper para converter URL de imagem para a API route (necessário para servir uploads dinâmicos)
function getImageSrc(imagePath: string | undefined): string {
  if (!imagePath) return ''
  // Se já é uma URL completa ou data URL, retorna como está
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath
  // Se começa com /uploads, usa a API route
  if (imagePath.startsWith('/uploads')) {
    return `/api/image${imagePath}`
  }
  // Outros caminhos - retorna como está
  return imagePath
}

interface OfferProduct {
  id: string
  name: string
  price: number
  originalPrice?: number
  images: string
  slug: string
}

interface CarouselSlide {
  id: string
  type: 'image' | 'hero'
  active: boolean
  image?: string
  title?: string
  subtitle?: string
  discount?: string
  badge?: string
  buttonText?: string
  buttonLink?: string
  bgColor?: string
}

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [timeLeft, setTimeLeft] = useState({ hours: 12, minutes: 30, seconds: 45 })
  const [offerProducts, setOfferProducts] = useState<OfferProduct[]>([])
  const [slides, setSlides] = useState<CarouselSlide[]>([])
  const [freeShippingMin, setFreeShippingMin] = useState(99)
  const [pixDiscount, setPixDiscount] = useState(10)

  // Slides padrão caso não tenha configuração
  const getDefaultSlides = (): CarouselSlide[] => [
    {
      id: '1',
      type: 'hero',
      active: true,
      title: 'MEGA PROMOÇÃO',
      subtitle: 'toda quarta é + mercado',
      discount: '10%',
      badge: 'descontão de até',
      buttonText: 'COMPRAR AGORA',
      buttonLink: '/produtos',
      bgColor: 'from-accent-500 to-accent-600',
    },
    {
      id: '2',
      type: 'hero',
      active: true,
      title: 'FRETE GRÁTIS',
      subtitle: `em compras acima de R$ ${freeShippingMin}`,
      discount: 'FREE',
      badge: 'economize agora',
      buttonText: 'VER OFERTAS',
      buttonLink: '/produtos',
      bgColor: 'from-primary-500 to-primary-700',
    },
    {
      id: '3',
      type: 'hero',
      active: true,
      title: 'NOVIDADES',
      subtitle: 'produtos importados',
      discount: '25%',
      badge: 'até',
      buttonText: 'CONFERIR',
      buttonLink: '/produtos',
      bgColor: 'from-purple-500 to-pink-600',
    }
  ]

  // Buscar configurações do sistema
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config/public')
        const data = await response.json()
        
        if (data) {
          if (data['ecommerce.freeShippingMin']) {
            setFreeShippingMin(parseInt(data['ecommerce.freeShippingMin']))
          }
          if (data['ecommerce.pixDiscount']) {
            setPixDiscount(parseInt(data['ecommerce.pixDiscount']))
          }
          
          // Buscar slides do carrossel configurados
          if (data['appearance.carouselSlides']) {
            try {
              const configuredSlides = typeof data['appearance.carouselSlides'] === 'string' 
                ? JSON.parse(data['appearance.carouselSlides'])
                : data['appearance.carouselSlides']
              
              if (Array.isArray(configuredSlides) && configuredSlides.length > 0) {
                const activeSlides = configuredSlides.filter((s: CarouselSlide) => s.active !== false)
                if (activeSlides.length > 0) {
                  setSlides(activeSlides)
                  return
                }
              }
            } catch (e) {
              console.error('Erro ao parsear slides:', e)
            }
          }
          
          // Se não tem slides configurados, usar padrão
          setSlides(getDefaultSlides())
        }
      } catch (error) {
        console.error('Erro ao buscar configurações:', error)
        setSlides(getDefaultSlides())
      }
    }
    fetchConfig()
  }, [freeShippingMin])

  // Buscar produtos em oferta
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await fetch('/api/products?featured=true&limit=6')
        const data = await response.json()
        if (data.products && data.products.length > 0) {
          setOfferProducts(data.products)
        }
      } catch (error) {
        console.error('Erro ao buscar ofertas:', error)
      }
    }
    fetchOffers()
  }, [])

  // Auto slide
  useEffect(() => {
    if (slides.length === 0) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return { hours: 12, minutes: 30, seconds: 45 } // Reset
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Pegar imagem do produto
  const getProductImage = (images: string) => {
    try {
      if (typeof images === 'string' && images.trim()) {
        const parsed = JSON.parse(images)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0]
        }
      }
    } catch {
      if (images && images.startsWith('http')) {
        return images
      }
    }
    return null
  }

  // Verificar se slides está pronto
  if (slides.length === 0) {
    return (
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="animate-pulse">Carregando...</div>
        </div>
      </div>
    )
  }

  const currentSlideData = slides[currentSlide]

  // Renderizar slide de imagem
  const renderImageSlide = (slide: CarouselSlide) => {
    const imageElement = (
      <img
        src={getImageSrc(slide.image)}
        alt={slide.title || 'Banner'}
        className="w-full h-full object-fill"
        style={{ objectPosition: 'center' }}
      />
    )

    return (
      <div className="relative w-full h-full overflow-hidden">
        {slide.buttonLink ? (
          <a href={slide.buttonLink} className="block w-full h-full">
            {imageElement}
          </a>
        ) : (
          imageElement
        )}
      </div>
    )
  }

  // Renderizar slide hero com texto
  const renderHeroSlide = (slide: CarouselSlide) => (
    <div 
      className={`bg-gradient-to-r ${slide.bgColor || 'from-primary-500 to-primary-700'} text-white transition-all duration-700`}
      style={slide.image ? { backgroundImage: `url(${getImageSrc(slide.image)})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {slide.image && <div className={`absolute inset-0 bg-gradient-to-r ${slide.bgColor || 'from-primary-500 to-primary-700'} opacity-80`} />}
      <div className="relative max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Conteúdo */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold animate-bounce">
              🔥 OFERTA RELÂMPAGO
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              {slide.title}
              <br />
              <span className="text-yellow-300">{slide.subtitle}</span>
            </h1>

            {/* Badge de Desconto */}
            <div className="flex items-center gap-4">
              <div className="bg-white/30 backdrop-blur-md rounded-lg px-6 py-4 border-2 border-white/50">
                <p className="text-sm opacity-90">{slide.badge}</p>
                <p className="text-5xl font-black text-yellow-300 animate-pulse">
                  {slide.discount}
                </p>
                <p className="text-sm font-semibold">OFF no PIX</p>
              </div>

              {/* Contador */}
              <div className="bg-black/30 backdrop-blur-md rounded-lg px-4 py-3">
                <p className="text-xs mb-1">⏰ Termina em:</p>
                <div className="flex gap-2">
                  <div className="text-center">
                    <div className="bg-white text-primary-600 rounded px-2 py-1 font-bold text-xl min-w-[40px]">
                      {timeLeft.hours}
                    </div>
                    <span className="text-xs">hrs</span>
                  </div>
                  <span className="text-2xl">:</span>
                  <div className="text-center">
                    <div className="bg-white text-primary-600 rounded px-2 py-1 font-bold text-xl min-w-[40px]">
                      {timeLeft.minutes}
                    </div>
                    <span className="text-xs">min</span>
                  </div>
                  <span className="text-2xl">:</span>
                  <div className="text-center">
                    <div className="bg-white text-primary-600 rounded px-2 py-1 font-bold text-xl min-w-[40px]">
                      {timeLeft.seconds}
                    </div>
                    <span className="text-xs">seg</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botões CTA */}
            <div className="flex flex-wrap gap-4">
              <Link
                href={slide.buttonLink || '/produtos'}
                className="bg-white text-primary-600 px-8 py-4 rounded-lg font-bold text-lg hover:scale-105 transform transition shadow-lg hover:shadow-2xl"
              >
                🛒 {slide.buttonText || 'COMPRAR AGORA'}
              </Link>
              <Link
                href="/produtos"
                className="bg-black/30 backdrop-blur-md border-2 border-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-primary-600 transition"
              >
                Ver Ofertas →
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span>✅</span>
                <span>Entrega Rápida</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span>🔒</span>
                <span>Compra Segura</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span>↩️</span>
                <span>Troca Grátis</span>
              </div>
            </div>
          </div>

          {/* Produtos em Oferta */}
          <div className="hidden md:block">
            {offerProducts.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {offerProducts.slice(0, 6).map((product, index) => {
                  const imageUrl = getProductImage(product.images)
                  const discount = product.originalPrice 
                    ? Math.round((1 - product.price / product.originalPrice) * 100)
                    : 0
                  
                  return (
                    <Link
                      key={product.id}
                      href={`/produtos/${product.slug}`}
                      className={`bg-white rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform ${
                        index === 0 ? 'col-span-2 row-span-2' : ''
                      }`}
                    >
                      <div className={`relative ${index === 0 ? 'h-64' : 'h-28'}`}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <span className="text-4xl">📦</span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                            -{discount}%
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className={`font-semibold text-gray-800 truncate ${index === 0 ? 'text-base' : 'text-xs'}`}>
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-green-600 ${index === 0 ? 'text-lg' : 'text-sm'}`}>
                            R$ {product.price.toFixed(2)}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-xs text-gray-400 line-through">
                              R$ {product.originalPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <div className="text-[200px] animate-bounce-slow">🎁</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1920/675' }}>
      {/* Slider */}
      {currentSlideData.type === 'image' && currentSlideData.image ? (
        renderImageSlide(currentSlideData)
      ) : (
        renderHeroSlide(currentSlideData)
      )}

      {/* Indicadores do Slider */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition ${
              currentSlide === index ? 'bg-white scale-125' : 'bg-white/50'
            }`}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
