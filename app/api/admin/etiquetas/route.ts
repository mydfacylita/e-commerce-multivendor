import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/admin/etiquetas
 * Lista todas as etiquetas geradas (pré-postagens dos Correios)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Buscar pedidos que têm código de rastreio (etiqueta gerada)
    const where: any = {
      trackingCode: { not: null }
    }

    // Filtro de busca
    if (search) {
      where.OR = [
        { trackingCode: { contains: search } },
        { id: { contains: search } },
        { buyerName: { contains: search } },
        { buyerEmail: { contains: search } }
      ]
    }

    // Buscar pedidos com etiquetas
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        items: {
          include: {
            product: true
          }
        },
        invoices: {
          where: { status: 'ISSUED' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    // Buscar dados da empresa para o remetente
    const siteConfigs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['site.name', 'site.cnpj', 'site.address', 'site.phone', 'site.email', 'correios.cepOrigem']
        }
      }
    })

    const configMap: Record<string, string> = {}
    siteConfigs.forEach(c => {
      configMap[c.key] = c.value
    })

    // Parse do endereço da empresa
    const addressRaw = configMap['site.address'] || ''
    let logradouro = '', numero = 'S/N', bairro = '', cep = '', cidade = '', uf = ''
    
    const addressLines = addressRaw.split('\n')
    for (const line of addressLines) {
      const trimmed = line.trim()
      if (trimmed.toLowerCase().startsWith('rua:') || trimmed.toLowerCase().startsWith('av:')) {
        logradouro = trimmed.replace(/^(RUA|AV|AVENIDA):\s*/i, '').trim()
        const numMatch = logradouro.match(/[Nn][ºo°]?\s*(\d+)/)
        if (numMatch) {
          numero = numMatch[1]
          logradouro = logradouro.replace(/\s*[Nn][ºo°]?\s*\d+/, '').trim()
        }
      } else if (trimmed.toLowerCase().startsWith('bairro:')) {
        bairro = trimmed.replace(/^bairro:\s*/i, '').trim()
      } else if (trimmed.toLowerCase().startsWith('cep:')) {
        cep = trimmed.replace(/^cep:\s*/i, '').replace(/\D/g, '')
      } else if (trimmed.toLowerCase().startsWith('cidade:')) {
        const cidadeMatch = trimmed.replace(/^cidade:\s*/i, '').match(/^(.+?)\s*-\s*(\w{2})$/)
        if (cidadeMatch) {
          cidade = cidadeMatch[1].trim()
          uf = cidadeMatch[2].toUpperCase()
        }
      }
    }

    const remetente = {
      nome: configMap['site.name'] || 'Loja',
      cnpj: configMap['site.cnpj']?.replace(/\D/g, '') || '',
      logradouro,
      numero,
      bairro: bairro || 'Centro',
      cidade: cidade || 'São Luís',
      uf: uf || 'MA',
      cep: cep || configMap['correios.cepOrigem']?.replace(/\D/g, '') || '',
      telefone: configMap['site.phone']?.replace(/\D/g, '') || '',
      email: configMap['site.email'] || ''
    }

    // Transformar em formato de etiquetas
    const etiquetas = orders.map(order => {
      let shippingData: any = {}
      try {
        if (order.shippingAddress) {
          shippingData = JSON.parse(order.shippingAddress)
        }
      } catch (e) {}

      // Calcular dimensões do pedido
      let peso = 0, altura = 2, largura = 11, comprimento = 16
      for (const item of order.items) {
        if (item.product) {
          peso += (item.product.weight || 300) * item.quantity
          if (item.product.height && item.product.height > altura) altura = item.product.height
          if (item.product.width && item.product.width > largura) largura = item.product.width
          if (item.product.length && item.product.length > comprimento) comprimento = item.product.length
        }
      }

      // Determinar formato
      const isEnvelope = altura <= 2 && largura <= 11 && comprimento <= 16
      const formato = isEnvelope ? '1' : '2'

      // Determinar status da etiqueta
      let etiquetaStatus = 'CRIADA'
      if (order.shippedAt) {
        etiquetaStatus = 'POSTADA'
      } else if (order.labelPrintedAt) {
        etiquetaStatus = 'IMPRESSA'
      }

      // NF-e
      const invoice = order.invoices?.[0]
      const nfe = invoice?.accessKey ? {
        numero: invoice.invoiceNumber || '',
        serie: (invoice as any).series || '1',
        chave: invoice.accessKey
      } : undefined

      // Código do serviço
      let servicoCodigo = '03298' // PAC
      if (order.shippingMethod?.toLowerCase().includes('sedex')) {
        servicoCodigo = '03220'
      }

      // Acessar campo que pode não estar no tipo (regenerar prisma generate)
      const orderAny = order as any

      return {
        id: order.id,
        orderId: order.id,
        trackingCode: order.trackingCode || '',
        correiosIdPrePostagem: orderAny.correiosIdPrePostagem || '',
        status: etiquetaStatus,
        formato,
        peso: Math.max(peso, 300),
        altura: Math.max(altura, 2),
        largura: Math.max(largura, 11),
        comprimento: Math.max(comprimento, 16),
        valorDeclarado: order.total || 0,
        servicoCodigo,
        servicoNome: servicoCodigo === '03220' ? 'SEDEX' : 'PAC',
        remetente,
        destinatario: {
          nome: order.buyerName || shippingData.name || 'Cliente',
          cpfCnpj: order.buyerCpf || shippingData.cpf || '',
          logradouro: shippingData.street || shippingData.address || shippingData.logradouro || '',
          numero: shippingData.number || shippingData.numero || 'S/N',
          complemento: shippingData.complement || shippingData.complemento || '',
          bairro: shippingData.neighborhood || shippingData.bairro || '',
          cidade: shippingData.city || shippingData.cidade || '',
          uf: (shippingData.state || shippingData.uf || '').substring(0, 2).toUpperCase(),
          cep: (shippingData.zipCode || shippingData.cep || '').replace(/\D/g, ''),
          telefone: order.buyerPhone?.replace(/\D/g, '') || shippingData.phone?.replace(/\D/g, '') || '',
          email: order.buyerEmail || shippingData.email || ''
        },
        nfe,
        criadaEm: order.createdAt.toISOString(),
        atualizadaEm: order.updatedAt.toISOString(),
        order: {
          id: order.id,
          buyerName: order.buyerName || 'Cliente',
          total: order.total,
          status: order.status,
          createdAt: order.createdAt.toISOString()
        }
      }
    })

    // Filtrar por status se especificado
    const filteredEtiquetas = status 
      ? etiquetas.filter(e => e.status === status)
      : etiquetas

    return NextResponse.json({
      success: true,
      etiquetas: filteredEtiquetas,
      total: filteredEtiquetas.length,
      page,
      limit
    })

  } catch (error: any) {
    console.error('Erro ao listar etiquetas:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
