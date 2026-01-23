'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

interface OfferProduct {
  id: string
  name: string
  price: number
  originalPrice?: number
  images: string
  slug: string
}

interface HeroConfig {
  title: string
  subtitle: string
  discount: string
  badge: string
  buttonText: string
  buttonLink: string
}

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [timeLeft, setTimeLeft] = useState({ hours: 12, minutes: 30, seconds: 45 })
  const [offerProducts, setOfferProducts] = useState<OfferProduct[]>([])
  const [heroConfig, setHeroConfig] = useState<HeroConfig>({
    title: 'MEGA PROMOÇÃO',
    subtitle: 'toda quarta é + mercado',
    discount: '10%',
    badge: 'descontão de até',
    buttonText: 'COMPRAR AGORA',
    buttonLink: '/produtos'
  })
  const [freeShippingMin, setFreeShippingMin] = useState(99)
  const [pixDiscount, setPixDiscount] = useState(10)

  // Slides dinâmicos baseados nas configurações
  const getSlides = () => [
    {
      title: heroConfig.title,
      subtitle: heroConfig.subtitle,
      discount: heroConfig.discount,
      badge: heroConfig.badge,
      bg: 'bg-gradient-to-r from-accent-500 to-accent-600',
    },
    {
      title: 'FRETE GRÁTIS',
      subtitle: `em compras acima de R$ ${freeShippingMin}`,
      discount: 'FREE',
      badge: 'economize agora',
      bg: 'bg-gradient-to-r from-primary-500 to-primary-700',
    },
    {
      title: 'NOVIDADES',
      subtitle: 'produtos importados',
      discount: '25%',
      badge: 'até',
      bg: 'bg-gradient-to-r from-purple-500 to-pink-600',
    }
  ]

  // Buscar configurações do sistema
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config/public')
        const data = await response.json()
        
        if (data) {
          setHeroConfig({
            title: data['appearance.heroTitle'] || 'MEGA PROMOÇÃO',
            subtitle: data['appearance.heroSubtitle'] || 'toda quarta é + mercado',
            discount: data['appearance.heroDiscount'] || '10%',
            badge: data['appearance.heroBadge'] || 'descontão de até',
            buttonText: data['appearance.heroButtonText'] || 'COMPRAR AGORA',
            buttonLink: data['appearance.heroButtonLink'] || '/produtos'
          })
          
          if (data['ecommerce.freeShippingMin']) {
            setFreeShippingMin(parseInt(data['ecommerce.freeShippingMin']))
          }
          if (data['ecommerce.pixDiscount']) {
            setPixDiscount(parseInt(data['ecommerce.pixDiscount']))
          }
        }
      } catch (error) {
        console.error('Erro ao buscar configurações:', error)
      }
    }
    fetchConfig()
  }, [])

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

  const slides = getSlides()

  // Auto slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

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

  return (
    <div className="relative overflow-hidden">
      {/* Slider */}
      <div className={`${slides[currentSlide].bg} text-white transition-all duration-700`}>
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Conteúdo */}
            <div className="space-y-6 animate-fade-in">
              <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold animate-bounce">
                🔥 OFERTA RELÂMPAGO
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                {slides[currentSlide].title}
                <br />
                <span className="text-yellow-300">{slides[currentSlide].subtitle}</span>
              </h1>

              {/* Badge de Desconto */}
              <div className="flex items-center gap-4">
                <div className="bg-white/30 backdrop-blur-md rounded-lg px-6 py-4 border-2 border-white/50">
                  <p className="text-sm opacity-90">{slides[currentSlide].badge}</p>
                  <p className="text-5xl font-black text-yellow-300 animate-pulse">
                    {slides[currentSlide].discount}
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
                  href={heroConfig.buttonLink}
                  className="bg-white text-primary-600 px-8 py-4 rounded-lg font-bold text-lg hover:scale-105 transform transition shadow-lg hover:shadow-2xl"
                >
                  🛒 {heroConfig.buttonText}
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

      {/* Indicadores do Slider */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
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
