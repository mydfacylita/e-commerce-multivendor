import { prisma } from './prisma'

export interface PaymentData {
  amount: number
  description: string
  payerEmail: string
  payerName?: string
  payerDocument?: string
  payerPhone?: string
  payerAddress?: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
  externalReference?: string // ID do pedido/assinatura no sistema
  notificationUrl?: string
  metadata?: Record<string, any>
  paymentMethod?: 'pix' | 'boleto' | 'credit_card' | 'debit_card'
  // Campos para cartão de crédito
  cardToken?: string
  installments?: number
  paymentMethodId?: string // Bandeira do cartão (visa, master, etc)
  payer?: {
    identification?: {
      type: string
      number: string
    }
  }
}

export interface PaymentResponse {
  success: boolean
  paymentId?: string
  status?: string
  statusDetail?: string
  paymentUrl?: string
  qrCode?: string // Para Pix
  qrCodeBase64?: string
  boletoUrl?: string // Para boleto
  error?: string
}

/**
 * Serviço centralizado de pagamentos
 * Suporta múltiplos gateways de forma unificada
 */
export class PaymentService {
  
  /**
   * Busca gateway ativo
   */
  static async getActiveGateway(gateway?: string) {
    const where = gateway 
      ? { gateway: gateway.toUpperCase(), isActive: true }
      : { isActive: true }
    
    return await prisma.paymentGateway.findFirst({
      where,
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Cria pagamento usando gateway disponível
   */
  static async createPayment(
    data: PaymentData,
    preferredGateway?: string
  ): Promise<PaymentResponse> {
    try {
      // Buscar gateway ativo
      const gateway = await this.getActiveGateway(preferredGateway)
      
      if (!gateway) {
        return {
          success: false,
          error: 'Nenhum gateway de pagamento configurado'
        }
      }

      // Processar conforme o gateway
      switch (gateway.gateway) {
        case 'MERCADOPAGO':
          return await this.processMercadoPago(gateway, data)
        
        case 'PAGSEGURO':
          return await this.processPagSeguro(gateway, data)
        
        case 'STRIPE':
          return await this.processStripe(gateway, data)
        
        default:
          return {
            success: false,
            error: `Gateway ${gateway.gateway} não implementado`
          }
      }
    } catch (error) {
      console.error('Erro ao criar pagamento:', error)
      return {
        success: false,
        error: 'Erro ao processar pagamento'
      }
    }
  }

  /**
   * Processa pagamento via Mercado Pago
   */
  private static async processMercadoPago(
    gateway: any,
    data: PaymentData
  ): Promise<PaymentResponse> {
    try {
      // CRÍTICO: Prisma retorna config como STRING, precisa fazer parse
      let config = gateway.config
      if (typeof config === 'string') {
        console.log('⚠️  Config é STRING, fazendo parse do JSON...')
        config = JSON.parse(config)
      }
      
      const { accessToken, environment } = config
      console.log('🔑 Usando Access Token:', accessToken?.substring(0, 20) + '...')
      console.log('🌍 Ambiente:', environment)

      const apiUrl = 'https://api.mercadopago.com'

      // Se for Pix, Boleto ou Cartão, criar pagamento direto
      if (data.paymentMethod === 'pix') {
        return await this.createMercadoPagoPix(gateway, data)
      }

      if (data.paymentMethod === 'boleto') {
        return await this.createMercadoPagoBoleto(gateway, data)
      }

      if (data.paymentMethod === 'credit_card') {
        return await this.createMercadoPagoCreditCard(gateway, data)
      }

      // Criar preferência de pagamento padrão (checkout)
      const preferenceData = {
        items: [{
          title: data.description,
          quantity: 1,
          unit_price: data.amount,
          currency_id: 'BRL'
        }],
        payer: {
          email: data.payerEmail,
          name: data.payerName,
          identification: data.payerDocument ? {
            type: data.payerDocument.length === 11 ? 'CPF' : 'CNPJ',
            number: data.payerDocument
          } : undefined,
          phone: data.payerPhone ? {
            number: data.payerPhone
          } : undefined
        },
        external_reference: data.externalReference,
        notification_url: data.notificationUrl,
        back_urls: {
          success: `${process.env.NEXTAUTH_URL}/pagamento/sucesso`,
          failure: `${process.env.NEXTAUTH_URL}/pagamento/erro`,
          pending: `${process.env.NEXTAUTH_URL}/pagamento/pendente`
        },
        auto_return: 'approved',
        metadata: data.metadata
      }

      const response = await fetch(`${apiUrl}/checkout/preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferenceData)
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Erro Mercado Pago:', error)
        return {
          success: false,
          error: 'Erro ao criar pagamento no Mercado Pago'
        }
      }

      const result = await response.json()
      
      // Preferência de checkout retorna ID no formato "userId-uuid"
      // Não usar como paymentId - o paymentId real virá quando o cliente pagar
      console.log('📝 Preferência criada:', result.id, '(não é paymentId)')

      return {
        success: true,
        // NÃO retornar paymentId aqui - preferência não é pagamento
        // O paymentId real será obtido via webhook ou polling
        paymentUrl: environment === 'production' 
          ? result.init_point 
          : result.sandbox_init_point,
        status: 'pending'
      }
    } catch (error) {
      console.error('Erro ao processar Mercado Pago:', error)
      return {
        success: false,
        error: 'Erro ao processar pagamento'
      }
    }
  }

  /**
   * Cria pagamento Pix no Mercado Pago
   */
  private static async createMercadoPagoPix(
    gateway: any,
    data: PaymentData
  ): Promise<PaymentResponse> {
    try {
      // CRÍTICO: Prisma retorna config como STRING, precisa fazer parse
      let config = gateway.config
      if (typeof config === 'string') {
        console.log('⚠️  [PIX] Config é STRING, fazendo parse...')
        config = JSON.parse(config)
      }
      
      const { accessToken } = config
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('💳 [MERCADO PAGO PIX] Criando pagamento')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🔑 Token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NÃO CONFIGURADO')
      console.log('💰 Valor:', data.amount)
      console.log('📧 Email:', data.payerEmail)
      console.log('🆔 Referência:', data.externalReference)
      
      // Verificar se é token de TEST ou PROD
      const isTestToken = accessToken?.startsWith('TEST-') || accessToken?.startsWith('APP_USR-')
      console.log('🧪 Ambiente:', isTestToken ? 'TESTE (Sandbox)' : 'PRODUÇÃO')
      
      const apiUrl = 'https://api.mercadopago.com'

      // Separar primeiro nome e sobrenome
      const nameParts = (data.payerName || 'Cliente').split(' ')
      const firstName = nameParts[0] || 'Cliente'
      const lastName = nameParts.slice(1).join(' ') || 'User'

      const paymentData: any = {
        transaction_amount: Math.round(data.amount * 100) / 100, // Arredondar para 2 casas decimais
        description: data.description,
        payment_method_id: 'pix',
        payer: {
          email: data.payerEmail,
          first_name: firstName,
          last_name: lastName,
          identification: data.payerDocument ? {
            type: data.payerDocument.length === 11 ? 'CPF' : 'CNPJ',
            number: data.payerDocument.replace(/\D/g, '') // Remover formatação
          } : undefined
        },
        external_reference: data.externalReference,
        notification_url: data.notificationUrl,
        metadata: data.metadata
      }
      
      // Adicionar telefone se disponível - ajuda a evitar rejected_high_risk
      if (data.payerPhone) {
        const phoneClean = data.payerPhone.replace(/\D/g, '')
        if (phoneClean.length >= 10) {
          paymentData.payer.phone = {
            area_code: phoneClean.substring(0, 2),
            number: phoneClean.substring(2)
          }
        }
      }

      console.log('📤 Enviando requisição para:', `${apiUrl}/v1/payments`)
      console.log('👤 Payer:', JSON.stringify(paymentData.payer, null, 2))

      const response = await fetch(`${apiUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${data.externalReference}-${Date.now()}`
        },
        body: JSON.stringify(paymentData)
      })

      console.log('📥 Status da resposta:', response.status)

      if (!response.ok) {
        const error = await response.json()
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('❌ [ERRO MERCADO PAGO]')
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('Status:', response.status)
        console.error('Erro completo:', JSON.stringify(error, null, 2))
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        // Mensagens mais específicas por erro
        let errorMessage = 'Erro ao gerar Pix'
        
        if (error.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES') {
          errorMessage = '❌ CREDENCIAIS INVÁLIDAS:\n\n' +
            '1. Verifique se está usando o ACCESS TOKEN correto\n' +
            '2. Para TESTE: use token que começa com TEST-\n' +
            '3. Para PRODUÇÃO: use token que começa com APP_USR-\n' +
            '4. Certifique-se que a conta Mercado Pago está ATIVADA\n' +
            '5. Verifique as permissões do token no painel do Mercado Pago'
        }
        
        return {
          success: false,
          error: errorMessage
        }
      }

      const result = await response.json()

      // Mercado Pago retorna o QR Code em point_of_interaction
      const qrCodeData = result.point_of_interaction?.transaction_data

      return {
        success: true,
        paymentId: result.id.toString(),
        qrCode: qrCodeData?.qr_code || '',
        qrCodeBase64: qrCodeData?.qr_code_base64 || '',
        status: result.status
      }
    } catch (error) {
      console.error('Erro ao gerar Pix:', error)
      return {
        success: false,
        error: 'Erro ao processar Pix'
      }
    }
  }

  /**
   * Cria boleto no Mercado Pago
   */
  private static async createMercadoPagoBoleto(
    gateway: any,
    data: PaymentData
  ): Promise<PaymentResponse> {
    try {
      // CRÍTICO: Prisma retorna config como STRING, precisa fazer parse
      let config = gateway.config
      if (typeof config === 'string') {
        console.log('⚠️  [BOLETO] Config é STRING, fazendo parse...')
        config = JSON.parse(config)
      }
      
      const { accessToken } = config
      const apiUrl = 'https://api.mercadopago.com'

      // Separar primeiro nome e sobrenome
      const nameParts = (data.payerName || 'Cliente').split(' ')
      const firstName = nameParts[0] || 'Cliente'
      const lastName = nameParts.slice(1).join(' ') || 'User'

      // Validar CPF para boleto (obrigatório)
      if (!data.payerDocument) {
        console.error('❌ CPF é obrigatório para boleto')
        return {
          success: false,
          error: 'CPF é obrigatório para gerar boleto'
        }
      }

      // Validar endereço para boleto (obrigatório pelo Mercado Pago)
      if (!data.payerAddress) {
        console.error('❌ Endereço é obrigatório para boleto')
        return {
          success: false,
          error: 'Endereço completo é obrigatório para gerar boleto. Por favor, refaça o pedido com um endereço válido.'
        }
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📄 [MERCADO PAGO] Gerando Boleto')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('💰 Valor:', data.amount)
      console.log('📧 Email:', data.payerEmail)
      console.log('👤 Nome:', firstName, lastName)
      console.log('📋 CPF:', data.payerDocument.slice(0, 3) + '***')
      console.log('📍 Endereço:', `${data.payerAddress.city}/${data.payerAddress.state}`)

      const paymentData = {
        transaction_amount: Math.round(data.amount * 100) / 100,
        description: data.description,
        payment_method_id: 'bolbradesco',
        payer: {
          email: data.payerEmail,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: data.payerDocument.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ',
            number: data.payerDocument.replace(/\D/g, '')
          },
          address: {
            zip_code: data.payerAddress.zipCode.replace(/\D/g, ''),
            street_name: data.payerAddress.street,
            street_number: data.payerAddress.number || 'SN',
            neighborhood: data.payerAddress.neighborhood || 'Centro',
            city: data.payerAddress.city,
            federal_unit: data.payerAddress.state
          }
        },
        external_reference: data.externalReference,
        notification_url: data.notificationUrl,
        metadata: data.metadata
      }

      console.log('📤 Enviando para Mercado Pago...')

      const response = await fetch(`${apiUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `boleto-${data.externalReference}-${Date.now()}`
        },
        body: JSON.stringify(paymentData)
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('❌ [ERRO BOLETO]')
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('Status:', response.status)
        console.error('Erro:', JSON.stringify(result, null, 2))
        return {
          success: false,
          error: result.message || 'Erro ao gerar boleto'
        }
      }

      console.log('✅ Boleto gerado:', result.id)
      console.log('   Status:', result.status)
      console.log('   URL:', result.transaction_details?.external_resource_url || 'N/A')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      return {
        success: true,
        paymentId: result.id.toString(),
        boletoUrl: result.transaction_details?.external_resource_url || '',
        status: result.status
      }
    } catch (error) {
      console.error('Erro ao gerar boleto:', error)
      return {
        success: false,
        error: 'Erro ao processar boleto'
      }
    }
  }

  /**
   * Cria pagamento com cartão de crédito no Mercado Pago
   * Requer token gerado pelo SDK JavaScript no frontend
   */
  private static async createMercadoPagoCreditCard(
    gateway: any,
    data: PaymentData
  ): Promise<PaymentResponse> {
    try {
      // CRÍTICO: Prisma retorna config como STRING, precisa fazer parse
      let config = gateway.config
      if (typeof config === 'string') {
        console.log('⚠️  [CREDIT CARD] Config é STRING, fazendo parse...')
        config = JSON.parse(config)
      }
      
      const { accessToken } = config
      const apiUrl = 'https://api.mercadopago.com'

      if (!data.cardToken) {
        return {
          success: false,
          error: 'Token do cartão não fornecido'
        }
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('💳 [MERCADO PAGO] Pagamento com Cartão')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🔑 Token do cartão:', data.cardToken.substring(0, 20) + '...')
      console.log('💰 Valor:', data.amount)
      console.log('📧 Email:', data.payerEmail)
      console.log('🔢 Parcelas:', data.installments || 1)
      console.log('🏷️  Bandeira:', data.paymentMethodId || 'auto')

      // Separar primeiro nome e sobrenome
      const nameParts = (data.payerName || 'Cliente').split(' ')
      const firstName = nameParts[0] || 'Cliente'
      const lastName = nameParts.slice(1).join(' ') || 'User'

      const paymentData: any = {
        transaction_amount: Math.round(data.amount * 100) / 100,
        token: data.cardToken,
        description: data.description,
        installments: data.installments || 1,
        payment_method_id: data.paymentMethodId,
        payer: {
          email: data.payerEmail,
          first_name: firstName,
          last_name: lastName,
          identification: data.payer?.identification || (data.payerDocument ? {
            type: data.payerDocument.length === 11 ? 'CPF' : 'CNPJ',
            number: data.payerDocument.replace(/\D/g, '')
          } : undefined)
        },
        external_reference: data.externalReference,
        notification_url: data.notificationUrl,
        metadata: data.metadata
      }

      console.log('📤 Enviando pagamento...')

      const response = await fetch(`${apiUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${data.externalReference}-${Date.now()}`
        },
        body: JSON.stringify(paymentData)
      })

      console.log('📥 Status da resposta:', response.status)

      const result = await response.json()

      if (!response.ok) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('❌ [ERRO CARTÃO]')
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('Status:', response.status)
        console.error('Erro:', JSON.stringify(result, null, 2))
        
        return {
          success: false,
          error: result.message || 'Erro ao processar cartão'
        }
      }

      console.log('✅ Pagamento processado:', result.id)
      console.log('   Status:', result.status)
      console.log('   Status Detail:', result.status_detail)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      return {
        success: true,
        paymentId: result.id.toString(),
        status: result.status,
        statusDetail: result.status_detail
      }
    } catch (error) {
      console.error('Erro ao processar cartão:', error)
      return {
        success: false,
        error: 'Erro ao processar pagamento com cartão'
      }
    }
  }

  /**
   * Processa pagamento via PagSeguro
   */
  private static async processPagSeguro(
    gateway: any,
    data: PaymentData
  ): Promise<PaymentResponse> {
    // TODO: Implementar PagSeguro
    return {
      success: false,
      error: 'PagSeguro ainda não implementado'
    }
  }

  /**
   * Processa pagamento via Stripe
   */
  private static async processStripe(
    gateway: any,
    data: PaymentData
  ): Promise<PaymentResponse> {
    // TODO: Implementar Stripe
    return {
      success: false,
      error: 'Stripe ainda não implementado'
    }
  }

  /**
   * Verifica status de um pagamento
   */
  static async checkPaymentStatus(
    paymentId: string,
    gateway: string
  ): Promise<{ status: string; paid: boolean }> {
    try {
      const gatewayConfig = await this.getActiveGateway(gateway)
      
      if (!gatewayConfig) {
        throw new Error('Gateway não encontrado')
      }

      switch (gatewayConfig.gateway) {
        case 'MERCADOPAGO':
          return await this.checkMercadoPagoStatus(gatewayConfig, paymentId)
        
        default:
          return { status: 'unknown', paid: false }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error)
      return { status: 'error', paid: false }
    }
  }

  /**
   * Verifica status no Mercado Pago
   */
  private static async checkMercadoPagoStatus(
    gateway: any,
    paymentId: string
  ): Promise<{ status: string; paid: boolean }> {
    // CRÍTICO: Prisma retorna config como STRING, precisa fazer parse
    let config = gateway.config
    if (typeof config === 'string') {
      console.log('⚠️  [STATUS CHECK] Config é STRING, fazendo parse...')
      config = JSON.parse(config)
    }
    
    const { accessToken, environment } = config

    const apiUrl = environment === 'production'
      ? 'https://api.mercadopago.com'
      : 'https://api.mercadopago.com'

    console.log(`🔍 [CHECK STATUS] Consultando pagamento ${paymentId}...`)
    console.log(`🔑 Token:`, accessToken?.substring(0, 20) + '...')

    const response = await fetch(`${apiUrl}/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    console.log(`📥 Status da resposta:`, response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ Erro da API Mercado Pago:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })
      throw new Error(`Erro ao consultar pagamento: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const payment = await response.json()
    
    console.log(`✅ Pagamento ${paymentId}: status =`, payment.status)
    
    return {
      status: payment.status,
      paid: payment.status === 'approved'
    }
  }
}
