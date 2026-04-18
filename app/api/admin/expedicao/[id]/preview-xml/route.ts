import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { gerarXMLNFe, gerarChaveAcesso, assinarXML } from '@/lib/sefaz-nfe'
import { buscarCodigoIBGEPorCEP, codigosIBGECapitais } from '@/lib/ibge'

export const dynamic = 'force-dynamic'

const UF_MAP: Record<string, string> = {
  'AC': 'AC', 'AL': 'AL', 'AP': 'AP', 'AM': 'AM', 'BA': 'BA', 'CE': 'CE',
  'DF': 'DF', 'ES': 'ES', 'GO': 'GO', 'MA': 'MA', 'MT': 'MT', 'MS': 'MS',
  'MG': 'MG', 'PA': 'PA', 'PB': 'PB', 'PR': 'PR', 'PE': 'PE', 'PI': 'PI',
  'RJ': 'RJ', 'RN': 'RN', 'RS': 'RS', 'RO': 'RO', 'RR': 'RR', 'SC': 'SC',
  'SP': 'SP', 'SE': 'SE', 'TO': 'TO',
  'SÃ': 'SP', 'SA': 'SP', 'SAO': 'SP',
  'SAO PAULO': 'SP', 'SÃO PAULO': 'SP',
  'MARANHAO': 'MA', 'MARANHÃO': 'MA',
}

function normalizarUF(uf: string | null | undefined): string {
  if (!uf) return 'MA'
  const ufUpper = uf.toUpperCase().trim()
  return UF_MAP[ufUpper] || (ufUpper.length === 2 ? ufUpper : 'MA')
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const orderId = params.id
    const url = new URL(req.url)
    const assinado = url.searchParams.get('assinado') === '1'

    // Buscar config NF-e
    const nfeConfig = await prisma.systemConfig.findFirst({
      where: { key: 'nfe_config' },
    })

    if (!nfeConfig) {
      return NextResponse.json({ error: 'Configuração NF-e não encontrada' }, { status: 400 })
    }

    const config = JSON.parse(nfeConfig.value)

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        user: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Parse endereço
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

    const valorProdutos = order.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    const valorFrete = order.shippingCost || 0
    const valorDesconto = order.discountAmount || 0
    const valorTotal = order.total

    const aliquotaIcms = parseFloat(config.aliquotaIcms || '0') / 100
    const aliquotaPis = parseFloat(config.aliquotaPis || '0') / 100
    const aliquotaCofins = parseFloat(config.aliquotaCofins || '0') / 100

    const valorIcms = valorProdutos * aliquotaIcms
    const valorPis = valorProdutos * aliquotaPis
    const valorCofins = valorProdutos * aliquotaCofins

    const ufDestinatario = normalizarUF(shippingData.state)
    const cepDestinatario = shippingData.zipCode || shippingData.postalCode || ''
    let codigoMunicipioDestinatario = shippingData.cityCode || shippingData.codigoMunicipio

    if (!codigoMunicipioDestinatario && cepDestinatario) {
      codigoMunicipioDestinatario = await buscarCodigoIBGEPorCEP(cepDestinatario)
      if (!codigoMunicipioDestinatario) {
        codigoMunicipioDestinatario = codigosIBGECapitais[ufDestinatario]
      }
    }

    const ufEmitente = config.emitenteEstado || 'MA'
    const tipoOperacao = ufEmitente === ufDestinatario ? 'interna' :
                         ufDestinatario === 'EX' ? 'exportacao' : 'interestadual'

    const taxRules = config.taxRules || []
    const regraAplicavel = taxRules.find((r: any) => r.ativo && r.tipoOperacao === tipoOperacao)

    if (!regraAplicavel) {
      return NextResponse.json(
        { error: `Regra de tributação não encontrada para operação ${tipoOperacao}` },
        { status: 400 }
      )
    }

    // Montar objeto invoice simulado (sem salvar no banco)
    const invoiceData: any = {
      series: config.serieNfe || '1',
      invoiceNumber: '999999', // Número fictício para preview
      valorTotal,
      valorProdutos,
      valorFrete,
      valorDesconto,
      valorIcms,
      valorPis,
      valorCofins,
      emitenteCnpj: config.emitenteCnpj,
      emitenteNome: config.emitenteRazaoSocial,
      emitenteIE: config.emitenteInscricaoEstadual,
      emitenteCRT: config.emitenteCrt || '1',
      emitenteLogradouro: config.emitenteLogradouro,
      emitenteNumero: config.emitenteNumero,
      emitenteBairro: config.emitenteBairro,
      emitenteMunicipio: config.emitenteCidade,
      emitenteMunicipioCod: config.codigoMunicipio,
      emitenteUF: config.emitenteEstado,
      emitenteCEP: config.emitenteCep?.replace(/\D/g, ''),
      destinatarioNome: shippingData.name || order.buyerName || 'Cliente',
      destinatarioCpf: (shippingData.cpfCnpj || order.buyerCpf || '').length <= 11 ? (shippingData.cpfCnpj || order.buyerCpf) : null,
      destinatarioCnpj: (shippingData.cpfCnpj || order.buyerCpf || '').length > 11 ? (shippingData.cpfCnpj || order.buyerCpf) : null,
      destinatarioLogradouro: shippingData.street || shippingData.address || 'Não informado',
      destinatarioNumero: shippingData.number || 'S/N',
      destinatarioBairro: shippingData.neighborhood || shippingData.district || 'Centro',
      destinatarioMunicipio: shippingData.city || 'Não informado',
      destinatarioMunicipioCod: codigoMunicipioDestinatario,
      destinatarioUF: ufDestinatario,
      destinatarioCEP: (shippingData.zipCode || shippingData.postalCode || '')?.replace(/\D/g, ''),
      naturezaOperacao: regraAplicavel.nome,
      cfop: regraAplicavel.cfop,
      order: {
        items: order.items,
      },
    }

    // Gerar chave de acesso (fictícia para preview)
    const now = new Date()
    const chaveAcesso = gerarChaveAcesso(
      ufEmitente,
      now.getFullYear(),
      now.getMonth() + 1,
      config.emitenteCnpj,
      config.serieNfe || '1',
      999999
    )

    // Gerar XML
    let xml = gerarXMLNFe(invoiceData, chaveAcesso, config)

    // Se pediu assinado, assinar
    if (assinado && config.certificadoArquivo && config.certificadoSenha) {
      try {
        xml = assinarXML(xml, config.certificadoArquivo, config.certificadoSenha)
      } catch (err: any) {
        return NextResponse.json({ error: `Erro ao assinar: ${err.message}` }, { status: 500 })
      }
    }

    // Retornar como XML para download
    const filename = `nfe-preview-${orderId.substring(0, 8)}.xml`
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error: any) {
    console.error('[Preview XML] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar preview do XML', details: error.message },
      { status: 500 }
    )
  }
}
