'use client'

import { Suspense } from 'react'
import { useNavigation } from './NavigationProvider'
import LoadingSpinner from './LoadingSpinner'

function LoadingScreenContent() {
  const { isNavigating } = useNavigation()
  
  if (!isNavigating) return null
  
  return <LoadingSpinner size="lg" fullScreen />
}

export default function LoadingScreen() {
  return (
    <Suspense fallback={null}>
      <LoadingScreenContent />
    </Suspense>
  )
}
