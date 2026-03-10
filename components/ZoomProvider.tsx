'use client'

import { useEffect, useState } from 'react'

export default function ZoomProvider({ children }: { children: React.ReactNode }) {
  const [zoom, setZoom] = useState(100)

  useEffect(() => {
    const loadZoom = async () => {
      try {
        // Primeiro tenta pegar do localStorage (cache)
        const cachedZoom = localStorage.getItem('siteZoom')
        if (cachedZoom) {
          const zoomValue = parseInt(cachedZoom)
          setZoom(zoomValue)
          applyZoom(zoomValue)
        }

        // Depois busca da API para atualizar
        const res = await fetch('/api/config/public')
        if (res.ok) {
          const data = await res.json()
          const newZoom = parseInt(data['appearance.zoom']) || 100
          setZoom(newZoom)
          localStorage.setItem('siteZoom', newZoom.toString())
          applyZoom(newZoom)
        }
      } catch (error) {
        console.error('Erro ao carregar zoom:', error)
      }
    }

    loadZoom()

    // Limpa o zoom quando o componente é desmontado
    return () => {
      document.body.style.removeProperty('zoom')
    }
  }, [])

  // Aplica o zoom no body (não no html) para preservar position:fixed
  // Zoom no <html> quebra position:fixed em Chrome/Edge — o initial containing block
  // para fixed é o viewport, definido pelo <html>. No <body>, fixed funciona corretamente.
  const applyZoom = (zoomValue: number) => {
    if (zoomValue !== 100) {
      document.body.style.zoom = `${zoomValue}%`
    } else {
      document.body.style.removeProperty('zoom')
    }
  }

  // Renderiza children diretamente - o zoom é aplicado via CSS no documento
  return <>{children}</>
}
