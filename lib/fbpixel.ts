// Facebook Pixel Event Tracking Helper
// Usado para rastrear eventos de e-commerce

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID

// Tipos de eventos do Facebook Pixel para e-commerce
type FBEventName = 
  | 'PageView'
  | 'ViewContent'
  | 'Search'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Lead'
  | 'CompleteRegistration'
  | 'Contact'

interface FBEventParams {
  content_name?: string
  content_category?: string
  content_ids?: string[]
  content_type?: 'product' | 'product_group'
  value?: number
  currency?: string
  num_items?: number
  search_string?: string
  status?: string
}

// Verifica se o pixel está disponível
export const fbPixelLoaded = () => {
  return typeof window !== 'undefined' && window.fbq !== undefined
}

// Aguarda o pixel carregar e dispara evento
const waitForPixel = (callback: () => void, maxAttempts = 10) => {
  let attempts = 0
  const check = () => {
    if (fbPixelLoaded()) {
      callback()
    } else if (attempts < maxAttempts) {
      attempts++
      setTimeout(check, 300)
    } else {
      console.log('[FB Pixel] Timeout aguardando carregamento')
    }
  }
  check()
}

// Dispara evento genérico
export const fbEvent = (eventName: FBEventName, params?: FBEventParams) => {
  const dispatchEvent = () => {
    if (!fbPixelLoaded()) {
      console.log('[FB Pixel] Não carregado, evento ignorado:', eventName)
      return
    }
    
    console.log('[FB Pixel] Evento:', eventName, params)
    window.fbq('track', eventName, params)
  }

  // Se pixel já carregou, dispara imediatamente; senão aguarda
  if (fbPixelLoaded()) {
    dispatchEvent()
  } else {
    waitForPixel(dispatchEvent)
  }
}

// ==========================================
// EVENTOS DE E-COMMERCE
// ==========================================

// Visualização de produto
export const fbViewContent = (product: {
  id: string
  name: string
  category?: string
  price: number
}) => {
  fbEvent('ViewContent', {
    content_name: product.name,
    content_category: product.category,
    content_ids: [product.id],
    content_type: 'product',
    value: product.price,
    currency: 'BRL',
  })
}

// Busca de produtos
export const fbSearch = (searchQuery: string) => {
  fbEvent('Search', {
    search_string: searchQuery,
  })
}

// Adicionar ao carrinho
export const fbAddToCart = (product: {
  id: string
  name: string
  category?: string
  price: number
  quantity?: number
}) => {
  fbEvent('AddToCart', {
    content_name: product.name,
    content_category: product.category,
    content_ids: [product.id],
    content_type: 'product',
    value: product.price * (product.quantity || 1),
    currency: 'BRL',
    num_items: product.quantity || 1,
  })
}

// Adicionar aos favoritos
export const fbAddToWishlist = (product: {
  id: string
  name: string
  category?: string
  price: number
}) => {
  fbEvent('AddToWishlist', {
    content_name: product.name,
    content_category: product.category,
    content_ids: [product.id],
    content_type: 'product',
    value: product.price,
    currency: 'BRL',
  })
}

// Iniciar checkout
export const fbInitiateCheckout = (cart: {
  items: { id: string; name: string; price: number; quantity: number }[]
  total: number
}) => {
  fbEvent('InitiateCheckout', {
    content_ids: cart.items.map(item => item.id),
    content_type: 'product',
    value: cart.total,
    currency: 'BRL',
    num_items: cart.items.reduce((sum, item) => sum + item.quantity, 0),
  })
}

// Adicionar informação de pagamento
export const fbAddPaymentInfo = (total: number) => {
  fbEvent('AddPaymentInfo', {
    value: total,
    currency: 'BRL',
  })
}

// Compra realizada
export const fbPurchase = (order: {
  orderId: string
  items: { id: string; name: string; price: number; quantity: number }[]
  total: number
}) => {
  fbEvent('Purchase', {
    content_ids: order.items.map(item => item.id),
    content_type: 'product',
    value: order.total,
    currency: 'BRL',
    num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
  })
}

// Novo cadastro
export const fbCompleteRegistration = (method?: string) => {
  fbEvent('CompleteRegistration', {
    status: method || 'email',
  })
}

// Lead (interesse)
export const fbLead = (value?: number) => {
  fbEvent('Lead', {
    value: value,
    currency: 'BRL',
  })
}

// Contato
export const fbContact = () => {
  fbEvent('Contact')
}
