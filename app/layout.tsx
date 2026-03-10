import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Suspense } from 'react'
import { headers } from 'next/headers'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import DynamicFavicon from '@/components/DynamicFavicon'
import DynamicStyles from '@/components/DynamicStyles'
import { NavigationProvider } from '@/components/NavigationProvider'
import LoadingScreen from '@/components/LoadingScreen'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import AffiliateTracker from '@/components/AffiliateTracker'
import AIChatWidget from '@/components/AIChatWidget'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import GoogleAds from '@/components/GoogleAds'
import FacebookPixel from '@/components/FacebookPixel'
import OrganizationSchema, { WebsiteSchema, LocalBusinessSchema } from '@/components/StructuredData'
import { prisma } from '@/lib/prisma'
// NOTA: Jobs de background agora são iniciados via instrumentation.ts (Next.js 14)
// Não usar mais: import '@/lib/init'

// Forçar busca dinâmica das configurações (não cachear layout)
export const dynamic = 'force-dynamic'

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
  metadataBase: new URL('https://mydshop.com.br'),
  title: {
    default: 'MYDSHOP - Marketplace Online | Compre com os Melhores Preços',
    template: '%s | MYDSHOP',
  },
  description: 'MYDSHOP - Sua loja online com produtos de qualidade, preços imbatíveis e entrega para todo o Brasil. Eletrônicos, moda, casa e muito mais!',
  keywords: ['loja online', 'marketplace', 'comprar online', 'promoções', 'ofertas', 'eletronicos', 'moda', 'casa', 'mydshop', 'ecommerce brasil'],
  authors: [{ name: 'MYDSHOP' }],
  creator: 'MYDSHOP',
  publisher: 'MYDSHOP',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://mydshop.com.br',
    siteName: 'MYDSHOP',
    title: 'MYDSHOP - Marketplace Online | Compre com os Melhores Preços',
    description: 'Sua loja online com produtos de qualidade, preços imbatíveis e entrega para todo o Brasil.',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 600,
        alt: 'MYDSHOP - Marketplace Online',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MYDSHOP - Marketplace Online',
    description: 'Sua loja online com produtos de qualidade e preços imbatíveis!',
    images: ['/logo.png'],
  },
  verification: {
    google: 'TbwjG6y-rTDcMZKkoBqKsbHsAeiK5-74M9cwoHD5QNA',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Detecta se é o portal de desenvolvedores (via header injetado pelo middleware)
  const headersList = await headers()
  const pageType = headersList.get('x-page-type')
  const isDeveloperPage = pageType === 'developer'
  const isAdminPage = pageType === 'admin'

  // Portal developer: layout mínimo, sem Navbar/Footer/scripts da loja
  if (isDeveloperPage) {
    return (
      <html lang="pt-BR" className={inter.className}>
        <body className="bg-gray-950 text-white antialiased">
          <Providers>{children}</Providers>
        </body>
      </html>
    )
  }

  // Admin: layout mínimo também (o admin/layout.tsx tem seu próprio sidebar)
  if (isAdminPage) {
    return (
      <html lang="pt-BR" className={inter.className}>
        <body className="antialiased">
          <Providers>{children}</Providers>
        </body>
      </html>
    )
  }

  // Afiliado: layout próprio sem Navbar/Footer/AIChatWidget da loja
  const isAffiliatePage = pageType === 'affiliate'
  if (isAffiliatePage) {
    return (
      <html lang="pt-BR" className={inter.className}>
        <body className="antialiased">
          <Providers>{children}</Providers>
        </body>
      </html>
    )
  }

  // Buscar IDs no server
  const gaId = await getGoogleAnalyticsId()
  const fbPixelId = await getFacebookPixelId()
  
  return (
    <html lang="pt-BR">
      <head>
        {/* GA e Facebook Pixel são carregados pelos componentes client-side
            GoogleAnalytics e FacebookPixel, que verificam se é rota admin/vendedor
            antes de inicializar — evitando conversões falsas no painel */}
      </head>
      <body className={inter.className}>
        {/* Dados Estruturados para SEO */}
        <OrganizationSchema />
        <WebsiteSchema />
        <LocalBusinessSchema />
        
        <GoogleAnalytics gaId={gaId || undefined} />
        <GoogleAds adsId="AW-17927166534" />
        <FacebookPixel pixelId={fbPixelId || undefined} />
        <Providers>
          <NavigationProvider>
            <DynamicFavicon />
            <DynamicStyles />
            <LoadingScreen />
            <AnalyticsTracker />
            <Suspense fallback={null}>
              <AffiliateTracker />
            </Suspense>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">{children}</main>
              <Footer />
            </div>
            <AIChatWidget />
          </NavigationProvider>
        </Providers>
      </body>
    </html>
  )
}
