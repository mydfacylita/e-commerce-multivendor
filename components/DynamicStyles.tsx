'use client'

import { useEffect, useState } from 'react'

export default function DynamicStyles() {
  const [styles, setStyles] = useState({
    backgroundColor: '#F3F4F6',
    primaryColor: '#3B82F6',
    secondaryColor: '#F97316',
  })

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config/public')
        const data = await response.json()
        if (data) {
          setStyles({
            backgroundColor: data['appearance.backgroundColor'] || '#F3F4F6',
            primaryColor: data['appearance.primaryColor'] || '#3B82F6',
            secondaryColor: data['appearance.secondaryColor'] || '#F97316',
          })
        }
      } catch (error) {
        console.error('Erro ao buscar configurações de estilo:', error)
      }
    }
    fetchConfig()
  }, [])

  // Aplica as cores dinamicamente via CSS variables
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--bg-color', styles.backgroundColor)
      document.documentElement.style.setProperty('--primary-color', styles.primaryColor)
      document.documentElement.style.setProperty('--secondary-color', styles.secondaryColor)
      
      // Aplica a cor de fundo no body
      document.body.style.backgroundColor = styles.backgroundColor
    }
  }, [styles])

  return null
}
