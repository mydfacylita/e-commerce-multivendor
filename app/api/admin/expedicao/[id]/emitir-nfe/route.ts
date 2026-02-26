import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emitirNotaFiscal } from '@/lib/invoice'
import { InvoiceType } from '@prisma/client'
import { buscarCodigoIBGEPorCEP, codigosIBGECapitais } from '@/lib/ibge'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Mapa para normalizar UF (corrigir problemas de encoding/nomes incorretos)
const UF_MAP: Record<string, string> = {
  // Siglas corretas
  'AC': 'AC', 'AL': 'AL', 'AP': 'AP', 'AM': 'AM', 'BA': 'BA', 'CE': 'CE',
  'DF': 'DF', 'ES': 'ES', 'GO': 'GO', 'MA': 'MA', 'MT': 'MT', 'MS': 'MS',
  'MG': 'MG', 'PA': 'PA', 'PB': 'PB', 'PR': 'PR', 'PE': 'PE', 'PI': 'PI',
  'RJ': 'RJ', 'RN': 'RN', 'RS': 'RS', 'RO': 'RO', 'RR': 'RR', 'SC': 'SC',
  'SP': 'SP', 'SE': 'SE', 'TO': 'TO',
  // Correções de encoding
  'SÃ': 'SP', 'SA': 'SP', 'SAO': 'SP',
  'RÍ': 'RJ', 'RI': 'RJ',
  // Nomes por extenso
  'SAO PAULO': 'SP', 'SÃO PAULO': 'SP',
  'RIO DE JANEIRO': 'RJ',
  'MINAS GERAIS': 'MG',
  'BAHIA': 'BA',
  'PARANA': 'PR', 'PARANÁ': 'PR',
  'RIO GRANDE DO SUL': 'RS',
  'PERNAMBUCO': 'PE',
  'CEARA': 'CE', 'CEARÁ': 'CE',
  'MARANHAO': 'MA', 'MARANHÃO': 'MA',
  'GOIAS': 'GO', 'GOIÁS': 'GO',
  'SANTA CATARINA': 'SC',
  'ESPIRITO SANTO': 'ES', 'ESPÍRITO SANTO': 'ES',
  'AMAZONAS': 'AM',
  'DISTRITO FEDERAL': 'DF',
}

function normalizarUF(uf: string | null | undefined): string {
  if (!uf) return 'MA'
  const ufUpper = uf.toUpperCase().trim()
  return UF_MAP[ufUpper] || (ufUpper.length === 2 ? ufUpper : 'MA')
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const orderId = params.id

    // Validar configurações de NF-e
    const nfeConfig = await prisma.systemConfig.findFirst({
      where: { key: 'nfe_config' },
    })

    if (!nfeConfig) {
      return NextResponse.json(
        { 
          error: 'Configurações de NF-e não encontradas', 
          details: 'Configure a emissão de NF-e em Configurações > Nota Fiscal'
        },
        { status: 400 }
      )
    }

    const config = JSON.parse(nfeConfig.value)

    // Validar campos essenciais
    if (!config.emitenteCnpj || !config.emitenteRazaoSocial || !config.emitenteInscricaoEstadual) {
      return NextResponse.json(
        { 
          error: 'Dados do emissor incompletos', 
          details: 'Configure CNPJ, Razão Social e Inscrição Estadual'
        },
        { status: 400 }
      )
    }

    if (!config.certificadoTipo || !config.certificadoArquivo || !config.certificadoSenha) {
      return NextResponse.json(
        { 
          error: 'Certificado digital não configurado', 
          details: 'Configure o certificado digital A1 ou A3'
        },
        { status: 400 }
      )
    }

    // Validar credenciais do provedor
    const provedor = config.provedor || 'nfeio'
    if (provedor === 'nfeio' && (!config.nfeioApiKey || !config.nfeioCompanyId)) {
      return NextResponse.json(
        { 
          error: 'Credenciais do provedor NFe.io não configuradas', 
          details: 'Configure API Key e Company ID do NFe.io'
        },
        { status: 400 }
      )
    }

    // Buscar pedido com itens e informações necessárias
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Verificar se já foi separado
    if (!order.separatedAt) {
      return NextResponse.json(
        { error: 'Pedido precisa estar separado para emitir NF-e' },
        { status: 400 }
      )
    }

    // Verificar se já foi embalado
    if (order.packedAt) {
      return NextResponse.json(
        { error: 'Pedido já foi embalado. NF-e deve ser emitida antes de embalar.' },
        { status: 400 }
      )
    }

    // Verificar se já tem NF-e emitida
    const existingInvoice = await prisma.invoice.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' }, // Pegar a mais recente
    })

    if (existingInvoice && existingInvoice.status !== 'ERROR') {
      return NextResponse.json(
        { error: 'Pedido já possui nota fiscal emitida' },
        { status: 400 }
      )
    }

    // Se houver invoice com ERROR, vamos deletar para evitar duplicatas
    // e criar uma nova com os dados atualizados
    if (existingInvoice && existingInvoice.status === 'ERROR') {
      console.log(`[NF-e] Removendo invoice anterior com erro: ${existingInvoice.id}`)
      await prisma.invoice.delete({
        where: { id: existingInvoice.id }
      })
    }

    // Determinar tipo de NF-e baseado nos produtos
    const hasDropProducts = order.items.some((item: any) => item.itemType === 'DROP')
    const hasSellerProducts = order.items.some((item: any) => item.sellerId)
    const hasAdminProducts = order.items.some(
      (item: any) => item.itemType === 'STOCK' && !item.sellerId
    )

    // Regra: se tem produtos do vendedor, nota é SELLER, senão é ADMIN
    const invoiceType: InvoiceType = hasSellerProducts ? 'SELLER' : 'ADMIN'

    // Parse do endereço
    let shippingData
    try {
      shippingData = JSON.parse(order.shippingAddress)
    } catch {
      shippingData = {
        name: order.buyerName || 'Cliente',
        cpfCnpj: order.buyerCpf || '',
        street: 'Rua desconhecida',
        number: 'S/N',
        neighborhood: 'Centro',
        city: 'Cidade',
        state: 'SP',
        zipCode: '00000-000',
      }
    }

    // Calcular valores
    const valorProdutos = order.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    const valorFrete = order.shippingCost || 0
    const valorDesconto = order.discountAmount || 0
    const valorTotal = order.total

    // Calcular impostos baseado nas alíquotas configuradas
    const aliquotaIcms = parseFloat(config.aliquotaIcms || '0') / 100
    const aliquotaPis = parseFloat(config.aliquotaPis || '0') / 100
    const aliquotaCofins = parseFloat(config.aliquotaCofins || '0') / 100

    const valorIcms = valorProdutos * aliquotaIcms
    const valorPis = valorProdutos * aliquotaPis
    const valorCofins = valorProdutos * aliquotaCofins

    // Normalizar UF do destinatário (corrige encoding como "SÃ" -> "SP")
    const ufDestinatario = normalizarUF(shippingData.state)
    console.log(`📍 UF Destinatário: "${shippingData.state}" -> "${ufDestinatario}"`)

    // Buscar código IBGE do município do destinatário pelo CEP
    const cepDestinatario = shippingData.zipCode || shippingData.postalCode || ''
    let codigoMunicipioDestinatario = shippingData.cityCode || shippingData.codigoMunicipio
    
    if (!codigoMunicipioDestinatario && cepDestinatario) {
      console.log('🔍 Buscando código IBGE para CEP:', cepDestinatario)
      codigoMunicipioDestinatario = await buscarCodigoIBGEPorCEP(cepDestinatario)
      
      if (codigoMunicipioDestinatario) {
        console.log('✅ Código IBGE encontrado:', codigoMunicipioDestinatario)
      } else {
        // Fallback: usar código da capital do estado
        codigoMunicipioDestinatario = codigosIBGECapitais[ufDestinatario]
        console.log(`⚠️ CEP não encontrado. Usando capital ${ufDestinatario}:`, codigoMunicipioDestinatario)
      }
    }

    // Preparar itens da nota
    const itensNota = order.items.map((item: any) => ({
      descricao: item.product.name,
      quantidade: item.quantity,
      valorUnitario: item.price,
      codigoProduto: item.product.gtin || item.productId,
      ncm: item.product.ncm || '00000000',
      cfop: '5102', // Será sobrescrito baseado no tipo de operação
      unidade: 'UN',
    }))

    // Determinar tipo de operação
    const ufEmitente = config.emitenteEstado || 'MA'
    const tipoOperacao = ufEmitente === ufDestinatario ? 'interna' : 
                         ufDestinatario === 'EX' ? 'exportacao' : 'interestadual'
    
    // Buscar regra de tributação da filial/matriz
    const taxRules = config.taxRules || []
    const regraAplicavel = taxRules.find((r: any) => r.ativo && r.tipoOperacao === tipoOperacao)
    
    if (!regraAplicavel) {
      return NextResponse.json(
        { error: `Regra de tributação não encontrada para operação ${tipoOperacao}. Configure as regras fiscais na filial/matriz.` },
        { status: 400 }
      )
    }
    
    // TUDO vem da regra de tributação
    const naturezaOperacaoNota = regraAplicavel.nome // Ex: "Venda Interna (dentro do estado)"
    const cfopNota = regraAplicavel.cfop
    
    console.log(`📋 Tipo de operação: ${tipoOperacao} (${ufEmitente} -> ${ufDestinatario})`)
    console.log(`📋 Regra aplicada: ${regraAplicavel.nome}`)
    console.log(`📋 CFOP: ${cfopNota}, Natureza: ${naturezaOperacaoNota}`)

    // Criar registro de nota fiscal como PROCESSING com TODOS os dados
    const invoice = await prisma.invoice.create({
      data: {
        orderId,
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
        
        // Dados COMPLETOS do emitente
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
        
        // Dados COMPLETOS do destinatário
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
        
        // Natureza da operação e CFOP baseados no tipo de operação
        naturezaOperacao: naturezaOperacaoNota,
        cfop: cfopNota,
      },
    })

    // Tentar emitir nota com o provider
    try {
      const result = await emitirNotaFiscal(invoice.id)

      // O emitirNotaFiscal já salvou tudo no banco via emitirNFeSefaz
      // Apenas recarregar a nota atualizada
      const invoiceAtualizada = await prisma.invoice.findUnique({
        where: { id: invoice.id }
      })

      console.log(`[NF-e Emitida] Pedido ${order.id} - Nota ${result.invoiceNumber || invoiceAtualizada?.invoiceNumber}`)

      return NextResponse.json({
        success: true,
        invoice: {
          id: invoice.id,
          number: result.invoiceNumber,
          accessKey: result.accessKey,
          pdfUrl: result.pdfUrl,
          type: invoiceType,
        },
      })
    } catch (providerError: any) {
      // Atualizar nota com erro
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'ERROR',
          errorMessage: providerError.message || 'Erro ao emitir nota fiscal',
        },
      })

      console.error(`[NF-e Erro] Pedido ${order.id}:`, providerError)

      return NextResponse.json(
        {
          error: 'Erro ao emitir nota fiscal',
          details: providerError.message,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[Emitir NF-e] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    )
  }
}
