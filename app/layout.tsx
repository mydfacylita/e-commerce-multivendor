import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import DynamicFavicon from '@/components/DynamicFavicon'
import DynamicStyles from '@/components/DynamicStyles'
import { NavigationProvider } from '@/components/NavigationProvider'
import LoadingScreen from '@/components/LoadingScreen'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import FacebookPixel from '@/components/FacebookPixel'
import { prisma } from '@/lib/prisma'
// NOTA: Jobs de background agora são iniciados via instrumentation.ts (Next.js 14)
// Não usar mais: import '@/lib/init'

const inter = Inter({ subsets: ['latin'] })

// Buscar GA ID do banco de dados
async function getGoogleAnalyticsId(): Promise<string | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'seo.googleAnalytics' }
    })
    return config?.value || null
  } catch {
    return null
  }
}

// Buscar Facebook Pixel ID do banco de dados
async function getFacebookPixelId(): Promise<string | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'seo.facebookPixel' }
    })
    return config?.value || null
  } catch {
    return null
  }
}

export const metadata: Metadata = {
  title: 'MYDSHOP - Marketplace Online',
  description: 'Sua loja online completa e moderna',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Buscar IDs no server
  const gaId = await getGoogleAnalyticsId()
  const fbPixelId = await getFacebookPixelId()
  
  return (
    <html lang="pt-BR">
      <head>
        {/* Google Analytics - Carregado no server para detecção imediata */}
        {gaId && (
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
                gtag('config', '${gaId}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
        {/* Facebook Pixel - Carregado no server para detecção imediata */}
        {fbPixelId && (
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
        )}
      </head>
      <body className={inter.className}>
        <GoogleAnalytics gaId={gaId || undefined} />
        <FacebookPixel pixelId={fbPixelId || undefined} />
        <Providers>
          <NavigationProvider>
            <DynamicFavicon />
            <DynamicStyles />
            <LoadingScreen />
            <AnalyticsTracker />
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">{children}</main>
              <Footer />
            </div>
          </NavigationProvider>
        </Providers>
      </body>
    </html>
  )
}
