// Utilitário para rastrear eventos do Google Analytics 4
// Documentação: https://developers.google.com/analytics/devguides/collection/ga4/ecommerce

export const gtag = {
  // Evento: Visualizar item
  viewItem: (item: {
    id: string
    name: string
    price: number
    category?: string
    brand?: string
  }) => {
    if (typeof window === 'undefined' || !window.gtag) return
    
    window.gtag('event', 'view_item', {
      currency: 'BRL',
      value: item.price,
      items: [{
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        item_category: item.category,
        item_brand: item.brand,
      }]
    })
  },

  // Evento: Adicionar ao carrinho
  addToCart: (item: {
    id: string
    name: string
    price: number
    quantity: number
    category?: string
  }) => {
    if (typeof window === 'undefined' || !window.gtag) return
    
    window.gtag('event', 'add_to_cart', {
      currency: 'BRL',
      value: item.price * item.quantity,
      items: [{
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
        item_category: item.category,
      }]
    })
  },

  // Evento: Remover do carrinho
  removeFromCart: (item: {
    id: string
    name: string
    price: number
    quantity: number
  }) => {
    if (typeof window === 'undefined' || !window.gtag) return
    
    window.gtag('event', 'remove_from_cart', {
      currency: 'BRL',
      value: item.price * item.quantity,
      items: [{
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      }]
    })
  },

  // Evento: Iniciar checkout
  beginCheckout: (items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>, total: number) => {
    if (typeof window === 'undefined' || !window.gtag) return
    
    window.gtag('event', 'begin_checkout', {
      currency: 'BRL',
      value: total,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))
    })
  },

  // Evento: Adicionar informações de pagamento
  addPaymentInfo: (paymentMethod: string, total: number) => {
    if (typeof window === 'undefined' || !window.gtag) return
    
    window.gtag('event', 'add_payment_info', {
      currency: 'BRL',
      value: total,
      payment_type: paymentMethod,
    })
  },

  // Evento: Compra realizada
  purchase: (order: {
    orderId: string
    total: number
    shipping: number
    items: Array<{
      id: string
      name: string
      price: number
      quantity: number
    }>
  }) => {
    if (typeof window === 'undefined' || !window.gtag) return
    
    window.gtag('event', 'purchase', {
      transaction_id: order.orderId,
      value: order.total,
      currency: 'BRL',
      shipping: order.shipping,
      items: order.items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      }))
    })
  },

  // Evento: Pesquisa
  search: (searchTerm: string) => {
    if (typeof window === 'undefined' || !window.gtag) return
    
    window.gtag('event', 'search', {
      search_term: searchTerm,
    })
  },

  // Evento: Login
  login: (method: string = 'email') => {
    if (typeof window === 'undefined' || !window.gtag) return
    
    window.gtag('event', 'login', {
      method: method,
    })
  },

  // Evento: Cadastro
  signUp: (method: string = 'email') => {
    if (typeof window === 'undefined' || !window.gtag) return
    
    window.gtag('event', 'sign_up', {
      method: method,
    })
  },

  // Evento personalizado
  event: (eventName: string, params: Record<string, any> = {}) => {
    if (typeof window === 'undefined' || !window.gtag) return
    
    window.gtag('event', eventName, params)
  },
}
