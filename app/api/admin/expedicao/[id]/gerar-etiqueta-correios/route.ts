import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { correiosCWS } from '@/lib/correios-cws'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/admin/expedicao/[id]/gerar-etiqueta-correios
 * Gera etiqueta oficial dos Correios com código de rastreio via API REST CWS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = params

    // Buscar pedido com dados completos (incluindo nota fiscal)
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        invoices: {
          where: {
            status: 'ISSUED',
            accessKey: { not: null }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Buscar embalagem se houver packagingBoxId
    let packagingBox: { 
      name: string
      outerLength: number
      outerWidth: number
      outerHeight: number
      emptyWeight: number 
    } | null = null
    if (order.packagingBoxId) {
      packagingBox = await prisma.packagingBox.findUnique({
        where: { id: order.packagingBoxId },
        select: {
          name: true,
          outerLength: true,
          outerWidth: true,
          outerHeight: true,
          emptyWeight: true
        }
      })
    }

    // Se já tem código de rastreio, retornar
    if (order.trackingCode) {
      return NextResponse.json({
        success: true,
        message: 'Pedido já possui código de rastreio',
        codigoRastreio: order.trackingCode
      })
    }

    // Buscar dados da empresa do systemConfig (configurações gerais)
    const siteConfigs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            'site.name',
            'site.cnpj',
            'site.address',
            'site.phone',
            'site.email',
            'correios.cepOrigem'
          ]
        }
      }
    })

    const configMap: Record<string, string> = {}
    siteConfigs.forEach(c => {
      configMap[c.key] = c.value
    })

    // Fazer parse do endereço completo (formato: "RUA: xxx\nBairro: xxx\nCEP: xxx\nCidade: xxx - UF")
    const addressRaw = configMap['site.address'] || ''
    let logradouro = ''
    let numero = 'S/N'
    let bairro = ''
    let cep = ''
    let cidade = ''
    let uf = ''

    // Parse linha a linha
    const addressLines = addressRaw.split('\n')
    for (const line of addressLines) {
      const trimmed = line.trim()
      if (trimmed.toLowerCase().startsWith('rua:') || trimmed.toLowerCase().startsWith('av:') || trimmed.toLowerCase().startsWith('avenida:')) {
        // Linha do logradouro: "RUA: Av. Dos Holandeses Nº 15"
        logradouro = trimmed.replace(/^(RUA|AV|AVENIDA):\s*/i, '').trim()
        // Extrair número
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
        // "Cidade: São Luis - MA"
        const cidadeMatch = trimmed.replace(/^cidade:\s*/i, '').match(/^(.+?)\s*-\s*(\w{2})$/)
        if (cidadeMatch) {
          cidade = cidadeMatch[1].trim()
          uf = cidadeMatch[2].toUpperCase()
        } else {
          cidade = trimmed.replace(/^cidade:\s*/i, '').trim()
        }
      }
    }

    // Fallback para CEP de origem do Correios
    const cepOrigem = configMap['correios.cepOrigem']?.replace(/\D/g, '') || cep

    const empresa = {
      name: configMap['site.name'] || 'Loja',
      cnpj: configMap['site.cnpj']?.replace(/\D/g, '') || '',
      address: logradouro || 'Endereço não informado',
      number: numero,
      complement: '',
      neighborhood: bairro || 'Centro',
      city: cidade || 'São Luís',
      state: uf || 'MA',
      zipCode: cep || cepOrigem,
      phone: configMap['site.phone'] || '',
      email: configMap['site.email'] || '',
      cepOrigem: cepOrigem
    }

    console.log('[GerarEtiqueta] Dados da empresa:', empresa)

    // Determinar código de serviço
    let codigoServico = '03298' // PAC por padrão
    if (order.shippingMethod?.toLowerCase().includes('sedex')) {
      codigoServico = '03220' // SEDEX
    }

    // Calcular peso e dimensões do pedido
    let pesoTotal = 0
    let alturaMax = 2
    let larguraMax = 11
    let comprimentoMax = 16

    // Calcular peso total dos produtos
    for (const item of order.items) {
      const product = item.product
      if (product) {
        pesoTotal += (product.weight || 300) * item.quantity
      }
    }

    // Se tiver embalagem selecionada, usar dimensões dela
    if (packagingBox) {
      alturaMax = packagingBox.outerHeight
      larguraMax = packagingBox.outerWidth
      comprimentoMax = packagingBox.outerLength
      // Adicionar peso da embalagem
      pesoTotal += packagingBox.emptyWeight
      console.log(`[GerarEtiqueta] Usando embalagem: ${packagingBox.name} (${comprimentoMax}x${larguraMax}x${alturaMax}cm, +${packagingBox.emptyWeight}g)`)
    } else {
      // Fallback: usar dimensões máximas dos produtos
      for (const item of order.items) {
        const product = item.product
        if (product) {
          if (product.height && product.height > alturaMax) alturaMax = product.height
          if (product.width && product.width > larguraMax) larguraMax = product.width
          if (product.length && product.length > comprimentoMax) comprimentoMax = product.length
        }
      }
      console.log(`[GerarEtiqueta] Sem embalagem definida, usando dimensões dos produtos: ${comprimentoMax}x${larguraMax}x${alturaMax}cm`)
    }

    // Garantir peso mínimo
    if (pesoTotal < 300) pesoTotal = 300

    // Parse do endereço de entrega (armazenado como JSON)
    let shippingData: any = {}
    try {
      if (order.shippingAddress) {
        shippingData = JSON.parse(order.shippingAddress)
      }
    } catch (e) {
      console.warn('[GerarEtiqueta] Erro ao fazer parse do shippingAddress:', e)
    }

    // Mapa de estados para converter nome completo em sigla
    const estadoParaUF: Record<string, string> = {
      'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAPÁ': 'AP', 'AMAZONAS': 'AM', 'BAHIA': 'BA',
      'CEARÁ': 'CE', 'DISTRITO FEDERAL': 'DF', 'ESPÍRITO SANTO': 'ES', 'GOIÁS': 'GO',
      'MARANHÃO': 'MA', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG',
      'PARÁ': 'PA', 'PARAÍBA': 'PB', 'PARANÁ': 'PR', 'PERNAMBUCO': 'PE', 'PIAUÍ': 'PI',
      'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS',
      'RONDÔNIA': 'RO', 'RORAIMA': 'RR', 'SANTA CATARINA': 'SC', 'SÃO PAULO': 'SP',
      'SERGIPE': 'SE', 'TOCANTINS': 'TO'
    }

    // Função para converter estado para UF de 2 caracteres
    const getUF = (state: string): string => {
      if (!state) return ''
      const upper = state.toUpperCase().trim()
      // Se já é sigla de 2 caracteres, retornar
      if (upper.length === 2) return upper
      // Tentar converter nome completo
      return estadoParaUF[upper] || upper.substring(0, 2)
    }

    // Buscar dados da nota fiscal (se houver)
    const invoice = order.invoices?.[0]
    const nfeData = invoice?.accessKey ? {
      chave: invoice.accessKey,
      numero: invoice.invoiceNumber || undefined,
      serie: invoice.series || undefined
    } : undefined
    
    if (nfeData) {
      console.log('[GerarEtiqueta] NF-e encontrada:', nfeData.numero, 'Chave:', nfeData.chave?.substring(0, 20) + '...')
    } else {
      console.log('[GerarEtiqueta] Pedido sem NF-e autorizada')
    }

    // Criar pré-postagem via API CWS
    console.log('[GerarEtiqueta] Criando pré-postagem para pedido:', id)
    
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
        nome: empresa.name || 'Loja',
        cnpj: empresa.cnpj || '',
        logradouro: empresa.address || '',
        numero: empresa.number || 'S/N',
        complemento: empresa.complement || '',
        bairro: empresa.neighborhood || '',
        cidade: empresa.city || '',
        uf: empresa.state || '',
        cep: empresa.zipCode || empresa.cepOrigem || '',
        telefone: empresa.phone || '',
        email: empresa.email || ''
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
      return NextResponse.json({
        success: false,
        error: resultado.error || 'Erro ao criar pré-postagem nos Correios'
      }, { status: 400 })
    }

    const codigoRastreio = resultado.codigoRastreio
    const idPrePostagem = resultado.idPrePostagem

    // Atualizar pedido com código de rastreio E ID da pré-postagem
    await prisma.$executeRaw`UPDATE \`order\` SET trackingCode = ${codigoRastreio}, correiosIdPrePostagem = ${idPrePostagem} WHERE id = ${id}`

    console.log('[GerarEtiqueta] Código de rastreio gerado:', codigoRastreio, 'ID Pré-postagem:', idPrePostagem)

    return NextResponse.json({
      success: true,
      codigoRastreio: codigoRastreio,
      idPrePostagem: idPrePostagem,
      message: 'Etiqueta gerada com sucesso!'
    })

  } catch (error: any) {
    console.error('Erro ao gerar etiqueta Correios:', error)
    return NextResponse.json({ 
      error: error.message || 'Erro interno' 
    }, { status: 500 })
  }
}
