'use client'

import Script from 'next/script'
import { useEffect, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface GoogleAnalyticsProps {
  gaId?: string
}

// Componente interno que usa useSearchParams
function GoogleAnalyticsInner({ gaId }: GoogleAnalyticsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [measurementId, setMeasurementId] = useState<string | null>(gaId || null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Verificar se é admin
  useEffect(() => {
    const userRole = (session?.user as any)?.role
    const isAdminUser = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
    const isAdminPath = pathname?.startsWith('/admin')
    setIsAdmin(isAdminUser || isAdminPath)
  }, [session, pathname])

  // Buscar ID do GA das configurações se não foi passado como prop
  useEffect(() => {
    if (!gaId) {
      fetch('/api/config/public')
        .then(res => res.json())
        .then(data => {
          if (data?.['seo.googleAnalytics']) {
            setMeasurementId(data['seo.googleAnalytics'])
          }
        })
        .catch(console.error)
    }
  }, [gaId])

  // Rastrear mudanças de página (apenas se não for admin)
  useEffect(() => {
    if (!measurementId || typeof window === 'undefined' || isAdmin) return

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    
    // Enviar page_view para o GA4
    if (window.gtag) {
      window.gtag('config', measurementId, {
        page_path: url,
      })
    }
  }, [pathname, searchParams, measurementId, isAdmin])

  // Não renderizar se não tiver ID ou se for admin
  if (!measurementId || isAdmin) return null

  return (
    <>
      {/* Google Analytics Script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  )
}

// Componente exportado envolve em Suspense
export default function GoogleAnalytics({ gaId }: GoogleAnalyticsProps) {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner gaId={gaId} />
    </Suspense>
  )
}

// Declaração de tipo para o gtag global
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}
