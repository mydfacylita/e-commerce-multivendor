import { NextRequest, NextResponse } from 'next/server'
import { validateDevAuth, hasScope, devAuthError, logDevApiCall } from '@/lib/dev-auth'
import { prisma } from '@/lib/prisma'
import { correiosCWS } from '@/lib/correios-cws'

// Mapa de estados para converter nome completo em sigla
const ESTADO_PARA_UF: Record<string, string> = {
  'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAPÁ': 'AP', 'AMAZONAS': 'AM', 'BAHIA': 'BA',
  'CEARÁ': 'CE', 'DISTRITO FEDERAL': 'DF', 'ESPÍRITO SANTO': 'ES', 'GOIÁS': 'GO',
  'MARANHÃO': 'MA', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG',
  'PARÁ': 'PA', 'PARAÍBA': 'PB', 'PARANÁ': 'PR', 'PERNAMBUCO': 'PE', 'PIAUÍ': 'PI',
  'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS',
  'RONDÔNIA': 'RO', 'RORAIMA': 'RR', 'SANTA CATARINA': 'SC', 'SÃO PAULO': 'SP',
  'SERGIPE': 'SE', 'TOCANTINS': 'TO'
}

// Converte estado para UF de 2 caracteres
function getUF(state: string): string {
  if (!state) return ''
  const upper = state.toUpperCase().trim()
  // Se já é sigla de 2 caracteres, retornar
  if (upper.length === 2) return upper
  // Tentar converter nome completo
  return ESTADO_PARA_UF[upper] || upper.substring(0, 2)
}



export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const auth = await validateDevAuth(req)
  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode!)

  if (!hasScope(auth, 'labels:read')) return devAuthError('Scope insuficiente: labels:read', 403)

  const path = `/api/v1/labels/${params.id}/generate`

  try {
    // Buscar pedido com itens e NF-e
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, weight: true, height: true, width: true, length: true }
            }
          }
        },
        invoices: {
          where: { status: 'ISSUED', accessKey: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { accessKey: true, invoiceNumber: true, series: true }
        }
      }
    })

    if (!order) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 404, latencyMs: Date.now() - start })
      return devAuthError('Pedido não encontrado', 404)
    }

    // ── Pré-requisito: NF-e deve estar emitida antes de gerar a etiqueta ──
    if (!order.shippingLabel || !order.trackingCode) {
      // Verificar se existe NF-e emitida
      const nfEmitida = order.invoices.length > 0
      if (!nfEmitida) {
        await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 422, latencyMs: Date.now() - start, error: 'NF-e não emitida' })
        return NextResponse.json({
          error: 'Não é possível gerar a etiqueta: nota fiscal ainda não emitida.',
          prerequisite: 'Emita a NF-e primeiro usando POST /api/v1/invoices/:orderId/emit',
          nextStep: `/api/v1/invoices/${params.id}/emit`
        }, { status: 422 })
      }
    }

    // Se já tem etiqueta gerada, retornar
    if (order.shippingLabel && order.trackingCode) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 200, latencyMs: Date.now() - start })
      return NextResponse.json({
        data: {
          orderId: order.id,
          trackingCode: order.trackingCode,
          label: order.shippingLabel,
          labelType: order.shippingLabelType || 'pdf',
          idPrePostagem: order.correiosIdPrePostagem,
          alreadyGenerated: true
        }
      })
    }

    // Buscar embalagem se houver packagingBoxId
    let packagingBox: { 
      outerLength: number, outerWidth: number, outerHeight: number, emptyWeight: number 
    } | null = null
    if (order.packagingBoxId) {
      packagingBox = await prisma.packagingBox.findUnique({
        where: { id: order.packagingBoxId },
        select: { outerLength: true, outerWidth: true, outerHeight: true, emptyWeight: true }
      })
    }

    // Buscar configurações do app para determinar filial
    const app = await prisma.developerApp.findFirst({
      where: { id: auth.appId! },
      select: { filterConfig: true }
    })
    
    const filterConfig = app?.filterConfig ? (typeof app.filterConfig === 'string' ? JSON.parse(app.filterConfig) : app.filterConfig) : {}
    const appWarehouseCode = filterConfig?.orders?.warehouseCode || order.warehouseCode || null
    
    // Buscar dados da filial específica se houver warehouseCode
    let branchData: any = null
    if (appWarehouseCode) {
      const branchRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT code, name, cnpj, city, state, zipCode, street, number, complement, neighborhood, phone, email
         FROM company_branch WHERE code = ? AND isActive = 1 LIMIT 1`,
        appWarehouseCode
      )
      if (branchRows.length > 0) {
        branchData = branchRows[0]
      }
    }

    // Buscar dados da empresa do systemConfig
    const siteConfigs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            'site.name', 'site.cnpj', 'site.address', 'site.phone', 
            'site.email', 'correios.cepOrigem'
          ]
        }
      }
    })

    const configMap: Record<string, string> = {}
    siteConfigs.forEach(c => { configMap[c.key] = c.value })

    // Se não tem filial, fazer parse do endereço global (formato: "RUA: xxx\nBairro: xxx\nCEP: xxx\nCidade: xxx - UF")
    let logradouro = ''
    let numero = 'S/N'
    let bairro = ''
    let cep = ''
    let cidade = ''
    let uf = ''
    
    if (!branchData) {
      const addressRaw = configMap['site.address'] || ''
      const addressLines = addressRaw.split('\n')
      for (const line of addressLines) {
        const trimmed = line.trim()
        if (trimmed.toLowerCase().startsWith('rua:') || trimmed.toLowerCase().startsWith('av:') || trimmed.toLowerCase().startsWith('avenida:')) {
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
          } else {
            cidade = trimmed.replace(/^cidade:\s*/i, '').trim()
          }
        }
      }
    }

    const cepOrigem = configMap['correios.cepOrigem']?.replace(/\D/g, '') || cep

    // Configuração final: prioriza filial > global
    const empresa = {
      name: branchData?.name || configMap['site.name'] || 'Loja',
      cnpj: branchData?.cnpj?.replace(/\D/g, '') || configMap['site.cnpj']?.replace(/\D/g, '') || '',
      address: branchData?.street || logradouro || 'Endereço não informado',
      number: branchData?.number || numero,
      complement: branchData?.complement || '',
      neighborhood: branchData?.neighborhood || bairro || 'Centro',
      city: branchData?.city || cidade || 'São Luís',
      state: branchData?.state || uf || 'MA',
      zipCode: branchData?.zipCode?.replace(/\D/g, '') || cep || cepOrigem,
      phone: branchData?.phone || configMap['site.phone'] || '',
      email: branchData?.email || configMap['site.email'] || '',
      cepOrigem: cepOrigem
    }

    // Determinar código de serviço
    let codigoServico = '03298' // PAC por padrão
    if (order.shippingMethod?.toLowerCase().includes('sedex')) {
      codigoServico = '03220' // SEDEX
    }

    // Calcular peso e dimensões
    let pesoTotal = 0
    let alturaMax = 2
    let larguraMax = 11
    let comprimentoMax = 16

    for (const item of order.items) {
      const product = item.product
      if (product) {
        pesoTotal += (product.weight || 300) * item.quantity
        if (product.height && product.height > alturaMax) alturaMax = product.height
        if (product.width && product.width > larguraMax) larguraMax = product.width
        if (product.length && product.length > comprimentoMax) comprimentoMax = product.length
      }
    }

    // Se tiver embalagem selecionada, usar dimensões dela
    if (packagingBox) {
      alturaMax = packagingBox.outerHeight
      larguraMax = packagingBox.outerWidth
      comprimentoMax = packagingBox.outerLength
      pesoTotal += packagingBox.emptyWeight
    }

    // Garantir peso mínimo
    if (pesoTotal < 300) pesoTotal = 300

    // Parse do endereço de entrega
    let shippingData: any = {}
    try {
      if (order.shippingAddress) {
        shippingData = JSON.parse(order.shippingAddress)
      }
    } catch (e) {
      shippingData = {}
    }

    if (!shippingData.city || !shippingData.state || !shippingData.zipCode) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 422, latencyMs: Date.now() - start, error: 'Endereço incompleto' })
      return NextResponse.json({ error: 'Endereço de entrega incompleto (cidade, estado ou CEP ausentes)' }, { status: 422 })
    }

    // Buscar dados da nota fiscal
    const invoice = order.invoices?.[0]
    const nfeData = invoice?.accessKey ? {
      chave: invoice.accessKey,
      numero: invoice.invoiceNumber || undefined,
      serie: invoice.series || undefined
    } : undefined

    // Criar pré-postagem via API CWS
    const resultado = await correiosCWS.criarPrePostagem(
      // Destinatário
      {
        nome: order.buyerName || shippingData.name || shippingData.nome || 'Cliente',
        cpfCnpj: order.buyerCpf || shippingData.cpf || shippingData.document || '',
        logradouro: shippingData.street || shippingData.logradouro || shippingData.address || '',
        numero: shippingData.number || shippingData.numero || 'S/N',
        complemento: shippingData.complement || shippingData.complemento || '',
        bairro: shippingData.neighborhood || shippingData.bairro || '',
        cidade: shippingData.city || shippingData.cidade || '',
        uf: getUF(shippingData.state || shippingData.uf || ''),
        cep: shippingData.zipCode || shippingData.cep || shippingData.zip_code || '',
        telefone: order.buyerPhone || shippingData.phone || shippingData.telefone || '',
        email: order.buyerEmail || shippingData.email || ''
      },
      // Remetente
      {
        nome: empresa.name,
        cnpj: empresa.cnpj,
        logradouro: empresa.address,
        numero: empresa.number,
        complemento: empresa.complement,
        bairro: empresa.neighborhood,
        cidade: empresa.city,
        uf: empresa.state,
        cep: empresa.zipCode,
        telefone: empresa.phone,
        email: empresa.email
      },
      // Objeto
      {
        peso: pesoTotal,
        altura: Math.max(alturaMax, 2),
        largura: Math.max(larguraMax, 11),
        comprimento: Math.max(comprimentoMax, 16),
        valorDeclarado: Number(order.total) || 0,
        codigoServico
      },
      // NF-e (se houver)
      nfeData
    )

    if (!resultado.success || !resultado.codigoRastreio) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 422, latencyMs: Date.now() - start, error: resultado.error })
      return NextResponse.json({
        error: resultado.error || 'Erro ao criar pré-postagem nos Correios'
      }, { status: 422 })
    }

    const codigoRastreio = resultado.codigoRastreio!
    const idPrePostagem = resultado.idPrePostagem!

    // Gerar etiqueta PDF (diferente do admin - aqui geramos na mesma chamada)
    const etiqueta = await correiosCWS.gerarEtiqueta(idPrePostagem, codigoRastreio)

    if (!etiqueta.success || !etiqueta.pdfBuffer) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 422, latencyMs: Date.now() - start, error: etiqueta.error })
      return NextResponse.json({
        error: 'Falha ao gerar etiqueta PDF: ' + (etiqueta.error || 'Erro Correios')
      }, { status: 422 })
    }

    // Salvar etiqueta e código de rastreio no pedido (usando raw SQL)
    const labelBase64 = etiqueta.pdfBuffer.toString('base64')
    await prisma.$executeRaw`
      UPDATE \`order\` 
      SET trackingCode = ${codigoRastreio}, 
          correiosIdPrePostagem = ${idPrePostagem},
          shippingLabel = ${labelBase64},
          shippingLabelType = 'pdf',
          labelPrintedAt = NULL
      WHERE id = ${params.id}
    `

    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 200, latencyMs: Date.now() - start })

    return NextResponse.json({
      data: {
        orderId: order.id,
        trackingCode: codigoRastreio,
        label: labelBase64,
        labelType: 'pdf',
        idPrePostagem
      }
    })
  } catch (error: any) {
    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 500, latencyMs: Date.now() - start, error: error.message })
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 })
  }
}
