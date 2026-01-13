'use client'

import { useState, useEffect } from 'react'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Verifica se já respondeu sobre cookies
    const cookieConsent = localStorage.getItem('cookieConsent')
    if (!cookieConsent) {
      // Aguarda 1 segundo para mostrar o banner (melhor UX)
      const timer = setTimeout(() => {
        setShowBanner(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted')
    setShowBanner(false)
  }

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] bg-white shadow-lg border-t border-gray-200 p-4 animate-slide-up">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Mascote MYDSHOP */}
          <svg width="50" height="60" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            <defs>
              <linearGradient id="bagGradCookie" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
            </defs>
            <path d="M35 50 L30 115 C30 119 32 122 35 122 L85 122 C88 122 90 119 90 115 L85 50 Z" 
                  fill="url(#bagGradCookie)" stroke="#2563EB" strokeWidth="3" strokeLinejoin="round"/>
            <path d="M37 50 C37 38 45 30 60 30 C75 30 83 38 83 50" 
                  stroke="#F97316" strokeWidth="5" fill="none" strokeLinecap="round"/>
            <circle cx="50" cy="75" r="6" fill="white"/>
            <circle cx="70" cy="75" r="6" fill="white"/>
            <ellipse cx="45" cy="65" rx="6" ry="8" fill="white" opacity="0.4"/>
          </svg>
          <div>
            <p className="text-gray-700 text-sm sm:text-base">
              Utilizamos cookies para melhorar sua experiência de navegação, personalizar conteúdo e analisar nosso tráfego.
            </p>
            <a href="/politica-privacidade" className="text-primary-600 hover:underline text-sm">
              Saiba mais sobre nossa Política de Privacidade
            </a>
          </div>
        </div>
        
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors text-sm font-medium"
          >
            Recusar
          </button>
          <button
            onClick={handleAccept}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Aceitar Cookies
          </button>
        </div>
      </div>
    </div>
  )
}
