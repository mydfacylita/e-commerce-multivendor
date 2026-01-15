// Cliente para enviar eventos de analytics
// Usa a API Key do servidor de forma segura

class AnalyticsClient {
  private apiUrl = '/api/analytics/track-client'
  private visitorId: string
  private sessionId: string

  constructor() {
    // Gerar ou recuperar IDs persistentes
    this.visitorId = this.getOrCreateVisitorId()
    this.sessionId = this.getOrCreateSessionId()
  }

  private getOrCreateVisitorId(): string {
    if (typeof window === 'undefined') return ''
    
    let visitorId = localStorage.getItem('mydshop_visitor_id')
    if (!visitorId) {
      visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substring(7)
      localStorage.setItem('mydshop_visitor_id', visitorId)
    }
    return visitorId
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return ''
    
    let sessionId = sessionStorage.getItem('mydshop_session_id')
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(7)
      sessionStorage.setItem('mydshop_session_id', sessionId)
    }
    return sessionId
  }

  private async track(name: string, data: Record<string, any> = {}) {
    if (typeof window === 'undefined') return

    try {
      // Adicionar dados padrão
      const enrichedData = {
        ...data,
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer || 'direct',
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language
      }

      console.log('📊 Analytics:', name, enrichedData)

      // Enviar para API interna (que usa a API key do servidor)
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          data: enrichedData
        })
      })

      if (!response.ok) {
        console.error('Analytics API error:', await response.text())
      }
    } catch (error) {
      // Silenciar erros de analytics para não afetar UX
      console.debug('Analytics error:', error)
    }
  }

  // Métodos públicos
  pageView(page?: string) {
    this.track('page_view', {
      page: page || window.location.pathname
    })
  }

  visitor(userData?: Record<string, any>) {
    this.track('visitor', userData || {})
  }

  click(element: string, data?: Record<string, any>) {
    this.track('click', {
      element,
      ...data
    })
  }

  addToCart(product: { id: string; name: string; price: number; quantity?: number }) {
    this.track('add_to_cart', product)
  }

  purchase(order: { orderId: string; total: number; items?: any[] }) {
    this.track('purchase', order)
  }

  search(query: string, results?: number) {
    this.track('search', {
      query,
      results
    })
  }

  formSubmit(formName: string, data?: Record<string, any>) {
    this.track('form_submit', {
      formName,
      ...data
    })
  }

  custom(eventName: string, data?: Record<string, any>) {
    this.track('custom', {
      eventName,
      ...data
    })
  }
}

// Exportar instância singleton
export const analytics = new AnalyticsClient()
