'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface GoogleAdsProps {
  adsId?: string
}

// Declarar gtag no window
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

export default function GoogleAds({ adsId = 'AW-17927166534' }: GoogleAdsProps) {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)

  // Verificar se é área admin
  useEffect(() => {
    const isAdminPath = pathname?.startsWith('/admin') || 
                        pathname?.startsWith('/vendedor') ||
                        window.location.hostname.includes('gerencial-sys')
    setIsAdmin(isAdminPath)
  }, [pathname])

  // Não carregar em áreas administrativas
  if (isAdmin || !adsId) return null

  return (
    <>
      {/* Google Ads Tag */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${adsId}');
        `}
      </Script>
    </>
  )
}

// Função para rastrear conversão de compra
export function trackPurchaseConversion(
  transactionId: string,
  value: number,
  currency: string = 'BRL'
) {
  if (typeof window !== 'undefined' && window.gtag) {
    // Evento de conversão do Google Ads
    window.gtag('event', 'conversion', {
      send_to: 'AW-17927166534/5BMTCJdz_EbEMa0g-RC',
      value: value,
      currency: currency,
      transaction_id: transactionId,
    })
    
    // Evento padrão de purchase
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: value,
      currency: currency,
    })
    
    console.log('📊 Google Ads: Conversão de compra rastreada', { transactionId, value })
  }
}

// Função para rastrear adição ao carrinho
export function trackAddToCart(
  itemId: string,
  itemName: string,
  value: number,
  currency: string = 'BRL'
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: currency,
      value: value,
      items: [{
        item_id: itemId,
        item_name: itemName,
        price: value,
        quantity: 1,
      }]
    })
    
    console.log('📊 Google Ads: Add to cart rastreado', { itemId, itemName, value })
  }
}

// Função para rastrear início de checkout
export function trackBeginCheckout(
  items: Array<{ id: string; name: string; price: number; quantity: number }>,
  totalValue: number,
  currency: string = 'BRL'
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: currency,
      value: totalValue,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))
    })
    
    console.log('📊 Google Ads: Begin checkout rastreado', { totalValue, itemCount: items.length })
  }
}

// Função para rastrear visualização de produto
export function trackViewItem(
  itemId: string,
  itemName: string,
  value: number,
  currency: string = 'BRL'
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_item', {
      currency: currency,
      value: value,
      items: [{
        item_id: itemId,
        item_name: itemName,
        price: value,
        quantity: 1,
      }]
    })
  }
}

// Função para rastrear pesquisa
export function trackSearch(searchTerm: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search', {
      search_term: searchTerm,
    })
  }
}

// Função para rastrear lead (ex: cadastro de email)
export function trackLead(value: number = 0) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'generate_lead', {
      value: value,
      currency: 'BRL',
    })
  }
}

// Função para rastrear registro de usuário
export function trackSignUp(method: string = 'email') {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'sign_up', {
      method: method,
    })
  }
}
