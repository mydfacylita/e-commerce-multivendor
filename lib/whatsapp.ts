/**
 * WhatsApp Business API Integration
 * Meta Cloud API Integration for MYDSHOP
 */

import { prisma } from './prisma'

interface WhatsAppConfig {
  provider: 'meta' | 'disabled'
  enabled: boolean
  phoneNumberId: string | null
  accessToken: string | null
  businessId: string | null
  verifyToken: string | null
}

interface SendMessageParams {
  to: string
  message: string
  template?: string
  templateParams?: string[]
  logType?: string      // tipo descritivo para o log ex: 'pix', 'boleto'
  logOrderId?: string   // orderId para rastreamento
}

interface SendMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

// Formatar número de telefone para formato WhatsApp (apenas números com código do país)
function formatPhoneNumber(phone: string): string {
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '')
  
  // Se começa com 0, remove
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  
  // Se não tem código do país (55), adiciona
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned
  }
  
  return cleaned
}

export class WhatsAppService {
  private static readonly API_VERSION = 'v18.0'
  private static readonly BASE_URL = 'https://graph.facebook.com'

  /**
   * Busca configurações do WhatsApp do banco de dados
   */
  static async getConfig(): Promise<WhatsAppConfig> {
    try {
      const settings = await prisma.systemConfig.findMany({
        where: {
          key: {
            in: [
              'WHATSAPP_ENABLED',
              'WHATSAPP_PHONE_NUMBER_ID',
              'WHATSAPP_ACCESS_TOKEN',
              'WHATSAPP_BUSINESS_ID',
              'WHATSAPP_VERIFY_TOKEN'
            ]
          }
        }
      })

      const configMap = new Map(settings.map(s => [s.key, s.value]))

      return {
        provider: configMap.get('WHATSAPP_ENABLED') === 'true' ? 'meta' : 'disabled',
        enabled: configMap.get('WHATSAPP_ENABLED') === 'true',
        phoneNumberId: configMap.get('WHATSAPP_PHONE_NUMBER_ID') || null,
        accessToken: configMap.get('WHATSAPP_ACCESS_TOKEN') || null,
        businessId: configMap.get('WHATSAPP_BUSINESS_ID') || null,
        verifyToken: configMap.get('WHATSAPP_VERIFY_TOKEN') || null
      }
    } catch (error) {
      console.error('Erro ao buscar config WhatsApp:', error)
      return {
        provider: 'disabled',
        enabled: false,
        phoneNumberId: null,
        accessToken: null,
        businessId: null,
        verifyToken: null
      }
    }
  }

  /**
   * Salva configurações do WhatsApp no banco de dados
   */
  static async saveConfig(config: Partial<WhatsAppConfig>): Promise<boolean> {
    try {
      const updates = [
        { key: 'WHATSAPP_ENABLED', value: config.enabled ? 'true' : 'false', label: 'WhatsApp Habilitado', category: 'whatsapp' },
        { key: 'WHATSAPP_PHONE_NUMBER_ID', value: config.phoneNumberId || '', label: 'Phone Number ID', category: 'whatsapp' },
        { key: 'WHATSAPP_ACCESS_TOKEN', value: config.accessToken || '', label: 'Access Token', category: 'whatsapp' },
        { key: 'WHATSAPP_BUSINESS_ID', value: config.businessId || '', label: 'Business ID', category: 'whatsapp' },
        { key: 'WHATSAPP_VERIFY_TOKEN', value: config.verifyToken || '', label: 'Verify Token', category: 'whatsapp' }
      ]

      for (const update of updates) {
        if (update.value !== undefined) {
          await prisma.systemConfig.upsert({
            where: { key: update.key },
            update: { value: update.value },
            create: { 
              key: update.key, 
              value: update.value,
              label: update.label,
              category: update.category
            }
          })
        }
      }

      return true
    } catch (error) {
      console.error('Erro ao salvar config WhatsApp:', error)
      return false
    }
  }

  /**
   * Persiste log de notificação WhatsApp no banco
   */
  private static async logNotification(params: {
    to: string
    type: string
    body?: string
    orderId?: string
    status: string
    error?: string
    messageId?: string
    metadata?: Record<string, any>
  }) {
    try {
      await prisma.notificationLog.create({
        data: {
          channel: 'whatsapp',
          to: params.to,
          type: params.type,
          body: params.body,
          orderId: params.orderId,
          status: params.status,
          error: params.error,
          messageId: params.messageId,
          metadata: params.metadata ? JSON.stringify(params.metadata) : undefined
        }
      })
    } catch (err) {
      console.error('[WhatsApp] Falha ao gravar log:', err)
    }
  }

  /**
   * Envia mensagem de texto via WhatsApp
   */
  static async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const formattedPhone = formatPhoneNumber(params.to)
    const logType = params.logType || 'text'
    try {
      const config = await this.getConfig()

      if (!config.enabled || !config.phoneNumberId || !config.accessToken) {
        const result = { success: false, error: 'WhatsApp não configurado' }
        await this.logNotification({ to: formattedPhone, type: logType, body: params.message?.slice(0, 200), orderId: params.logOrderId, status: 'failed', error: result.error })
        return result
      }
      
      const url = `${this.BASE_URL}/${this.API_VERSION}/${config.phoneNumberId}/messages`

      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: params.message
        }
      }

      console.log(`📤 Enviando WhatsApp para ${formattedPhone}...`)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Erro WhatsApp API:', data)
        const err = data.error?.message || 'Erro ao enviar mensagem'
        await this.logNotification({ to: formattedPhone, type: logType, body: params.message?.slice(0, 200), orderId: params.logOrderId, status: 'failed', error: err })
        return { success: false, error: err }
      }

      const msgId = data.messages?.[0]?.id
      console.log('✅ Mensagem WhatsApp enviada:', msgId)
      await this.logNotification({ to: formattedPhone, type: logType, body: params.message?.slice(0, 200), orderId: params.logOrderId, status: 'sent', messageId: msgId })

      return { success: true, messageId: msgId }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('❌ Erro ao enviar WhatsApp:', error)
      await this.logNotification({ to: formattedPhone, type: logType, body: params.message?.slice(0, 200), orderId: params.logOrderId, status: 'failed', error: errMsg })
      return { success: false, error: errMsg }
    }
  }

  /**
   * Envia mensagem usando template
   */
  static async sendTemplate(
    to: string, 
    templateName: string, 
    language: string = 'pt_BR',
    components?: any[],
    logMeta?: { orderId?: string; reference?: string }
  ): Promise<SendMessageResult> {
    const formattedPhone = formatPhoneNumber(to)
    try {
      const config = await this.getConfig()

      if (!config.enabled || !config.phoneNumberId || !config.accessToken) {
        const result = { success: false, error: 'WhatsApp não configurado' }
        await this.logNotification({ to: formattedPhone, type: templateName, body: `template:${templateName}`, orderId: logMeta?.orderId, status: 'failed', error: result.error })
        return result
      }
      
      const url = `${this.BASE_URL}/${this.API_VERSION}/${config.phoneNumberId}/messages`

      const body: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          }
        }
      }

      if (components) {
        body.template.components = components
      }

      console.log(`📤 Enviando template WhatsApp para ${formattedPhone}...`)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Erro WhatsApp API:', data)
        const err = data.error?.message || 'Erro ao enviar template'
        await this.logNotification({ to: formattedPhone, type: templateName, body: `template:${templateName}`, orderId: logMeta?.orderId, status: 'failed', error: err, metadata: { apiError: data.error } })
        return { success: false, error: err }
      }

      const msgId = data.messages?.[0]?.id
      console.log('✅ Template WhatsApp enviado:', msgId)
      await this.logNotification({ to: formattedPhone, type: templateName, body: `template:${templateName}`, orderId: logMeta?.orderId, status: 'sent', messageId: msgId })

      return { success: true, messageId: msgId }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erro desconhecido'
      console.error('❌ Erro ao enviar template WhatsApp:', error)
      await this.logNotification({ to: formattedPhone, type: templateName, body: `template:${templateName}`, orderId: logMeta?.orderId, status: 'failed', error: errMsg })
      return { success: false, error: errMsg }
    }
  }

  /**
   * Envia código PIX para pagamento
   */
  static async sendPixCode(
    phone: string, 
    data: { 
      orderId?: string
      orderNumber?: string
      pixCode: string
      pixQrCodeUrl?: string
      total?: number
      amount?: number
      expiresAt?: Date
      expiresIn?: string
    }
  ): Promise<SendMessageResult> {
    const orderRef = data.orderNumber || data.orderId || 'N/A'
    const valor = data.total || data.amount || 0
    
    const message = `*MYDSHOP - Pagamento PIX*

Pedido: #${orderRef}
Valor: R$ ${valor.toFixed(2)}

*Código PIX (Copia e Cola):*
\`\`\`
${data.pixCode}
\`\`\`

${data.expiresAt ? `Válido até: ${new Date(data.expiresAt).toLocaleString('pt-BR')}` : ''}
${data.expiresIn ? data.expiresIn : ''}

Após o pagamento, você receberá a confirmação automaticamente.

Obrigado por comprar na MYDSHOP.`

    return this.sendMessage({
      to: phone,
      message,
      logType: 'pix',
      logOrderId: data.orderId
    })
  }

  /**
   * Envia link do boleto
   */
  static async sendBoletoLink(
    phone: string,
    data: {
      orderId?: string
      orderNumber?: string
      boletoUrl: string
      barCode?: string
      total?: number
      amount?: number
      dueDate?: Date | string
    }
  ): Promise<SendMessageResult> {
    const orderRef = data.orderNumber || data.orderId || 'N/A'
    const valor = data.total || data.amount || 0
    const dueDateStr = data.dueDate instanceof Date 
      ? data.dueDate.toLocaleDateString('pt-BR')
      : data.dueDate || ''
    
    const message = `*MYDSHOP - Boleto Bancário*

Pedido: #${orderRef}
Valor: R$ ${valor.toFixed(2)}
${dueDateStr ? `Vencimento: ${dueDateStr}` : ''}

*Link do Boleto:*
${data.boletoUrl}

${data.barCode ? `*Código de Barras:*
\`\`\`
${data.barCode}
\`\`\`` : ''}

Após o pagamento, pode levar até 3 dias úteis para confirmação.

Obrigado por comprar na MYDSHOP.`

    return this.sendMessage({
      to: phone,
      message,
      logType: 'boleto',
      logOrderId: data.orderId
    })
  }

  /**
   * Envia notificação de pedido confirmado
   */
  static async sendOrderConfirmation(
    phone: string,
    data: {
      orderId: string
      buyerName: string
      total: number
      itemsCount: number
      estimatedDelivery?: string
    }
  ): Promise<SendMessageResult> {
    return this.sendTemplate(phone, 'mydshop_pedido_confirmado', 'pt_BR', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.buyerName },
          { type: 'text', text: 'compra' },
          { type: 'text', text: data.orderId },
          { type: 'text', text: `${data.itemsCount} ${data.itemsCount === 1 ? 'item' : 'itens'}` },
          { type: 'text', text: data.estimatedDelivery || 'Em breve' }
        ]
      }
    ], { orderId: data.orderId })
  }

  /**
   * Envia notificação de pedido enviado
   */
  static async sendOrderShipped(
    phone: string,
    data: {
      orderId: string
      buyerName: string
      trackingCode?: string
      carrier?: string
      estimatedDelivery?: string
    }
  ): Promise<SendMessageResult> {
    return this.sendTemplate(phone, 'envio_de_pedido', 'pt_BR', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.buyerName },
          { type: 'text', text: data.orderId },
          { type: 'text', text: data.trackingCode || 'N/A' },
          { type: 'text', text: data.estimatedDelivery || 'Em breve' }
        ]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [
          { type: 'text', text: data.orderId }
        ]
      }
    ], { orderId: data.orderId })
  }

  /**
   * Envia notificação de pedido entregue
   */
  static async sendOrderDelivered(
    phone: string,
    data: {
      orderId: string
      buyerName: string
    }
  ): Promise<SendMessageResult> {
    const message = `*Pedido Entregue*

Olá, ${data.buyerName}.

Seu pedido #${data.orderId} foi entregue.

Esperamos que você goste dos seus produtos.

Se tiver alguma dúvida ou precisar de ajuda, estamos à disposição.

Avalie sua compra em: https://mydshop.com.br/avaliar/${data.orderId}

Obrigado por comprar na MYDSHOP.`

    return this.sendMessage({
      to: phone,
      message,
      logType: 'order_delivered',
      logOrderId: data.orderId
    })
  }

  /**
   * Envia notificação de pedido cancelado
   */
  static async sendOrderCancelled(
    phone: string,
    data: {
      orderId: string
      buyerName: string
    }
  ): Promise<SendMessageResult> {
    return this.sendTemplate(phone, 'cancelamento_pedido', 'pt_BR', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.buyerName },
          { type: 'text', text: data.orderId }
        ]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [
          { type: 'text', text: data.orderId }
        ]
      }
    ], { orderId: data.orderId })
  }
}

// Exports para compatibilidade
export const sendWhatsAppMessage = WhatsAppService.sendMessage.bind(WhatsAppService)
export const getWhatsAppConfig = WhatsAppService.getConfig.bind(WhatsAppService)
