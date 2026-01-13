'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import LoadingScreen from '@/components/LoadingScreen'
import CookieConsent from '@/components/CookieConsent'
import ZoomProvider from '@/components/ZoomProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ZoomProvider>
        {children}
      </ZoomProvider>
      <LoadingScreen />
      <CookieConsent />
      <Toaster position="top-center" />
    </SessionProvider>
  )
}
