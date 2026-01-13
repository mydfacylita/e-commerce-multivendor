'use client'

import { useEffect, useState } from 'react'

type MascotTheme = 'default' | 'natal' | 'carnaval' | 'halloween' | 'pascoa' | 'junina' | 'blackfriday' | 'dia-maes' | 'dia-namorados'
type BackgroundTheme = 'default' | 'natal' | 'carnaval' | 'halloween' | 'pascoa' | 'junina' | 'blackfriday' | 'dark'

interface LoadingSpinnerProps {
  message?: string
  fullScreen?: boolean
  size?: 'sm' | 'md' | 'lg'
  theme?: MascotTheme
  bgTheme?: BackgroundTheme
}

// Configurações de cores por tema
const backgroundColors: Record<BackgroundTheme, string> = {
  default: 'from-blue-50 to-orange-50',
  natal: 'from-red-100 to-green-100',
  carnaval: 'from-pink-100 via-yellow-100 to-purple-100',
  halloween: 'from-purple-900 to-orange-900',
  pascoa: 'from-pink-100 to-sky-100',
  junina: 'from-yellow-100 to-red-100',
  blackfriday: 'from-gray-900 to-yellow-900',
  dark: 'from-gray-800 to-gray-900',
}

const textColors: Record<BackgroundTheme, string> = {
  default: 'from-orange-500 to-blue-600',
  natal: 'from-red-600 to-green-600',
  carnaval: 'from-pink-500 via-yellow-500 to-purple-500',
  halloween: 'from-orange-400 to-purple-400',
  pascoa: 'from-pink-500 to-sky-500',
  junina: 'from-orange-500 to-red-600',
  blackfriday: 'from-yellow-400 to-yellow-200',
  dark: 'from-gray-300 to-gray-100',
}

// Componente do Mascote com temas
function Mascot({ theme, size }: { theme: MascotTheme; size: number }) {
  switch (theme) {
    case 'natal':
      return (
        <svg width={size} height={size * 1.2} viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-bounce">
          <defs>
            <linearGradient id="bagGradNatal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#991B1B" />
            </linearGradient>
          </defs>
          {/* Gorro de Papai Noel */}
          <path d="M30 45 Q60 -10 90 45 L75 50 Q60 20 45 50 Z" fill="#DC2626" />
          <circle cx="90" cy="25" r="8" fill="white" />
          <ellipse cx="60" cy="50" rx="35" ry="6" fill="white" />
          {/* Corpo da sacola */}
          <path d="M35 55 L30 120 C30 124 32 127 35 127 L85 127 C88 127 90 124 90 120 L85 55 Z" 
                fill="url(#bagGradNatal)" stroke="#991B1B" strokeWidth="3" strokeLinejoin="round"/>
          {/* Alça verde */}
          <path d="M37 55 C37 43 45 35 60 35 C75 35 83 43 83 55" 
                stroke="#16A34A" strokeWidth="5" fill="none" strokeLinecap="round"/>
          {/* Olhinhos */}
          <circle cx="50" cy="80" r="6" fill="white"/>
          <circle cx="70" cy="80" r="6" fill="white"/>
          <circle cx="52" cy="80" r="3" fill="#1F2937"/>
          <circle cx="72" cy="80" r="3" fill="#1F2937"/>
          {/* Bochecha rosada */}
          <ellipse cx="42" cy="88" rx="5" ry="3" fill="#FCA5A5" opacity="0.7"/>
          <ellipse cx="78" cy="88" rx="5" ry="3" fill="#FCA5A5" opacity="0.7"/>
          {/* Sorriso */}
          <path d="M50 95 Q60 105 70 95" stroke="#1F2937" strokeWidth="2" fill="none" strokeLinecap="round"/>
          {/* Flocos de neve decorativos */}
          <text x="20" y="140" fontSize="16" fill="white" opacity="0.8">❄</text>
          <text x="90" y="145" fontSize="12" fill="white" opacity="0.6">❄</text>
        </svg>
      )
    
    case 'carnaval':
      return (
        <svg width={size} height={size * 1.2} viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-bounce">
          <defs>
            <linearGradient id="bagGradCarnaval" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          {/* Penas coloridas */}
          <ellipse cx="40" cy="30" rx="5" ry="20" fill="#EC4899" transform="rotate(-20 40 30)"/>
          <ellipse cx="50" cy="25" rx="5" ry="22" fill="#FBBF24"/>
          <ellipse cx="60" cy="22" rx="5" ry="24" fill="#22C55E"/>
          <ellipse cx="70" cy="25" rx="5" ry="22" fill="#3B82F6"/>
          <ellipse cx="80" cy="30" rx="5" ry="20" fill="#8B5CF6" transform="rotate(20 80 30)"/>
          {/* Máscara */}
          <ellipse cx="60" cy="52" rx="25" ry="8" fill="#FBBF24"/>
          {/* Corpo da sacola */}
          <path d="M35 58 L30 120 C30 124 32 127 35 127 L85 127 C88 127 90 124 90 120 L85 58 Z" 
                fill="url(#bagGradCarnaval)" stroke="#8B5CF6" strokeWidth="3" strokeLinejoin="round"/>
          {/* Alça */}
          <path d="M37 58 C37 46 45 38 60 38 C75 38 83 46 83 58" 
                stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round"/>
          {/* Olhinhos felizes */}
          <path d="M45 78 Q50 73 55 78" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <path d="M65 78 Q70 73 75 78" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
          {/* Sorriso grande */}
          <path d="M45 95 Q60 115 75 95" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
          {/* Confetes */}
          <circle cx="20" cy="100" r="4" fill="#EC4899"/>
          <circle cx="100" cy="90" r="3" fill="#FBBF24"/>
          <circle cx="25" cy="130" r="3" fill="#22C55E"/>
          <circle cx="95" cy="135" r="4" fill="#3B82F6"/>
          <rect x="15" y="115" width="6" height="6" fill="#8B5CF6" transform="rotate(45 18 118)"/>
        </svg>
      )
    
    case 'halloween':
      return (
        <svg width={size} height={size * 1.2} viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-bounce">
          <defs>
            <linearGradient id="bagGradHalloween" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>
          </defs>
          {/* Topo da abóbora */}
          <rect x="55" y="30" width="10" height="15" fill="#15803D" rx="2"/>
          {/* Formato de abóbora */}
          <ellipse cx="60" cy="90" rx="40" ry="45" fill="url(#bagGradHalloween)"/>
          <path d="M35 60 Q30 90 35 120" stroke="#EA580C" strokeWidth="2" fill="none"/>
          <path d="M60 50 Q60 90 60 125" stroke="#EA580C" strokeWidth="2" fill="none"/>
          <path d="M85 60 Q90 90 85 120" stroke="#EA580C" strokeWidth="2" fill="none"/>
          {/* Olhos triangulares */}
          <path d="M40 75 L50 90 L30 90 Z" fill="#1F2937"/>
          <path d="M80 75 L90 90 L70 90 Z" fill="#1F2937"/>
          {/* Luz dos olhos */}
          <path d="M43 82 L47 87 L38 87 Z" fill="#FBBF24" opacity="0.8"/>
          <path d="M77 82 L81 87 L72 87 Z" fill="#FBBF24" opacity="0.8"/>
          {/* Nariz triangular */}
          <path d="M60 92 L65 102 L55 102 Z" fill="#1F2937"/>
          {/* Boca assustadora */}
          <path d="M35 110 L40 105 L50 115 L60 105 L70 115 L80 105 L85 110 Q60 135 35 110" fill="#1F2937"/>
          {/* Dentes */}
          <path d="M45 110 L50 118 L55 110" fill="#FBBF24"/>
          <path d="M65 110 L70 118 L75 110" fill="#FBBF24"/>
        </svg>
      )
    
    case 'pascoa':
      return (
        <svg width={size} height={size * 1.2} viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-bounce">
          <defs>
            <linearGradient id="bagGradPascoa" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F9A8D4" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
          {/* Orelhas de coelho */}
          <ellipse cx="40" cy="25" rx="10" ry="30" fill="#FDF2F8" stroke="#F9A8D4" strokeWidth="2"/>
          <ellipse cx="40" cy="25" rx="5" ry="20" fill="#F9A8D4"/>
          <ellipse cx="80" cy="25" rx="10" ry="30" fill="#FDF2F8" stroke="#F9A8D4" strokeWidth="2"/>
          <ellipse cx="80" cy="25" rx="5" ry="20" fill="#F9A8D4"/>
          {/* Corpo da sacola */}
          <path d="M35 55 L30 120 C30 124 32 127 35 127 L85 127 C88 127 90 124 90 120 L85 55 Z" 
                fill="url(#bagGradPascoa)" stroke="#EC4899" strokeWidth="3" strokeLinejoin="round"/>
          {/* Alça */}
          <path d="M37 55 C37 43 45 35 60 35 C75 35 83 43 83 55" 
                stroke="#A855F7" strokeWidth="5" fill="none" strokeLinecap="round"/>
          {/* Olhinhos fofos */}
          <circle cx="50" cy="80" r="7" fill="white"/>
          <circle cx="70" cy="80" r="7" fill="white"/>
          <circle cx="52" cy="80" r="4" fill="#1F2937"/>
          <circle cx="72" cy="80" r="4" fill="#1F2937"/>
          <circle cx="54" cy="78" r="2" fill="white"/>
          <circle cx="74" cy="78" r="2" fill="white"/>
          {/* Nariz de coelho */}
          <ellipse cx="60" cy="95" rx="4" ry="3" fill="#F9A8D4"/>
          {/* Bigodes */}
          <line x1="35" y1="92" x2="48" y2="95" stroke="#1F2937" strokeWidth="1"/>
          <line x1="35" y1="98" x2="48" y2="97" stroke="#1F2937" strokeWidth="1"/>
          <line x1="72" y1="95" x2="85" y2="92" stroke="#1F2937" strokeWidth="1"/>
          <line x1="72" y1="97" x2="85" y2="98" stroke="#1F2937" strokeWidth="1"/>
          {/* Boca */}
          <path d="M55 100 Q60 108 65 100" stroke="#1F2937" strokeWidth="2" fill="none"/>
          {/* Ovinhos */}
          <ellipse cx="20" cy="140" rx="8" ry="10" fill="#C4B5FD"/>
          <ellipse cx="100" cy="138" rx="7" ry="9" fill="#A5F3FC"/>
        </svg>
      )
    
    case 'junina':
      return (
        <svg width={size} height={size * 1.2} viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-bounce">
          <defs>
            <linearGradient id="bagGradJunina" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
          {/* Chapéu de palha */}
          <ellipse cx="60" cy="45" rx="40" ry="10" fill="#D97706"/>
          <path d="M30 45 Q25 30 60 15 Q95 30 90 45" fill="#FBBF24" stroke="#D97706" strokeWidth="2"/>
          <ellipse cx="60" cy="45" rx="25" ry="6" fill="#FDE68A"/>
          {/* Fita vermelha no chapéu */}
          <rect x="35" y="40" width="50" height="6" fill="#DC2626"/>
          {/* Corpo da sacola */}
          <path d="M35 55 L30 120 C30 124 32 127 35 127 L85 127 C88 127 90 124 90 120 L85 55 Z" 
                fill="url(#bagGradJunina)" stroke="#D97706" strokeWidth="3" strokeLinejoin="round"/>
          {/* Xadrez */}
          <rect x="40" y="60" width="10" height="10" fill="#DC2626" opacity="0.3"/>
          <rect x="60" y="60" width="10" height="10" fill="#DC2626" opacity="0.3"/>
          <rect x="50" y="70" width="10" height="10" fill="#DC2626" opacity="0.3"/>
          <rect x="70" y="70" width="10" height="10" fill="#DC2626" opacity="0.3"/>
          {/* Olhinhos */}
          <circle cx="50" cy="85" r="6" fill="white"/>
          <circle cx="70" cy="85" r="6" fill="white"/>
          <circle cx="52" cy="85" r="3" fill="#1F2937"/>
          <circle cx="72" cy="85" r="3" fill="#1F2937"/>
          {/* Sardas */}
          <circle cx="42" cy="93" r="2" fill="#92400E" opacity="0.5"/>
          <circle cx="45" cy="96" r="2" fill="#92400E" opacity="0.5"/>
          <circle cx="75" cy="93" r="2" fill="#92400E" opacity="0.5"/>
          <circle cx="78" cy="96" r="2" fill="#92400E" opacity="0.5"/>
          {/* Sorriso */}
          <path d="M50 102 Q60 112 70 102" stroke="#1F2937" strokeWidth="2" fill="none"/>
          {/* Bandeirinhas */}
          <path d="M10 130 L15 125 L20 130 L25 125 L30 130" stroke="#DC2626" strokeWidth="2" fill="none"/>
          <path d="M90 128 L95 123 L100 128 L105 123 L110 128" stroke="#22C55E" strokeWidth="2" fill="none"/>
        </svg>
      )
    
    case 'blackfriday':
      return (
        <svg width={size} height={size * 1.2} viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-bounce">
          <defs>
            <linearGradient id="bagGradBF" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1F2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FCD34D" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
          {/* Tag de desconto */}
          <circle cx="90" cy="40" r="18" fill="url(#goldGrad)"/>
          <text x="82" y="45" fontSize="14" fontWeight="bold" fill="#1F2937">%</text>
          {/* Corpo da sacola */}
          <path d="M35 50 L30 115 C30 119 32 122 35 122 L85 122 C88 122 90 119 90 115 L85 50 Z" 
                fill="url(#bagGradBF)" stroke="#FBBF24" strokeWidth="3" strokeLinejoin="round"/>
          {/* Alça dourada */}
          <path d="M37 50 C37 38 45 30 60 30 C75 30 83 38 83 50" 
                stroke="url(#goldGrad)" strokeWidth="5" fill="none" strokeLinecap="round"/>
          {/* Olhinhos com brilho */}
          <circle cx="50" cy="75" r="7" fill="url(#goldGrad)"/>
          <circle cx="70" cy="75" r="7" fill="url(#goldGrad)"/>
          <circle cx="52" cy="73" r="2" fill="white"/>
          <circle cx="72" cy="73" r="2" fill="white"/>
          {/* Sorriso dourado */}
          <path d="M45 90 Q60 105 75 90" stroke="url(#goldGrad)" strokeWidth="3" fill="none" strokeLinecap="round"/>
          {/* Estrelas */}
          <text x="15" y="70" fontSize="16" fill="#FBBF24">✦</text>
          <text x="98" y="85" fontSize="12" fill="#FBBF24">✦</text>
          <text x="20" y="120" fontSize="14" fill="#FBBF24">✦</text>
          {/* BLACK FRIDAY texto */}
          <text x="35" y="145" fontSize="8" fontWeight="bold" fill="#FBBF24">BLACK FRIDAY</text>
        </svg>
      )
    
    case 'dia-maes':
    case 'dia-namorados':
      return (
        <svg width={size} height={size * 1.2} viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-bounce">
          <defs>
            <linearGradient id="bagGradLove" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FB7185" />
              <stop offset="100%" stopColor="#E11D48" />
            </linearGradient>
          </defs>
          {/* Corações flutuantes */}
          <path d="M20 30 C20 25 25 20 30 25 C35 20 40 25 40 30 C40 40 30 45 30 45 C30 45 20 40 20 30" fill="#FCA5A5"/>
          <path d="M85 25 C85 22 88 18 92 22 C96 18 99 22 99 25 C99 32 92 36 92 36 C92 36 85 32 85 25" fill="#FDA4AF"/>
          {/* Corpo da sacola */}
          <path d="M35 50 L30 115 C30 119 32 122 35 122 L85 122 C88 122 90 119 90 115 L85 50 Z" 
                fill="url(#bagGradLove)" stroke="#BE123C" strokeWidth="3" strokeLinejoin="round"/>
          {/* Alça */}
          <path d="M37 50 C37 38 45 30 60 30 C75 30 83 38 83 50" 
                stroke="#FB7185" strokeWidth="5" fill="none" strokeLinecap="round"/>
          {/* Laço/Fita */}
          <ellipse cx="52" cy="55" rx="8" ry="6" fill="#FDF2F8" stroke="#FB7185" strokeWidth="1"/>
          <ellipse cx="68" cy="55" rx="8" ry="6" fill="#FDF2F8" stroke="#FB7185" strokeWidth="1"/>
          <circle cx="60" cy="55" r="4" fill="#FB7185"/>
          <path d="M56 58 L54 75" stroke="#FB7185" strokeWidth="2"/>
          <path d="M64 58 L66 75" stroke="#FB7185" strokeWidth="2"/>
          {/* Olhinhos apaixonados */}
          <path d="M45 82 C45 78 48 75 52 78 C56 75 59 78 59 82 C59 88 52 92 52 92 C52 92 45 88 45 82" fill="white"/>
          <path d="M61 82 C61 78 64 75 68 78 C72 75 75 78 75 82 C75 88 68 92 68 92 C68 92 61 88 61 82" fill="white"/>
          {/* Bochecha rosada */}
          <ellipse cx="40" cy="95" rx="5" ry="3" fill="#FCA5A5" opacity="0.7"/>
          <ellipse cx="80" cy="95" rx="5" ry="3" fill="#FCA5A5" opacity="0.7"/>
          {/* Sorriso */}
          <path d="M50 100 Q60 110 70 100" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
      )
    
    default:
      return (
        <svg width={size} height={size * 1.2} viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-bounce">
          <defs>
            <linearGradient id="bagGradDefault" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
          </defs>
          <path d="M35 50 L30 115 C30 119 32 122 35 122 L85 122 C88 122 90 119 90 115 L85 50 Z" 
                fill="url(#bagGradDefault)" stroke="#2563EB" strokeWidth="3" strokeLinejoin="round"/>
          <path d="M37 50 C37 38 45 30 60 30 C75 30 83 38 83 50" 
                stroke="#F97316" strokeWidth="5" fill="none" strokeLinecap="round"/>
          <circle cx="50" cy="75" r="6" fill="white"/>
          <circle cx="70" cy="75" r="6" fill="white"/>
          <ellipse cx="45" cy="65" rx="6" ry="8" fill="white" opacity="0.4"/>
        </svg>
      )
  }
}

// Função helper para ler config do localStorage de forma síncrona
function getInitialConfig(): { theme: MascotTheme; bgTheme: BackgroundTheme; message: string } {
  if (typeof window === 'undefined') {
    return { theme: 'default', bgTheme: 'default', message: 'Carregando...' }
  }
  try {
    const cached = localStorage.getItem('loadingConfig')
    if (cached) {
      const parsed = JSON.parse(cached)
      return {
        theme: parsed.theme || 'default',
        bgTheme: parsed.bgTheme || 'default',
        message: parsed.message || 'Carregando...'
      }
    }
  } catch {}
  return { theme: 'default', bgTheme: 'default', message: 'Carregando...' }
}

export default function LoadingSpinner({ 
  message, 
  fullScreen = true,
  size = 'md',
  theme,
  bgTheme
}: LoadingSpinnerProps) {
  // Inicializa com valor do cache SINCRONAMENTE para evitar flash
  const initialConfig = getInitialConfig()
  const [currentTheme, setCurrentTheme] = useState<MascotTheme>(theme || initialConfig.theme)
  const [currentBgTheme, setCurrentBgTheme] = useState<BackgroundTheme>(bgTheme || initialConfig.bgTheme)
  const [loadingMessage, setLoadingMessage] = useState(message || initialConfig.message)
  const [configLoaded, setConfigLoaded] = useState(false)
  
  const sizeConfig = {
    sm: { svg: 60, text: 'text-sm' },
    md: { svg: 80, text: 'text-base' },
    lg: { svg: 100, text: 'text-lg' }
  }
  
  const config = sizeConfig[size]
  
  // Buscar configurações do servidor e atualizar cache
  useEffect(() => {
    // Se já tem no localStorage, não precisa buscar novamente
    const cached = localStorage.getItem('loadingConfig')
    if (cached && !configLoaded) {
      setConfigLoaded(true)
      return
    }
    
    fetch('/api/config/public')
      .then(res => res.json())
      .then(data => {
        const newTheme = data['loading.mascotTheme'] || 'default'
        const newBgTheme = data['loading.backgroundColor'] || 'default'
        const msg1 = data['loading.message1'] || 'Carregando...'
        
        // Só atualiza se não foi passado via props
        if (!theme) setCurrentTheme(newTheme)
        if (!bgTheme) setCurrentBgTheme(newBgTheme)
        if (!message) setLoadingMessage(msg1)
        
        // Salva no localStorage para leitura síncrona na próxima vez
        localStorage.setItem('loadingConfig', JSON.stringify({
          theme: newTheme,
          bgTheme: newBgTheme,
          message: msg1
        }))
        setConfigLoaded(true)
      })
      .catch(() => {
        setConfigLoaded(true)
      })
  }, [message, theme, bgTheme, configLoaded])
  
  const bgClass = backgroundColors[currentBgTheme] || backgroundColors.default
  const textClass = textColors[currentBgTheme] || textColors.default
  
  const content = (
    <div className="flex flex-col items-center gap-3">
      <Mascot theme={currentTheme} size={config.svg} />
      <p className={`${config.text} font-semibold bg-gradient-to-r ${textClass} bg-clip-text text-transparent`}>
        {loadingMessage}
      </p>
    </div>
  )

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br ${bgClass}`}>
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      {content}
    </div>
  )
}
