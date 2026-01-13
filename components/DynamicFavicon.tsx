'use client'

import { useEffect, useState } from 'react'
import Head from 'next/head'

export default function DynamicFavicon() {
  const [favicon, setFavicon] = useState<string>('')
  const [siteTitle, setSiteTitle] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config/public')
        const data = await response.json()
        if (data) {
          if (data['appearance.favicon']) {
            setFavicon(data['appearance.favicon'])
          }
          if (data['site.title']) {
            setSiteTitle(data['site.title'])
          }
        }
        setIsLoaded(true)
      } catch (error) {
        console.error('Erro ao buscar configurações:', error)
        setIsLoaded(true)
      }
    }
    fetchConfig()
  }, [])

  // Atualiza o título da página
  useEffect(() => {
    if (siteTitle && typeof document !== 'undefined') {
      document.title = siteTitle
    }
  }, [siteTitle])

  // Atualiza o favicon usando meta tags
  useEffect(() => {
    if (!favicon || typeof document === 'undefined') return
    
    // Encontra ou cria o link do favicon
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.type = favicon.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon'
    link.href = favicon
  }, [favicon])

  return null
}
