/**
 * Serviço de envio de mensagens via WhatsApp
 * Suporta múltiplos provedores: Evolution API, Z-API, Cloud API (Meta)
 */

import { prisma } from './prisma'

export interface WhatsAppConfig {
  provider: 'evolution' | 'zapi' | 'cloud' | 'disabled'
  apiUrl?: string      // URL da API (Evolution/Z-API)
  apiKey?: string      // API Key ou Token
  instanceId?: string  // ID da instância (Evolution/Z-API)
  phoneNumberId?: string // ID do número (Cloud API)
}

export interface SendMessageOptions {
  to: string           // Número do destinatário (5511999999999)
  message: string      // Mensagem de texto
  type?: 'text' | 'document' | 'image'
  mediaUrl?: string    // URL do arquivo (para document/image)
  fileName?: string    // Nome do arquivo
}

export interface SendMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Serviço de WhatsApp
 */
export class WhatsAppService {
  
  /**
   * Busca configuração do WhatsApp no banco
   */
  static async getConfig(): Promise<WhatsAppConfig | null> {
    try {
      const configs = await prisma.companySettings.findMany({
        where: {
          key: {
            startsWith: 'whatsapp.'
          }
        }
      })

      if (configs.length === 0) {
        return null
      }

      const configMap: Record<string, string> = {}
      configs.forEach(c => {
        configMap[c.key] = c.value
      })

      const provider = configMap['whatsapp.provider'] as WhatsAppConfig['provider']
      
      if (!provider || provider === 'disabled') {
        return null
      }

      return {
        provider,
        apiUrl: configMap['whatsapp.apiUrl'] || '',
        apiKey: configMap['whatsapp.apiKey'] || '',
        instanceId: configMap['whatsapp.instanceId'] || '',
        phoneNumberId: configMap['whatsapp.phoneNumberId'] || ''
      }
    } catch (error) {
      console.error('Erro ao buscar config do WhatsApp:', error)
      return null
    }
  }

  /**
   * Formata número de telefone para padrão internacional
   */
  static formatPhone(phone: string): string {
    // Remove tudo que não é número
    let cleaned = phone.replace(/\D/g, '')
    
    // Se não começar com 55, adiciona
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned
    }
    
    return cleaned
  }

  /**
   * Envia mensagem via WhatsApp
   */
  static async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const config = await this.getConfig()

    if (!config) {
      console.log('⚠️ WhatsApp não configurado, mensagem não enviada')
      return { success: false, error: 'WhatsApp não configurado' }
    }

    const formattedPhone = this.formatPhone(options.to)
    
    console.log(`📱 Enviando WhatsApp para ${formattedPhone}...`)

    switch (config.provider) {
      case 'evolution':
        return await this.sendViaEvolution(config, formattedPhone, options)
      
      case 'zapi':
        return await this.sendViaZApi(config, formattedPhone, options)
      
      case 'cloud':
        return await this.sendViaCloudApi(config, formattedPhone, options)
      
      default:
        return { success: false, error: 'Provedor não suportado' }
    }
  }

  /**
   * Envia via Evolution API
   * Docs: https://doc.evolution-api.com/
   */
  private static async sendViaEvolution(
    config: WhatsAppConfig,
    phone: string,
    options: SendMessageOptions
  ): Promise<SendMessageResult> {
    try {
      const baseUrl = config.apiUrl?.replace(/\/$/, '')
      const endpoint = options.type === 'text' || !options.type
        ? `${baseUrl}/message/sendText/${config.instanceId}`
        : `${baseUrl}/message/sendMedia/${config.instanceId}`

      const body: any = {
        number: phone,
        options: {
          delay: 1200,
          presence: 'composing'
        }
      }

      if (options.type === 'text' || !options.type) {
        body.textMessage = { text: options.message }
      } else {
        body.mediaMessage = {
          mediatype: options.type,
          caption: options.message,
          media: options.mediaUrl,
          fileName: options.fileName
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.apiKey || ''
        },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (response.ok) {
        console.log('✅ WhatsApp enviado via Evolution:', result.key?.id)
        return { success: true, messageId: result.key?.id }
      } else {
        console.error('❌ Erro Evolution:', result)
        return { success: false, error: result.message || 'Erro ao enviar' }
      }
    } catch (error: any) {
      console.error('❌ Erro ao enviar via Evolution:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Envia via Z-API
   * Docs: https://developer.z-api.io/
   */
  private static async sendViaZApi(
    config: WhatsAppConfig,
    phone: string,
    options: SendMessageOptions
  ): Promise<SendMessageResult> {
    try {
      const baseUrl = `https://api.z-api.io/instances/${config.instanceId}/token/${config.apiKey}`
      
      let endpoint: string
      let body: any

      if (options.type === 'text' || !options.type) {
        endpoint = `${baseUrl}/send-text`
        body = {
          phone,
          message: options.message
        }
      } else if (options.type === 'document') {
        endpoint = `${baseUrl}/send-document`
        body = {
          phone,
          document: options.mediaUrl,
          fileName: options.fileName,
          caption: options.message
        }
      } else {
        endpoint = `${baseUrl}/send-image`
        body = {
          phone,
          image: options.mediaUrl,
          caption: options.message
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': config.apiKey || ''
        },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (result.zapiMessageId) {
        console.log('✅ WhatsApp enviado via Z-API:', result.zapiMessageId)
        return { success: true, messageId: result.zapiMessageId }
      } else {
        console.error('❌ Erro Z-API:', result)
        return { success: false, error: result.message || 'Erro ao enviar' }
      }
    } catch (error: any) {
      console.error('❌ Erro ao enviar via Z-API:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Envia via WhatsApp Cloud API (Meta)
   * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
   */
  private static async sendViaCloudApi(
    config: WhatsAppConfig,
    phone: string,
    options: SendMessageOptions
  ): Promise<SendMessageResult> {
    try {
      const endpoint = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`

      const body: any = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: options.message }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (result.messages?.[0]?.id) {
        console.log('✅ WhatsApp enviado via Cloud API:', result.messages[0].id)
        return { success: true, messageId: result.messages[0].id }
      } else {
        console.error('❌ Erro Cloud API:', result)
        return { success: false, error: result.error?.message || 'Erro ao enviar' }
      }
    } catch (error: any) {
      console.error('❌ Erro ao enviar via Cloud API:', error)
      return { success: false, error: error.message }
    }
  }

  // ============================================
  // MENSAGENS PRÉ-FORMATADAS
  // ============================================

  /**
   * Envia código PIX para o cliente
   */
  static async sendPixCode(phone: string, data: {
    orderNumber: string
    pixCode: string
    amount: number
    expiresIn?: string
  }): Promise<SendMessageResult> {
    const message = `🛒 *MYDSHOP - Pagamento PIX*

Pedido: *#${data.orderNumber}*
Valor: *R$ ${data.amount.toFixed(2)}*

📱 *Copie o código PIX abaixo:*

\`\`\`
${data.pixCode}
\`\`\`

⏰ ${data.expiresIn || 'O código expira em 30 minutos'}

Após o pagamento, você receberá a confirmação automaticamente.

Obrigado pela preferência! 🧡`

    return this.sendMessage({ to: phone, message })
  }

  /**
   * Envia link do boleto para o cliente
   */
  static async sendBoletoLink(phone: string, data: {
    orderNumber: string
    boletoUrl: string
    amount: number
    dueDate?: string
  }): Promise<SendMessageResult> {
    const message = `🛒 *MYDSHOP - Boleto Gerado*

Pedido: *#${data.orderNumber}*
Valor: *R$ ${data.amount.toFixed(2)}*
${data.dueDate ? `Vencimento: *${data.dueDate}*` : ''}

📄 *Clique no link para baixar o boleto:*
${data.boletoUrl}

⚠️ Importante:
• O boleto pode levar até 3 dias úteis para compensar
• Após o pagamento, você receberá a confirmação

Obrigado pela preferência! 🧡`

    return this.sendMessage({ to: phone, message })
  }

  /**
   * Envia confirmação de pagamento aprovado
   */
  static async sendPaymentApproved(phone: string, data: {
    orderNumber: string
    amount: number
    paymentMethod: string
  }): Promise<SendMessageResult> {
    const methodNames: Record<string, string> = {
      'pix': 'PIX',
      'boleto': 'Boleto',
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito'
    }

    const message = `✅ *MYDSHOP - Pagamento Confirmado!*

Pedido: *#${data.orderNumber}*
Valor: *R$ ${data.amount.toFixed(2)}*
Forma de pagamento: *${methodNames[data.paymentMethod] || data.paymentMethod}*

🎉 Seu pedido está sendo preparado!

Você receberá o código de rastreio assim que for enviado.

Obrigado pela compra! 🧡`

    return this.sendMessage({ to: phone, message })
  }

  /**
   * Envia código de rastreio
   */
  static async sendTrackingCode(phone: string, data: {
    orderNumber: string
    trackingCode: string
    carrier?: string
  }): Promise<SendMessageResult> {
    const message = `📦 *MYDSHOP - Pedido Enviado!*

Pedido: *#${data.orderNumber}*
${data.carrier ? `Transportadora: *${data.carrier}*` : ''}

🔍 *Código de rastreio:*
\`${data.trackingCode}\`

Acompanhe em: https://www.linkcorreto.com.br/${data.trackingCode}

Qualquer dúvida, estamos à disposição! 🧡`

    return this.sendMessage({ to: phone, message })
  }
}
