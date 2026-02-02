'use client'

import { useEffect, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { analytics } from '@/lib/analytics-client'

// Componente interno que usa useSearchParams
function AnalyticsTrackerInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const visitorRegistered = useRef(false)

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    // Registrar page view a cada mudança de página/rota
    if (pathname) {
      const fullPath = searchParams?.toString() 
        ? `${pathname}?${searchParams.toString()}`
        : pathname
      
      analytics.pageView(fullPath)
    }
  }, [pathname, searchParams])

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
