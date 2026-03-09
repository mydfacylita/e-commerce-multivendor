import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { formatOrderNumber } from '@/lib/order'

/**
 * Templates de email disponíveis
 */
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  ORDER_CONFIRMED: 'order_confirmed',
  PAYMENT_RECEIVED: 'payment_received',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_AWAITING_SHIPMENT: 'order_awaiting_shipment',
  CART_ABANDONED: 'cart_abandoned',
  PASSWORD_RESET: 'password_reset',
  SELLER_APPROVED: 'seller_approved',
  SELLER_REJECTED: 'seller_rejected',
  AFFILIATE_APPROVED: 'affiliate_approved',
  AFFILIATE_REJECTED: 'affiliate_rejected',
  WISHLIST_PRICE_DROP: 'wishlist_price_drop',
} as const

type TemplateType = typeof EMAIL_TEMPLATES[keyof typeof EMAIL_TEMPLATES]

interface EmailTemplateData {
  [key: string]: string | number | undefined
}

/**
 * Templates HTML dos emails
 */
const templates: Record<TemplateType, (data: EmailTemplateData) => { subject: string; html: string }> = {
  welcome: (data) => ({
    subject: `Bem-vindo(a) à ${data.storeName || 'nossa loja'}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Bem-vindo(a)!</h1>
        <p>Olá <strong>${data.customerName}</strong>,</p>
        <p>Sua conta foi criada com sucesso! Agora você pode aproveitar todas as vantagens de comprar conosco.</p>
        <p>Obrigado por se cadastrar!</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Este é um email automático, por favor não responda.</p>
      </div>
    `
  }),

  order_confirmed: (data) => {
    const orderNumber = formatOrderNumber(String(data.orderId));
    return {
      subject: `Pedido ${orderNumber} Confirmado`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Pedido Confirmado! 🎉</h1>
          <p>Olá <strong>${data.customerName}</strong>,</p>
          <p>Seu pedido <strong>${orderNumber}</strong> foi confirmado com sucesso!</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Total:</strong> R$ ${data.orderTotal}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> Aguardando pagamento</p>
          </div>
          <p>Você receberá uma notificação assim que o pagamento for aprovado.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Este é um email automático, por favor não responda.</p>
        </div>
      `
    };
  },

  payment_received: (data) => {
    const orderNumber = formatOrderNumber(String(data.orderId));
    return {
      subject: `Pagamento Aprovado - Pedido ${orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981;">Pagamento Aprovado! ✅</h1>
          <p>Olá <strong>${data.customerName}</strong>,</p>
          <p>O pagamento do seu pedido <strong>${orderNumber}</strong> foi aprovado!</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Valor Pago:</strong> R$ ${data.orderTotal}</p>
            <p style="margin: 5px 0;"><strong>Forma de Pagamento:</strong> ${data.paymentMethod}</p>
          </div>
          <p>Seu pedido já está sendo processado e será enviado em breve.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Este é um email automático, por favor não responda.</p>
        </div>
      `
    };
  },

  order_shipped: (data) => {
    const orderNumber = formatOrderNumber(String(data.orderId));
    return {
      subject: `Pedido ${orderNumber} Enviado`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Pedido Enviado! 📦</h1>
          <p>Olá <strong>${data.customerName}</strong>,</p>
          <p>Seu pedido <strong>${orderNumber}</strong> foi enviado!</p>
          ${data.trackingCode ? `
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Código de Rastreamento:</strong></p>
              <p style="font-size: 18px; font-family: monospace; color: #2563eb;">${data.trackingCode}</p>
            </div>
            <p>Você pode acompanhar a entrega através do código acima nos Correios.</p>
          ` : '<p>Você receberá o código de rastreamento em breve.</p>'}
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Este é um email automático, por favor não responda.</p>
        </div>
      `
    };
  },

  order_delivered: (data) => {
    const orderNumber = formatOrderNumber(String(data.orderId));
    return {
      subject: `Pedido ${orderNumber} Entregue`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981;">Pedido Entregue! 🎉</h1>
          <p>Olá <strong>${data.customerName}</strong>,</p>
          <p>Seu pedido <strong>${orderNumber}</strong> foi entregue com sucesso!</p>
          <p>Esperamos que você aproveite sua compra. Se tiver qualquer problema, entre em contato conosco.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;">⭐ <strong>Avalie sua experiência!</strong></p>
            <p style="margin: 5px 0; font-size: 14px;">Sua opinião é muito importante para nós.</p>
          </div>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Este é um email automático, por favor não responda.</p>
        </div>
      `
    };
  },

  order_cancelled: (data) => {
    const orderNumber = formatOrderNumber(String(data.orderId));
    return {
      subject: `Pedido ${orderNumber} Cancelado`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ef4444;">Pedido Cancelado</h1>
          <p>Olá <strong>${data.customerName}</strong>,</p>
          <p>Seu pedido <strong>${orderNumber}</strong> foi cancelado.</p>
          ${data.cancelReason ? `
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 0; color: #991b1b;"><strong>Motivo:</strong> ${data.cancelReason}</p>
            </div>
          ` : ''}
          <p>Se o pagamento já foi processado, o estorno será realizado automaticamente.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Este é um email automático, por favor não responda.</p>
        </div>
      `
    };
  },

  order_awaiting_shipment: (data) => {
    const orderNumber = formatOrderNumber(String(data.orderId));
    return {
      subject: `Pedido ${orderNumber} Aguardando Envio`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f59e0b;">Pedido Pronto para Envio! 📦</h1>
          <p>Olá <strong>${data.customerName}</strong>,</p>
          <p>Seu pedido <strong>${orderNumber}</strong> está pronto e será enviado em breve!</p>
          <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0;">⏱️ Estamos preparando seu pedido para envio.</p>
            <p style="margin: 5px 0; font-size: 14px;">Você receberá o código de rastreamento assim que for despachado.</p>
          </div>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Este é um email automático, por favor não responda.</p>
        </div>
      `
    };
  },

  cart_abandoned: (data) => ({
    subject: `Você deixou ${data.itemsCount} ${Number(data.itemsCount) === 1 ? 'item' : 'itens'} no carrinho!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Não se esqueça! 🛒</h1>
        <p>Olá <strong>${data.customerName}</strong>,</p>
        <p>Percebemos que você deixou <strong>${data.itemsCount} ${Number(data.itemsCount) === 1 ? 'item' : 'itens'}</strong> no seu carrinho.</p>
        <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 0;">🎁 <strong>Complete sua compra agora!</strong></p>
          <p style="margin: 5px 0; font-size: 14px;">Seus produtos ainda estão disponíveis.</p>
        </div>
        <a href="${data.cartUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 10px 0;">
          Voltar ao Carrinho
        </a>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Este é um email automático, por favor não responda.</p>
      </div>
    `
  }),

  seller_approved: (data) => ({
    subject: `✅ Cadastro Aprovado — Bem-vindo à MYDSHOP!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f9fafb;">
        <div style="background: #1d4ed8; padding: 32px 24px; text-align: center;">
          <img src="https://mydshop.com.br/logo-animated-white.svg" alt="MYDSHOP" style="height: 40px; margin-bottom: 12px;" />
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Cadastro Aprovado! 🎉</h1>
        </div>
        <div style="background: #fff; padding: 32px 24px;">
          <p style="font-size: 16px; color: #374151;">Olá, <strong>${data.sellerName}</strong>!</p>
          <p style="color: #374151;">Ótima notícia! Sua loja <strong>${data.storeName}</strong> foi aprovada na plataforma <strong>MYDSHOP</strong> e já está pronta para começar a vender.</p>
          <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; border-radius: 4px; margin: 24px 0;">
            <p style="margin: 0; color: #15803d; font-weight: bold;">✅ Sua conta está aprovada e ativa!</p>
          </div>
          <p style="color: #374151;"><strong>Próximo passo:</strong> escolha o plano ideal para o seu negócio e comece a cadastrar seus produtos.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://mydshop.com.br/vendedor/planos" style="background: #1d4ed8; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">👉 Escolher Meu Plano</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Se você tiver dúvidas, acesse seu painel em <a href="https://mydshop.com.br/vendedor" style="color: #1d4ed8;">mydshop.com.br/vendedor</a> ou entre em contato pelo nosso WhatsApp.</p>
        </div>
        <div style="background: #f3f4f6; padding: 16px 24px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">© MYDSHOP — Este é um e-mail automático, por favor não responda.</p>
        </div>
      </div>
    `
  }),

  seller_rejected: (data) => ({
    subject: `Sobre seu cadastro na MYDSHOP`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f9fafb;">
        <div style="background: #1d4ed8; padding: 32px 24px; text-align: center;">
          <img src="https://mydshop.com.br/logo-animated-white.svg" alt="MYDSHOP" style="height: 40px; margin-bottom: 12px;" />
        </div>
        <div style="background: #fff; padding: 32px 24px;">
          <p style="font-size: 16px; color: #374151;">Olá, <strong>${data.sellerName}</strong>!</p>
          <p style="color: #374151;">Analisamos seu cadastro da loja <strong>${data.storeName}</strong> e, no momento, não foi possível aprová-lo.</p>
          ${data.reason ? `<div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 4px; margin: 24px 0;"><p style="margin: 0; color: #991b1b;"><strong>Motivo:</strong> ${data.reason}</p></div>` : ''}
          <p style="color: #374151;">Se tiver dúvidas ou quiser enviar novos documentos, entre em contato conosco pelo WhatsApp ou e-mail.</p>
        </div>
        <div style="background: #f3f4f6; padding: 16px 24px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">© MYDSHOP — Este é um e-mail automático, por favor não responda.</p>
        </div>
      </div>
    `
  }),

  affiliate_approved: (data) => ({
    subject: `🎉 Parabéns! Você foi aprovado(a) como Afiliado(a) MYDSHOP`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f9fafb;">
        <div style="background: #16a34a; padding: 32px 24px; text-align: center;">
          <img src="https://mydshop.com.br/logo-animated-white.svg" alt="MYDSHOP" style="height: 40px; margin-bottom: 12px;" />
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Afiliado Aprovado! 🎉</h1>
        </div>
        <div style="background: #fff; padding: 32px 24px;">
          <p style="font-size: 16px; color: #374151;">Olá, <strong>${data.affiliateName}</strong>!</p>
          <p style="color: #374151;">Seu cadastro como afiliado(a) da <strong>MYDSHOP</strong> foi aprovado! A partir de agora você pode começar a divulgar seus links e ganhar comissões.</p>
          <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; border-radius: 4px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; color: #15803d; font-weight: bold;">✅ Conta ativa!</p>
            <p style="margin: 0; color: #374151;"><strong>Seu código de afiliado:</strong> <span style="font-family: monospace; font-size: 18px; color: #1d4ed8;">${data.affiliateCode}</span></p>
            <p style="margin: 8px 0 0 0; color: #374151;"><strong>Comissão:</strong> ${data.commissionRate}% por venda confirmada</p>
          </div>
          <p style="color: #374151;"><strong>Seu link de afiliado:</strong></p>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace; word-break: break-all; color: #1d4ed8;">
            https://www.mydshop.com.br?ref=${data.affiliateCode}
          </div>
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://www.mydshop.com.br/afiliado/dashboard" style="background: #16a34a; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">👉 Acessar Meu Painel</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Dúvidas? Entre em contato pelo nosso WhatsApp ou acesse seu painel em <a href="https://mydshop.com.br/afiliado" style="color: #16a34a;">mydshop.com.br/afiliado</a>.</p>
        </div>
        <div style="background: #f3f4f6; padding: 16px 24px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">© MYDSHOP — Este é um e-mail automático, por favor não responda.</p>
        </div>
      </div>
    `
  }),

  affiliate_rejected: (data) => ({
    subject: `Sobre seu cadastro de afiliado na MYDSHOP`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f9fafb;">
        <div style="background: #1d4ed8; padding: 32px 24px; text-align: center;">
          <img src="https://mydshop.com.br/logo-animated-white.svg" alt="MYDSHOP" style="height: 40px; margin-bottom: 12px;" />
          <h1 style="color: #fff; margin: 0; font-size: 22px;">Retorno sobre seu Cadastro de Afiliado</h1>
        </div>
        <div style="background: #fff; padding: 32px 24px;">
          <p style="font-size: 16px; color: #374151;">Olá, <strong>${data.affiliateName}</strong>!</p>
          <p style="color: #374151;">Analisamos seu cadastro como afiliado(a) da <strong>MYDSHOP</strong> e, no momento, não foi possível aprovar sua solicitação.</p>
          ${data.reason ? `<div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 4px; margin: 24px 0;"><p style="margin: 0; color: #991b1b;"><strong>Motivo:</strong> ${data.reason}</p></div>` : ''}
          <p style="color: #374151;">Se tiver dúvidas ou quiser enviar mais informações, entre em contato conosco pelo WhatsApp ou e-mail de suporte.</p>
          <p style="color: #374151;">Você pode tentar se cadastrar novamente após regularizar as pendências indicadas.</p>
        </div>
        <div style="background: #f3f4f6; padding: 16px 24px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">© MYDSHOP — Este é um e-mail automático, por favor não responda.</p>
        </div>
      </div>
    `
  }),

  password_reset: (data) => ({
    subject: 'Recuperação de Senha',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Recuperação de Senha</h1>
        <p>Olá,</p>
        <p>Você solicitou a recuperação de senha da sua conta. Clique no botão abaixo para definir uma nova senha:</p>
        <a href="${data.resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">
          Redefinir Senha
        </a>
        <p>Se você não solicitou isso, ignore este e-mail.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">© MYDSHOP — Este é um e-mail automático, por favor não responda.</p>
      </div>
    `
  }),

  wishlist_price_drop: (data) => ({
    subject: `📉 O preço baixou! O item que você salvou está em oferta!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f9fafb;">
        <div style="background: #2563eb; padding: 32px 24px; text-align: center;">
          <img src="https://mydshop.com.br/logo-animated-white.svg" alt="MYDSHOP" style="height: 40px; margin-bottom: 12px;" />
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Boas Notícias! 📉</h1>
        </div>
        <div style="background: #fff; padding: 32px 24px;">
          <p style="font-size: 16px; color: #374151;">Olá, <strong>${data.customerName}</strong>!</p>
          <p style="color: #374151;">Temos uma ótima notícia: o produto que você salvou na sua <strong>Lista de Desejos</strong> acaba de baixar de preço!</p>
          
          <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 24px 0; display: flex; align-items: center; gap: 16px;">
            <div style="flex: 1;">
              <h3 style="margin: 0; color: #111827; font-size: 18px;">${data.productName}</h3>
              <p style="margin: 8px 0 0 0; color: #6b7280; text-decoration: line-through; font-size: 14px;">De: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(data.oldPrice))}</p>
              <p style="margin: 4px 0 0 0; color: #059669; font-size: 22px; font-weight: bold;">Por: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(data.newPrice))}</p>
            </div>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${data.productUrl}" style="background: #2563eb; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">🛒 Aproveitar agora</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">Aproveite logo, pois o estoque pode acabar rápido!</p>
        </div>
        <div style="background: #f3f4f6; padding: 16px 24px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">© MYDSHOP — Este é um e-mail automático enviado porque você salvou este item em seus desejos.</p>
        </div>
      </div>
    `
  }),
}

/**
 * Busca configurações SMTP do banco de dados
 */
async function getEmailConfig() {
  const configs = await prisma.systemConfig.findMany({
    where: { key: { startsWith: 'email.' } }
  })

  const configMap: Record<string, string> = {}
  configs.forEach((c: { key: string; value: string }) => {
    configMap[c.key.replace('email.', '')] = c.value
  })

  return configMap
}

/**
 * Cria transporter do Nodemailer com as configurações do sistema
 */
async function createEmailTransporter() {
  const config = await getEmailConfig()

  if (!config['smtpHost'] || !config['smtpUser']) {
    throw new Error('Configurações de email não encontradas')
  }

  const smtpPort = parseInt(config['smtpPort'] || '587')
  const isSecure = smtpPort === 465 || config['smtpSecure'] === 'true'

  const transporter = nodemailer.createTransport({
    host: config['smtpHost'],
    port: smtpPort,
    secure: isSecure,
    auth: {
      user: config['smtpUser'],
      pass: config['smtpPassword']
    },
    tls: {
      rejectUnauthorized: false
    }
  })

  return { transporter, config }
}

/**
 * Envia email usando template
 */
export async function sendTemplateEmail(
  templateType: TemplateType,
  to: string,
  data: EmailTemplateData
) {
  const startedAt = Date.now()
  let status = 'sent'
  let errorMsg: string | undefined
  let messageId: string | undefined
  let emailSubject: string | undefined

  try {
    const template = templates[templateType]
    if (!template) {
      throw new Error(`Template ${templateType} não encontrado`)
    }

    const { subject, html } = template(data)
    emailSubject = subject
    const { transporter, config } = await createEmailTransporter()

    const info = await transporter.sendMail({
      from: `"${config['fromName'] || 'Sistema'}" <${config['fromEmail'] || config['smtpUser']}>`,
      to,
      subject,
      html
    })

    messageId = info.messageId
    console.log(`[Email] ${templateType} enviado para ${to}:`, info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    status = 'failed'
    errorMsg = error.message
    console.error(`[Email] Erro ao enviar ${templateType}:`, error.message)
    throw error
  } finally {
    // Persistir log independentemente de sucesso ou falha
    try {
      await prisma.notificationLog.create({
        data: {
          channel: 'email',
          to,
          type: templateType,
          subject: emailSubject,
          body: `Template: ${templateType}`,
          orderId: data.orderId ? String(data.orderId) : undefined,
          reference: data.customerName ? String(data.customerName) : undefined,
          status,
          error: errorMsg,
          messageId,
          metadata: JSON.stringify({ templateData: data, durationMs: Date.now() - startedAt })
        }
      })
    } catch (logErr) {
      console.error('[Email] Falha ao gravar log de notificação:', logErr)
    }
  }
}

/**
 * Envia email simples (sem template)
 */
export async function sendSimpleEmail(
  to: string,
  subject: string,
  html: string
) {
  const startedAt = Date.now()
  let status = 'sent'
  let errorMsg: string | undefined
  let messageId: string | undefined

  try {
    const { transporter, config } = await createEmailTransporter()

    const info = await transporter.sendMail({
      from: `"${config['fromName'] || 'Sistema'}" <${config['fromEmail'] || config['smtpUser']}>`,
      to,
      subject,
      html
    })

    messageId = info.messageId
    console.log(`[Email] Enviado para ${to}:`, info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    status = 'failed'
    errorMsg = error.message
    console.error(`[Email] Erro ao enviar:`, error.message)
    throw error
  } finally {
    try {
      await prisma.notificationLog.create({
        data: {
          channel: 'email',
          to,
          type: 'simple',
          subject,
          body: html.replace(/<[^>]*>/g, '').slice(0, 500),
          status,
          error: errorMsg,
          messageId,
          metadata: JSON.stringify({ durationMs: Date.now() - startedAt })
        }
      })
    } catch (logErr) {
      console.error('[Email] Falha ao gravar log de notificação:', logErr)
    }
  }
}
