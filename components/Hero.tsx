'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [timeLeft, setTimeLeft] = useState({ hours: 12, minutes: 30, seconds: 45 })

  const slides = [
    {
      title: 'MEGA PROMOÇÃO',
      subtitle: 'toda quarta é + mercado',
      discount: '10%',
      badge: 'descontão de até',
      bg: 'bg-gradient-to-r from-accent-500 to-accent-600',
      image: '🛍️'
    },
    {
      title: 'FRETE GRÁTIS',
      subtitle: 'em compras acima de R$ 99',
      discount: 'FREE',
      badge: 'economize agora',
      bg: 'bg-gradient-to-r from-primary-500 to-primary-700',
      image: '🚚'
    },
    {
      title: 'NOVIDADES',
      subtitle: 'produtos importados',
      discount: '25%',
      badge: 'até',
      bg: 'bg-gradient-to-r from-purple-500 to-pink-600',
      image: '🎁'
    }
  ]

  // Auto slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
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
                  href="/produtos"
                  className="bg-white text-primary-600 px-8 py-4 rounded-lg font-bold text-lg hover:scale-105 transform transition shadow-lg hover:shadow-2xl"
                >
                  🛒 COMPRAR AGORA
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

            {/* Imagem/Emoji Animado */}
            <div className="hidden md:flex items-center justify-center">
              <div className="text-[200px] animate-bounce-slow">
                {slides[currentSlide].image}
              </div>
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

      {/* Barra de Categorias com Scroll */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-6 whitespace-nowrap">
            {['🔥 Mais Vendidos', '⚡ Ofertas', '📱 Eletrônicos', '👕 Moda', '🏠 Casa', '⚽ Esportes', '📚 Livros'].map((cat) => (
              <Link
                key={cat}
                href="/categorias"
                className="px-4 py-2 rounded-full bg-gray-100 hover:bg-accent-500 hover:text-white transition font-semibold"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
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
