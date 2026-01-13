'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'

interface NavigationContextType {
  isNavigating: boolean
  startNavigation: () => void
  endNavigation: () => void
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  startNavigation: () => {},
  endNavigation: () => {},
})

export const useNavigation = () => useContext(NavigationContext)

// Configurar NProgress
NProgress.configure({ 
  showSpinner: false,
  minimum: 0.1,
  speed: 200,
  trickleSpeed: 100,
})

function NavigationProviderInner({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const previousUrlRef = useRef('')
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingFetchesRef = useRef(0)
  const domObserverRef = useRef<MutationObserver | null>(null)
  const hasStartedRef = useRef(false)

  // Marcar como montado
  useEffect(() => {
    setMounted(true)
    previousUrlRef.current = pathname + searchParams.toString()
  }, [])

  // Limpar timeouts
  const clearTimeouts = useCallback(() => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current)
      navigationTimeoutRef.current = null
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current)
      safetyTimeoutRef.current = null
    }
  }, [])

  // Finalizar navegação
  const endNavigation = useCallback(() => {
    if (!hasStartedRef.current) return
    
    clearTimeouts()
    NProgress.done()
    setIsNavigating(false)
    hasStartedRef.current = false
    pendingFetchesRef.current = 0
    
    if (domObserverRef.current) {
      domObserverRef.current.disconnect()
    }
  }, [clearTimeouts])

  // Verificar se pode finalizar
  const checkCanEnd = useCallback(() => {
    if (!hasStartedRef.current) return
    
    // Só finaliza se não tem requisições pendentes
    if (pendingFetchesRef.current <= 0) {
      // Dar um tempo para o DOM estabilizar
      navigationTimeoutRef.current = setTimeout(() => {
        endNavigation()
      }, 100)
    }
  }, [endNavigation])

  // Iniciar navegação
  const startNavigation = useCallback(() => {
    if (hasStartedRef.current) return
    
    hasStartedRef.current = true
    pendingFetchesRef.current = 0
    clearTimeouts()
    setIsNavigating(true)
    NProgress.start()
    
    // Timeout de segurança máximo (12 segundos)
    safetyTimeoutRef.current = setTimeout(() => {
      console.warn('Navigation timeout - forcing end')
      endNavigation()
    }, 12000)
  }, [clearTimeouts, endNavigation])

  // Detectar mudança de URL (navegação completou no Next.js)
  useEffect(() => {
    if (!mounted) return
    
    const currentUrl = pathname + searchParams.toString()
    
    if (previousUrlRef.current && previousUrlRef.current !== currentUrl) {
      // URL mudou - navegação completou
      previousUrlRef.current = currentUrl
      
      // Finalizar após pequeno delay para garantir renderização
      setTimeout(() => {
        endNavigation()
      }, 200)
    }
  }, [mounted, pathname, searchParams, endNavigation])

  // Interceptar cliques em links
  useEffect(() => {
    if (!mounted) return
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      
      if (!link) return
      
      // Verificar se é navegação interna
      const href = link.getAttribute('href')
      if (!href) return
      if (href.startsWith('http') && !href.startsWith(window.location.origin)) return
      if (link.target === '_blank') return
      if (link.hasAttribute('data-no-loading')) return
      if (link.hasAttribute('download')) return
      
      // Calcular URL destino
      try {
        const destinationUrl = href.startsWith('/') 
          ? href 
          : new URL(href, window.location.origin).pathname + new URL(href, window.location.origin).search
        
        const currentUrl = pathname + searchParams.toString()
        
        // Só inicia se for navegação diferente
        if (destinationUrl !== currentUrl && destinationUrl !== pathname) {
          startNavigation()
        }
      } catch {
        // URL inválida, ignorar
      }
    }

    // Capturar no capture phase para pegar antes de qualquer handler
    document.addEventListener('click', handleClick, true)
    
    return () => {
      document.removeEventListener('click', handleClick, true)
      clearTimeouts()
    }
  }, [mounted, pathname, searchParams, startNavigation, clearTimeouts])

  // Interceptar navegação do browser (back/forward)
  useEffect(() => {
    if (!mounted) return
    
    const handlePopState = () => {
      startNavigation()
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [mounted, startNavigation])

  return (
    <NavigationContext.Provider value={{ isNavigating, startNavigation, endNavigation }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <NavigationProviderInner>{children}</NavigationProviderInner>
    </Suspense>
  )
}
