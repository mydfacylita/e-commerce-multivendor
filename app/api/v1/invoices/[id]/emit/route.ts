import { NextRequest, NextResponse } from 'next/server'
import { validateDevAuth, hasScope, devAuthError, logDevApiCall } from '@/lib/dev-auth'
import { prisma } from '@/lib/prisma'
import { emitirNotaFiscal } from '@/lib/invoice'
import { InvoiceType } from '@prisma/client'
import { buscarCodigoIBGEPorCEP, codigosIBGECapitais } from '@/lib/ibge'

// Mapa para normalizar UF
const UF_MAP: Record<string, string> = {
  'AC': 'AC', 'AL': 'AL', 'AP': 'AP', 'AM': 'AM', 'BA': 'BA', 'CE': 'CE',
  'DF': 'DF', 'ES': 'ES', 'GO': 'GO', 'MA': 'MA', 'MT': 'MT', 'MS': 'MS',
  'MG': 'MG', 'PA': 'PA', 'PB': 'PB', 'PR': 'PR', 'PE': 'PE', 'PI': 'PI',
  'RJ': 'RJ', 'RN': 'RN', 'RS': 'RS', 'RO': 'RO', 'RR': 'RR', 'SC': 'SC',
  'SP': 'SP', 'SE': 'SE', 'TO': 'TO',
  'SÃ': 'SP', 'SA': 'SP', 'SAO': 'SP', 'SÃO PAULO': 'SP',
  'RÍ': 'RJ', 'RI': 'RJ', 'RIO DE JANEIRO': 'RJ',
}

function normalizarUF(uf: string | null | undefined): string {
  if (!uf) return 'MA'
  const ufUpper = uf.toUpperCase().trim()
  return UF_MAP[ufUpper] || (ufUpper.length === 2 ? ufUpper : 'MA')
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const start = Date.now()
  const auth = await validateDevAuth(req)
  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode!)
  if (!hasScope(auth, 'invoices:read')) return devAuthError('Scope insuficiente: invoices:read', 403)

  const path = `/api/v1/invoices/${params.id}/emit`

  try {
    // Buscar pedido com itens
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: true } },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, accessKey: true, invoiceNumber: true, series: true, danfeUrl: true, issuedAt: true }
        }
      }
    })

    if (!order) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 404, latencyMs: Date.now() - start })
      return devAuthError('Pedido não encontrado', 404)
    }

    // ── Pré-requisito 1: pagamento aprovado ──
    if (order.paymentStatus !== 'APPROVED') {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 422, latencyMs: Date.now() - start, error: 'Pagamento não aprovado' })
      return NextResponse.json({
        error: 'Não é possível emitir NF-e: pagamento ainda não aprovado.',
        prerequisite: 'O pagamento precisa estar aprovado antes de emitir a nota fiscal.',
        paymentStatus: order.paymentStatus
      }, { status: 422 })
    }

    // ── Pré-requisito 2: pedido em status válido para emissão ──
    const STATUS_VALIDOS_NF = ['PROCESSING', 'WAREHOUSE', 'SHIPPED']
    if (!STATUS_VALIDOS_NF.includes(order.status)) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 422, latencyMs: Date.now() - start, error: `Status inválido para emissão: ${order.status}` })
      return NextResponse.json({
        error: `Não é possível emitir NF-e: pedido está com status "${order.status}".`,
        prerequisite: `O pedido precisa estar em separação (PROCESSING) para emitir a nota fiscal.`,
        orderStatus: order.status,
        validStatuses: STATUS_VALIDOS_NF
      }, { status: 422 })
    }

    // Se já tem NF emitida, retornar
    const existing = order.invoices[0]
    if (existing && existing.status === 'ISSUED') {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 200, latencyMs: Date.now() - start })
      return NextResponse.json({
        data: {
          orderId: order.id,
          invoiceId: existing.id,
          status: existing.status,
          key: existing.accessKey,
          number: existing.invoiceNumber,
          series: existing.series,
          issuedAt: existing.issuedAt,
          url: existing.danfeUrl,
          alreadyIssued: true
        }
      })
    }

    // Buscar configurações do app do desenvolvedor para determinar filial
    const app = await prisma.developerApp.findFirst({
      where: { id: auth.appId! },
      select: { filterConfig: true }
    })
    
    const filterConfig = app?.filterConfig ? (typeof app.filterConfig === 'string' ? JSON.parse(app.filterConfig) : app.filterConfig) : {}
    const appWarehouseCode = filterConfig?.orders?.warehouseCode || order.warehouseCode || null
    
    // Buscar configurações da filial específica se houver warehouseCode
    let branchConfig: any = null
    if (appWarehouseCode) {
      const branchRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT code, name, cnpj, ie, city, cityCode, state, zipCode, street, number, complement, neighborhood,
                nfSerie, nfAmbiente, nfNaturezaOperacao, nfCrt, nfCertificadoArquivo, nfCertificadoSenha, nfTaxRulesJson
         FROM company_branch WHERE code = ? AND isActive = 1 LIMIT 1`,
        appWarehouseCode
      )
      if (branchRows.length > 0) {
        branchConfig = branchRows[0]
        // Parse do JSON de tax rules se existir
        if (branchConfig.nfTaxRulesJson) {
          try {
            branchConfig.taxRules = JSON.parse(branchConfig.nfTaxRulesJson)
          } catch { branchConfig.taxRules = null }
        }
      }
    }
    
    // Buscar configuração NF-e global
    const nfeConfig = await prisma.systemConfig.findFirst({ where: { key: 'nfe_config' } })
    if (!nfeConfig && !branchConfig) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 400, latencyMs: Date.now() - start })
      return NextResponse.json({ error: 'Configurações de NF-e não encontradas' }, { status: 400 })
    }

    const globalConfig = nfeConfig ? JSON.parse(nfeConfig.value) : {}
    
    // Configuração final: prioriza filial > global
    const config = {
      emitenteCnpj: branchConfig?.cnpj || globalConfig.emitenteCnpj,
      emitenteRazaoSocial: branchConfig?.name || globalConfig.emitenteRazaoSocial,
      emitenteInscricaoEstadual: branchConfig?.ie || globalConfig.emitenteInscricaoEstadual,
      emitenteCrt: branchConfig?.nfCrt || globalConfig.emitenteCrt || '1',
      emitenteEstado: branchConfig?.state || globalConfig.emitenteEstado || 'MA',
      emitenteCidade: branchConfig?.city || globalConfig.emitenteCidade,
      codigoMunicipio: branchConfig?.cityCode || globalConfig.codigoMunicipio,
      emitenteCep: branchConfig?.zipCode || globalConfig.emitenteCep,
      emitenteLogradouro: branchConfig?.street || globalConfig.emitenteLogradouro,
      emitenteNumero: branchConfig?.number || globalConfig.emitenteNumero,
      emitenteComplemento: branchConfig?.complement || globalConfig.emitenteComplemento,
      emitenteBairro: branchConfig?.neighborhood || globalConfig.emitenteBairro,
      serieNfe: branchConfig?.nfSerie || globalConfig.serieNfe || '1',
      ambiente: branchConfig?.nfAmbiente || globalConfig.ambiente || 'homologacao',
      naturezaOperacao: branchConfig?.nfNaturezaOperacao || globalConfig.naturezaOperacao || 'VENDA',
      certificadoTipo: globalConfig.certificadoTipo || 'A1',
      certificadoArquivo: branchConfig?.nfCertificadoArquivo || globalConfig.certificadoArquivo,
      certificadoSenha: branchConfig?.nfCertificadoSenha || globalConfig.certificadoSenha,
      taxRules: branchConfig?.taxRules || globalConfig.taxRules || [],
      aliquotaIcms: globalConfig.aliquotaIcms || '0',
      aliquotaPis: globalConfig.aliquotaPis || '0',
      aliquotaCofins: globalConfig.aliquotaCofins || '0'
    }

    // Validar campos essenciais
    if (!config.emitenteCnpj || !config.emitenteRazaoSocial || !config.emitenteInscricaoEstadual) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 400, latencyMs: Date.now() - start })
      return NextResponse.json({ error: 'Dados do emissor incompletos' }, { status: 400 })
    }

    if (!config.certificadoTipo || !config.certificadoArquivo || !config.certificadoSenha) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 400, latencyMs: Date.now() - start })
      return NextResponse.json({ error: 'Certificado digital não configurado' }, { status: 400 })
    }

    // Parse do endereço
    let shippingData: any = {}
    try {
      shippingData = typeof order.shippingAddress === 'string'
        ? JSON.parse(order.shippingAddress)
        : (order.shippingAddress || {})
    } catch {
      shippingData = {}
    }

    // Calcular valores
    const valorProdutos = order.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0)
    const valorFrete = order.shippingCost || 0
    const valorDesconto = order.discountAmount || 0
    const valorTotal = order.total
    const aliquotaIcms = parseFloat(config.aliquotaIcms || '0') / 100
    const aliquotaPis = parseFloat(config.aliquotaPis || '0') / 100
    const aliquotaCofins = parseFloat(config.aliquotaCofins || '0') / 100
    const valorIcms = valorProdutos * aliquotaIcms
    const valorPis = valorProdutos * aliquotaPis
    const valorCofins = valorProdutos * aliquotaCofins

    // Normalizar UF do destinatário
    const ufDestinatario = normalizarUF(shippingData.state)

    // Buscar código IBGE do município do destinatário
    const cepDestinatario = shippingData.zipCode || shippingData.postalCode || ''
    let codigoMunicipioDestinatario = shippingData.cityCode || shippingData.codigoMunicipio || shippingData.ibge

    if (!codigoMunicipioDestinatario && cepDestinatario) {
      codigoMunicipioDestinatario = await buscarCodigoIBGEPorCEP(cepDestinatario)
      if (!codigoMunicipioDestinatario) {
        codigoMunicipioDestinatario = codigosIBGECapitais[ufDestinatario]
      }
    }

    // Determinar tipo de operação
    const ufEmitente = config.emitenteEstado || 'MA'
    const tipoOperacao = ufEmitente === ufDestinatario ? 'interna' :
                         ufDestinatario === 'EX' ? 'exportacao' : 'interestadual'

    // Buscar regra de tributação da filial/matriz
    const taxRules = config.taxRules || []
    const regraAplicavel = taxRules.find((r: any) => r.ativo && r.tipoOperacao === tipoOperacao)
    
    if (!regraAplicavel) {
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 400, latencyMs: Date.now() - start })
      return NextResponse.json({ 
        error: `Regra de tributação não encontrada para operação ${tipoOperacao}. Configure as regras fiscais na filial/matriz.` 
      }, { status: 400 })
    }

    const naturezaOperacaoNota = regraAplicavel.nome
    const cfopNota = regraAplicavel.cfop

    // Determinar tipo de NF-e
    const hasSellerProducts = order.items.some((item: any) => item.sellerId)
    const invoiceType: InvoiceType = hasSellerProducts ? 'SELLER' : 'ADMIN'

    // Se tem invoice ERROR, deletar para criar nova
    if (existing && existing.status === 'ERROR') {
      await prisma.invoice.delete({ where: { id: existing.id } })
    }

    // Criar invoice com status PROCESSING
    const invoice = await prisma.invoice.create({
      data: {
        orderId: order.id,
        type: invoiceType,
        status: 'PROCESSING',
        series: config.serieNfe || '1',
        valorTotal,
        valorProdutos,
        valorFrete,
        valorDesconto,
        valorIcms,
        valorPis,
        valorCofins,
        // Emitente
        emitenteCnpj: config.emitenteCnpj,
        emitenteNome: config.emitenteRazaoSocial,
        emitenteIE: config.emitenteInscricaoEstadual,
        emitenteCRT: config.emitenteCrt || '1',
        emitenteLogradouro: config.emitenteLogradouro,
        emitenteNumero: config.emitenteNumero,
        emitenteComplemento: config.emitenteComplemento,
        emitenteBairro: config.emitenteBairro,
        emitenteMunicipio: config.emitenteCidade,
        emitenteMunicipioCod: config.codigoMunicipio,
        emitenteUF: config.emitenteEstado,
        emitenteCEP: config.emitenteCep?.replace(/\D/g, ''),
        // Destinatário
        destinatarioNome: shippingData.name || order.buyerName || 'Cliente',
        destinatarioCpf: (shippingData.cpfCnpj || order.buyerCpf || '').length <= 11 ? (shippingData.cpfCnpj || order.buyerCpf) : null,
        destinatarioCnpj: (shippingData.cpfCnpj || order.buyerCpf || '').length > 11 ? (shippingData.cpfCnpj || order.buyerCpf) : null,
        destinatarioLogradouro: shippingData.street || shippingData.address || 'Não informado',
        destinatarioNumero: shippingData.number || 'S/N',
        destinatarioComplemento: shippingData.complement || shippingData.complemento,
        destinatarioBairro: shippingData.neighborhood || shippingData.district || 'Centro',
        destinatarioMunicipio: shippingData.city || 'Não informado',
        destinatarioMunicipioCod: codigoMunicipioDestinatario,
        destinatarioUF: ufDestinatario,
        destinatarioCEP: (shippingData.zipCode || shippingData.postalCode || '')?.replace(/\D/g, ''),
        // Natureza e CFOP
        naturezaOperacao: naturezaOperacaoNota,
        cfop: cfopNota,
        issuedBy: `dev-api:${auth.keyPrefix}`
      }
    })

    // Emitir nota fiscal
    try {
      const result = await emitirNotaFiscal(invoice.id)
      const invoiceAtualizada = await prisma.invoice.findUnique({ where: { id: invoice.id } })

      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 200, latencyMs: Date.now() - start })

      return NextResponse.json({
        data: {
          orderId: order.id,
          invoiceId: invoice.id,
          status: invoiceAtualizada?.status,
          key: result.accessKey,
          number: result.invoiceNumber,
          series: invoiceAtualizada?.series,
          issuedAt: invoiceAtualizada?.issuedAt,
          url: result.danfeUrl,
          protocolo: result.protocol
        }
      })
    } catch (providerError: any) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'ERROR', errorMessage: providerError.message }
      })
      await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 422, latencyMs: Date.now() - start, error: providerError.message })
      return NextResponse.json({ error: providerError.message || 'Erro ao emitir nota fiscal' }, { status: 422 })
    }
  } catch (error: any) {
    await logDevApiCall({ appId: auth.appId!, keyPrefix: auth.keyPrefix!, method: 'POST', path, statusCode: 500, latencyMs: Date.now() - start, error: error.message })
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 })
  }
}
