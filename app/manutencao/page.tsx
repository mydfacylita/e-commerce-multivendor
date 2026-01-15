'use client'

import { useEffect, useState } from 'react'

interface MaintenanceConfig {
  message: string
  returnDate: string | null
}

export default function ManutencaoPage() {
  const [config, setConfig] = useState<MaintenanceConfig>({
    message: 'Estamos trabalhando para trazer novidades e melhorias para você! Em breve estaremos de volta com uma experiência ainda melhor.',
    returnDate: null
  })

  useEffect(() => {
    fetch('/api/config/maintenance')
      .then(res => res.json())
      .then(data => {
        console.log('Config de manutenção:', data)
        setConfig({
          message: data.message || config.message,
          returnDate: data.returnDate || null
        })
      })
      .catch(err => console.error('Erro ao carregar config:', err))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Mascote MYDSHOP com animação */}
        <div className="mb-8 animate-bounce-slow">
          <svg width="150" height="180" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
            <defs>
              <linearGradient id="bagGradMaint" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
            </defs>
            
            {/* Corpo da sacola */}
            <path d="M35 50 L30 115 C30 119 32 122 35 122 L85 122 C88 122 90 119 90 115 L85 50 Z" 
                  fill="url(#bagGradMaint)" stroke="#2563EB" strokeWidth="3" strokeLinejoin="round"/>
            
            {/* Alça */}
            <path d="M37 50 C37 38 45 30 60 30 C75 30 83 38 83 50" 
                  stroke="#F97316" strokeWidth="5" fill="none" strokeLinecap="round"/>
            
            {/* Olhinhos fechados (dormindo/trabalhando) */}
            <path d="M44 75 Q50 70 56 75" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <path d="M64 75 Q70 70 76 75" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
            
            {/* Brilho */}
            <ellipse cx="45" cy="65" rx="6" ry="8" fill="white" opacity="0.4"/>
            
            {/* Ferramenta/Chave */}
            <g transform="translate(75, 95) rotate(-30)">
              <rect x="0" y="0" width="25" height="8" rx="2" fill="#F97316"/>
              <circle cx="30" cy="4" r="8" fill="none" stroke="#F97316" strokeWidth="3"/>
            </g>
          </svg>
        </div>

        {/* Título */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="text-gray-800">Estamos em</span>{' '}
          <span className="bg-gradient-to-r from-orange-500 to-blue-600 bg-clip-text text-transparent">Manutenção</span>
        </h1>

        {/* Mensagem */}
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          {config.message}
        </p>

        {/* Tempo estimado */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <p className="text-sm text-gray-500 mb-2">Previsão de retorno</p>
          <p className="text-2xl font-bold text-primary-600">
            {config.returnDate || 'Em breve!'}
          </p>
        </div>

        {/* Contato */}
        <div className="text-gray-500 text-sm">
          <p>Dúvidas? Entre em contato:</p>
          <a href="mailto:contato@mydshop.com.br" className="text-primary-600 hover:underline font-medium">
            contato@mydshop.com.br
          </a>
        </div>

        {/* Logo */}
        <div className="mt-12 opacity-60">
          <svg width="120" height="35" viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
            <text x="50" y="44" fontFamily="'Segoe UI', Arial, sans-serif" fontSize="40" fontWeight="900" letterSpacing="-1.5">
              <tspan fill="#F97316">MYD</tspan><tspan fill="#3B82F6">SHOP</tspan>
            </text>
          </svg>
        </div>
      </div>
    </div>
  )
}
