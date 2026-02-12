'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Componente que rastreia links de afiliados
 * Detecta o parâmetro ?ref= na URL e registra o click
 * 
 * IMPORTANTE: Cookie de afiliado é considerado ESSENCIAL/FUNCIONAL
 * segundo LGPD e não requer consentimento prévio, pois é necessário
 * para o funcionamento do programa de afiliados.
 */
export default function AffiliateTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const refCode = searchParams.get('ref')
    
    if (refCode) {
      // Salvar IMEDIATAMENTE no localStorage como backup
      localStorage.setItem('affiliate_ref', refCode)
      localStorage.setItem('affiliate_ref_date', new Date().toISOString())
      
      // Registrar click do afiliado
      fetch(`/api/affiliate/track?ref=${refCode}&url=${encodeURIComponent(window.location.href)}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log('✅ Link de afiliado detectado:', data.affiliate?.code)
            console.log('📦 Salvo em cookie + localStorage')
          } else {
            console.warn('⚠️ Erro ao registrar afiliado:', data.error)
          }
        })
        .catch(error => {
          console.error('❌ Erro ao chamar API de tracking:', error)
        })
    }
  }, [searchParams])

  return null // Componente invisível
}
