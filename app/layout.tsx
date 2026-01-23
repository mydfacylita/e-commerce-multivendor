import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import DynamicFavicon from '@/components/DynamicFavicon'
import DynamicStyles from '@/components/DynamicStyles'
import { NavigationProvider } from '@/components/NavigationProvider'
import LoadingScreen from '@/components/LoadingScreen'
import AnalyticsTracker from '@/components/AnalyticsTracker'
// NOTA: Jobs de background agora são iniciados via instrumentation.ts (Next.js 14)
// Não usar mais: import '@/lib/init'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'E-Commerce Moderno',
  description: 'Sua loja online completa e moderna',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
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
