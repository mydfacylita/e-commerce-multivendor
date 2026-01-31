'use client'

import { useEffect, useState } from 'react'

// Função para converter HEX para RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

// Função para converter RGB para HEX
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

// Função para gerar paleta de cores (50-900)
function generateColorPalette(baseColor: string): Record<string, string> {
  const rgb = hexToRgb(baseColor)
  if (!rgb) return {}

  // Percentuais de mix com branco (tons claros) e preto (tons escuros)
  const shades = {
    50: { white: 0.90 },
    100: { white: 0.80 },
    200: { white: 0.60 },
    300: { white: 0.40 },
    400: { white: 0.20 },
    500: { white: 0 },
    600: { black: 0.10 },
    700: { black: 0.25 },
    800: { black: 0.40 },
    900: { black: 0.55 },
  }

  const palette: Record<string, string> = {}

  for (const [shade, mix] of Object.entries(shades)) {
    if ('white' in mix && mix.white > 0) {
      // Misturar com branco
      const factor = mix.white
      palette[shade] = rgbToHex(
        rgb.r + (255 - rgb.r) * factor,
        rgb.g + (255 - rgb.g) * factor,
        rgb.b + (255 - rgb.b) * factor
      )
    } else if ('black' in mix && mix.black > 0) {
      // Misturar com preto
      const factor = 1 - mix.black
      palette[shade] = rgbToHex(
        rgb.r * factor,
        rgb.g * factor,
        rgb.b * factor
      )
    } else {
      palette[shade] = baseColor
    }
  }

  return palette
}

export default function DynamicStyles() {
  const [styles, setStyles] = useState({
    backgroundColor: '#F3F4F6',
    primaryColor: '#2C4A9E',
    secondaryColor: '#FF9900',
  })

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config/public')
        const data = await response.json()
        if (data) {
          setStyles({
            backgroundColor: data['appearance.backgroundColor'] || '#F3F4F6',
            primaryColor: data['appearance.primaryColor'] || '#2C4A9E',
            secondaryColor: data['appearance.secondaryColor'] || '#FF9900',
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
      const root = document.documentElement
      
      // Cores base
      root.style.setProperty('--bg-color', styles.backgroundColor)
      root.style.setProperty('--primary-color', styles.primaryColor)
      root.style.setProperty('--secondary-color', styles.secondaryColor)
      
      // Gerar e aplicar paleta primary (50-900)
      const primaryPalette = generateColorPalette(styles.primaryColor)
      for (const [shade, color] of Object.entries(primaryPalette)) {
        root.style.setProperty(`--primary-${shade}`, color)
      }
      
      // Gerar e aplicar paleta accent/secondary (50-900)
      const accentPalette = generateColorPalette(styles.secondaryColor)
      for (const [shade, color] of Object.entries(accentPalette)) {
        root.style.setProperty(`--accent-${shade}`, color)
      }
      
      // Aplica a cor de fundo no body com prioridade
      document.body.style.setProperty('background-color', styles.backgroundColor, 'important')
    }
  }, [styles])

  return null
}
