import { prisma } from './prisma'
import { emitirNFeSefaz } from './sefaz-nfe'

export interface InvoiceData {
  invoiceId: string
  order: {
    id: string
    total: number
    shippingCost: number
    discountAmount: number
    buyerName: string
    buyerCpf: string
    buyerEmail: string
    buyerPhone: string
    shippingAddress: any
    items: Array<{
      productId: string
      name: string
      sku: string
      gtin: string
      ncm: string
      quantity: number
      price: number
      total: number
    }>
  }
  cfop: string
  naturezaOperacao: string
  series: string
}

export interface InvoiceResult {
  success: boolean
  invoiceNumber?: string
  accessKey?: string
  protocol?: string
  xmlUrl?: string
  pdfUrl?: string
  danfeUrl?: string
  error?: string
}

/**
 * Classe base para integração com provedores de nota fiscal
 * Implementações específicas devem estender esta classe
 */
export abstract class InvoiceProvider {
  abstract name: string
  abstract issueInvoice(data: InvoiceData): Promise<InvoiceResult>
  abstract cancelInvoice(invoiceId: string, reason: string): Promise<InvoiceResult>
  abstract getInvoiceStatus(invoiceId: string): Promise<InvoiceResult>
}

/**
 * Provedor de exemplo - NFe.io
 * Documentação: https://nfe.io/docs/api
 */
export class NFeIOProvider extends InvoiceProvider {
  name = 'NFe.io'
  private apiKey: string
  private companyId: string
  private baseUrl = 'https://api.nfe.io'

  constructor() {
    super()
    this.apiKey = process.env.NFEIO_API_KEY || ''
    this.companyId = process.env.NFEIO_COMPANY_ID || ''
  }

  async issueInvoice(data: InvoiceData): Promise<InvoiceResult> {
    try {
      // Validar configuração
      if (!this.apiKey || !this.companyId) {
        return {
          success: false,
          error: 'NFe.io não configurado. Configure NFEIO_API_KEY e NFEIO_COMPANY_ID'
        }
      }

      const shippingAddress = data.order.shippingAddress

      // Montar payload conforme API NFe.io
      const payload = {
        cfop: data.cfop,
        natureza_operacao: data.naturezaOperacao,
        serie: data.series,
        
        // Destinatário
        cliente: {
          tipo_pessoa: data.order.buyerCpf.length === 11 ? 'fisica' : 'juridica',
          cpf_cnpj: data.order.buyerCpf,
          nome: data.order.buyerName,
          email: data.order.buyerEmail,
          telefone: data.order.buyerPhone,
          endereco: {
            logradouro: shippingAddress.street,
            numero: shippingAddress.number || 'S/N',
            complemento: shippingAddress.complement,
            bairro: shippingAddress.neighborhood,
            cidade: shippingAddress.city,
            uf: shippingAddress.state,
            cep: shippingAddress.zipCode
          }
        },

        // Itens
        itens: data.order.items.map((item, index) => ({
          numero_item: index + 1,
          codigo_produto: item.sku,
          descricao: item.name,
          cfop: data.cfop,
          unidade_comercial: 'UN',
          quantidade_comercial: item.quantity,
          valor_unitario_comercial: item.price,
          valor_total_bruto: item.total,
          ncm: item.ncm || '00000000',
          ean: item.gtin || '',
          origem: 0, // Nacional
          icms_situacao_tributaria: '102' // Simples Nacional
        })),

        // Totais
        valor_produtos: data.order.items.reduce((sum, item) => sum + item.total, 0),
        valor_frete: data.order.shippingCost,
        valor_desconto: data.order.discountAmount,
        valor_total: data.order.total,

        // Informações adicionais
        informacoes_adicionais_contribuinte: `Pedido: ${data.order.id}`,
        
        // Configurações
        enviar_email_destinatario: true
      }

      // Fazer requisição para NFe.io
      const response = await fetch(
        `${this.baseUrl}/v1/companies/${this.companyId}/nfes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao emitir nota fiscal')
      }

      const result = await response.json()

      // Atualizar registro no banco
      await prisma.invoice.update({
        where: { id: data.invoiceId },
        data: {
          status: 'PROCESSING',
          invoiceNumber: result.numero,
          accessKey: result.chave_acesso,
          protocol: result.protocolo,
          xmlUrl: result.url_xml,
          pdfUrl: result.url_pdf,
          danfeUrl: result.url_danfe,
          externalId: result.id,
          externalProvider: this.name
        }
      })

      return {
        success: true,
        invoiceNumber: result.numero,
        accessKey: result.chave_acesso,
        protocol: result.protocolo,
        xmlUrl: result.url_xml,
        pdfUrl: result.url_pdf,
        danfeUrl: result.url_danfe
      }

    } catch (error: any) {
      // Registrar erro no banco
      await prisma.invoice.update({
        where: { id: data.invoiceId },
        data: {
          status: 'ERROR',
          errorMessage: error.message
        }
      })

      return {
        success: false,
        error: error.message
      }
    }
  }

  async cancelInvoice(invoiceId: string, reason: string): Promise<InvoiceResult> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId }
      })

      if (!invoice || !invoice.externalId) {
        return {
          success: false,
          error: 'Nota fiscal não encontrada'
        }
      }

      const response = await fetch(
        `${this.baseUrl}/v1/companies/${this.companyId}/nfes/${invoice.externalId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ justificativa: reason })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao cancelar nota fiscal')
      }

      const result = await response.json()

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason
        }
      })

      return {
        success: true,
        protocol: result.protocolo
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async getInvoiceStatus(invoiceId: string): Promise<InvoiceResult> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId }
      })

      if (!invoice || !invoice.externalId) {
        return {
          success: false,
          error: 'Nota fiscal não encontrada'
        }
      }

      const response = await fetch(
        `${this.baseUrl}/v1/companies/${this.companyId}/nfes/${invoice.externalId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Erro ao consultar status da nota fiscal')
      }

      const result = await response.json()

      // Atualizar status se mudou
      if (result.status === 'autorizada' && invoice.status !== 'ISSUED') {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'ISSUED',
            issuedAt: new Date()
          }
        })
      }

      return {
        success: true,
        invoiceNumber: result.numero,
        accessKey: result.chave_acesso,
        xmlUrl: result.url_xml,
        pdfUrl: result.url_pdf,
        danfeUrl: result.url_danfe
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

/**
 * Provedor de exemplo - Bling
 * Documentação: https://developer.bling.com.br/
 */
export class BlingProvider extends InvoiceProvider {
  name = 'Bling'
  private apiKey: string
  private baseUrl = 'https://bling.com.br/Api/v3'

  constructor() {
    super()
    this.apiKey = process.env.BLING_API_KEY || ''
  }

  async issueInvoice(data: InvoiceData): Promise<InvoiceResult> {
    // TODO: Implementar integração com Bling
    return {
      success: false,
      error: 'Provedor Bling não implementado ainda'
    }
  }

  async cancelInvoice(invoiceId: string, reason: string): Promise<InvoiceResult> {
    return {
      success: false,
      error: 'Provedor Bling não implementado ainda'
    }
  }

  async getInvoiceStatus(invoiceId: string): Promise<InvoiceResult> {
    return {
      success: false,
      error: 'Provedor Bling não implementado ainda'
    }
  }
}

/**
 * Factory para criar provedor de nota fiscal baseado em configuração
 */
export function createInvoiceProvider(): InvoiceProvider {
  const provider = process.env.INVOICE_PROVIDER || 'nfeio'

  switch (provider.toLowerCase()) {
    case 'nfeio':
      return new NFeIOProvider()
    case 'bling':
      return new BlingProvider()
    default:
      return new NFeIOProvider()
  }
}

/**
 * Função helper para emitir nota fiscal
 */
export async function emitirNotaFiscal(invoiceId: string): Promise<InvoiceResult> {
  // Verificar se é SEFAZ direto
  const nfeConfig = await prisma.systemConfig.findFirst({
    where: { key: 'nfe_config' }
  })

  if (nfeConfig) {
    const config = JSON.parse(nfeConfig.value)
    if (config.provedor === 'sefaz') {
      console.log('🚀 Usando integração SEFAZ direta')
      return emitirNFeSefaz(invoiceId)
    }
  }

  // Usar provedor terceiro
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: {
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  gtin: true,
                  price: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!invoice) {
    return {
      success: false,
      error: 'Nota fiscal não encontrada'
    }
  }

  const shippingData = JSON.parse(invoice.order.shippingAddress)

  const invoiceData: InvoiceData = {
    invoiceId: invoice.id,
    order: {
      id: invoice.order.id,
      total: invoice.valorTotal,
      shippingCost: invoice.valorFrete || 0,
      discountAmount: invoice.valorDesconto || 0,
      buyerName: invoice.destinatarioNome,
      buyerCpf: invoice.destinatarioCpf || '',
      buyerEmail: invoice.order.buyerEmail || '',
      buyerPhone: invoice.order.buyerPhone || '',
      shippingAddress: shippingData,
      items: invoice.order.items.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku || '',
        gtin: item.product.gtin || '',
        ncm: item.product.ncm || '',
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      }))
    },
    cfop: invoice.cfop || '5102',
    naturezaOperacao: invoice.naturezaOperacao || 'Venda de mercadoria',
    series: invoice.series || '1'
  }

  const provider = createInvoiceProvider()
  return provider.issueInvoice(invoiceData)
}

/**
 * Função helper para cancelar nota fiscal
 */
export async function cancelarNotaFiscal(
  invoiceId: string,
  reason: string
): Promise<InvoiceResult> {
  const provider = createInvoiceProvider()
  return provider.cancelInvoice(invoiceId, reason)
}

/**
 * Função helper para consultar status de nota fiscal
 */
export async function consultarStatusNotaFiscal(
  invoiceId: string
): Promise<InvoiceResult> {
  const provider = createInvoiceProvider()
  return provider.getInvoiceStatus(invoiceId)
}
