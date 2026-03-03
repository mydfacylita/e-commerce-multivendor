'use client'

import { useEffect, useRef, Suspense, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { analytics } from '@/lib/analytics-client'

// Componente interno que usa useSearchParams
function AnalyticsTrackerInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const visitorRegistered = useRef(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  // Verificar se é admin pela URL (evita erro de prerender com useSession)
  useEffect(() => {
    const isAdminPath = pathname?.startsWith('/admin') || 
                        pathname?.startsWith('/vendedor') ||
                        window.location.hostname.includes('gerencial-sys')
    setIsAdmin(isAdminPath)
  }, [pathname])

  useEffect(() => {
    // Aguarda determinar se é admin antes de rastrear
    if (isAdmin !== false) return
    
    // Registrar visitante apenas UMA VEZ na sessão
    if (!visitorRegistered.current) {
      // Verificar se já foi registrado nesta sessão
      const hasVisited = sessionStorage.getItem('mydshop_visitor_registered')
      
      if (!hasVisited) {
        analytics.visitor()
        sessionStorage.setItem('mydshop_visitor_registered', 'true')
      }
      
      visitorRegistered.current = true
    }
  }, [isAdmin])

  useEffect(() => {
    // Aguarda determinar se é admin antes de rastrear página
    if (isAdmin !== false) return
    if (pathname) {
      const fullPath = searchParams?.toString() 
        ? `${pathname}?${searchParams.toString()}`
        : pathname
      
      analytics.pageView(fullPath)
    }
  }, [pathname, searchParams, isAdmin])

  return null // Componente invisível
}

// Componente exportado envolve em Suspense
export default function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTrackerInner />
    </Suspense>
  )
}
