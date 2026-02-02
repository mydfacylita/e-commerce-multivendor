'use client'

import Script from 'next/script'
import { useEffect, useState, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface FacebookPixelProps {
  pixelId?: string
}

// Componente interno
function FacebookPixelInner({ pixelId }: FacebookPixelProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [fbPixelId, setFbPixelId] = useState<string | null>(pixelId || null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Verificar se é admin
  useEffect(() => {
    const userRole = (session?.user as any)?.role
    const isAdminUser = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
    const isAdminPath = pathname?.startsWith('/admin')
    setIsAdmin(isAdminUser || isAdminPath)
  }, [session, pathname])

  // Buscar Pixel ID das configurações se não foi passado como prop
  useEffect(() => {
    if (!pixelId) {
      fetch('/api/config/public')
        .then(res => res.json())
        .then(data => {
          if (data?.['seo.facebookPixel']) {
            setFbPixelId(data['seo.facebookPixel'])
          }
        })
        .catch(console.error)
    }
  }, [pixelId])

  // Rastrear mudanças de página (PageView) - apenas se não for admin
  useEffect(() => {
    if (!fbPixelId || typeof window === 'undefined' || isAdmin) return

    // Enviar PageView para o Facebook Pixel
    if (window.fbq) {
      window.fbq('track', 'PageView')
    }
  }, [pathname, fbPixelId, isAdmin])

  // Não renderizar se não tiver Pixel ID ou se for admin
  if (!fbPixelId || isAdmin) return null

  return (
    <>
      {/* Facebook Pixel Script */}
      <Script id="facebook-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${fbPixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      {/* Noscript fallback */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}

// Componente exportado envolve em Suspense
export default function FacebookPixel({ pixelId }: FacebookPixelProps) {
  return (
    <Suspense fallback={null}>
      <FacebookPixelInner pixelId={pixelId} />
    </Suspense>
  )
}

// Declaração de tipo para o fbq global
declare global {
  interface Window {
    fbq: (...args: any[]) => void
    _fbq: any
  }
}
