'use client'

import Script from 'next/script'
import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

interface GoogleAnalyticsProps {
  gaId?: string
}

// Componente interno que usa useSearchParams
function GoogleAnalyticsInner({ gaId }: GoogleAnalyticsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Rastrear navegações SPA (troca de rota sem reload)
  useEffect(() => {
    if (!gaId || typeof window === 'undefined' || !window.gtag) return
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    window.gtag('config', gaId, { page_path: url })
  }, [pathname, searchParams, gaId])

  // Não renderizar se não tiver ID
  if (!gaId) return null

  // Renderiza imediatamente — layout.tsx já garante que este componente
  // só aparece em páginas públicas (admin tem return próprio antes)
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { page_path: window.location.pathname });
        `}
      </Script>
    </>
  )
}

export default function GoogleAnalytics({ gaId }: GoogleAnalyticsProps) {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner gaId={gaId} />
    </Suspense>
  )
}

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}
