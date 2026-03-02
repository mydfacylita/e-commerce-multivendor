/**
 * GET /api/orders/[id]/contrato
 * Gera o contrato de financiamento preenchido com os dados reais.
 * Acessível pelo dono do pedido e por ADMIN.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Converte número para extenso (simplificado)
function numeroParaExtenso(valor: number): string {
  const partes = valor.toFixed(2).split('.')
  const reais = parseInt(partes[0])
  const centavos = parseInt(partes[1])

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
  const centenas = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
    'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

  function menorQue1000(n: number): string {
    if (n === 0) return ''
    if (n === 100) return 'cem'
    const c = Math.floor(n / 100)
    const resto = n % 100
    const d = Math.floor(resto / 10)
    const u = resto % 10

    let result = ''
    if (c > 0) result += centenas[c]
    if (c > 0 && resto > 0) result += ' e '
    if (resto < 20) result += unidades[resto]
    else {
      result += dezenas[d]
      if (u > 0) result += ' e ' + unidades[u]
    }
    return result
  }

  const milhar = Math.floor(reais / 1000)
  const centena = reais % 1000
  let textoReais = ''

  if (milhar > 0) textoReais += menorQue1000(milhar) + (milhar === 1 ? ' mil' : ' mil')
  if (milhar > 0 && centena > 0) textoReais += ' e '
  if (centena > 0) textoReais += menorQue1000(centena)
  if (!textoReais) textoReais = 'zero'

  textoReais += reais === 1 ? ' real' : ' reais'

  if (centavos > 0) {
    textoReais += ' e ' + menorQue1000(centavos) + (centavos === 1 ? ' centavo' : ' centavos')
  }

  return textoReais
}

function ordinalParcela(n: number): string {
  const ord = ['primeira', 'segunda', 'terceira', 'quarta', 'quinta', 'sexta',
    'sétima', 'oitava', 'nona', 'décima', 'décima primeira', 'décima segunda']
  return ord[n - 1] || `${n}ª`
}

function extensoParcelas(n: number): string {
  const nomes = ['', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito',
    'nove', 'dez', 'onze', 'doze']
  return nomes[n] || String(n)
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const isAdmin = (session.user as any).role === 'ADMIN'
  const userId = (session.user as any).id

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      carne: {
        include: {
          parcelas: { orderBy: { numero: 'asc' } },
        },
      },
    },
  })

  if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  if (!isAdmin && order.userId !== userId) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  if (!order.carne) return NextResponse.json({ error: 'Este pedido não possui carnê' }, { status: 400 })

  // Buscar configurações
  const configs = await prisma.systemConfig.findMany({
    where: { key: { in: [
      'site.name', 'site.cnpj', 'site.address',
      'financing.name', 'financing.interestRate',
      'financing.lateFeePercent', 'financing.lateInterestPercent',
      'financing.rescissionDays', 'financing.forum',
    ]}},
  })

  const cfg: Record<string, string> = {}
  configs.forEach(c => { try { cfg[c.key] = JSON.parse(c.value) } catch { cfg[c.key] = c.value } })

  const carne = order.carne
  const parcela1 = carne.parcelas[0]
  const totalValue = carne.totalValue
  const totalWithInterest = carne.totalWithInterest ?? totalValue
  const valorParcela = carne.parcelas[0]?.valor ?? 0
  const numParcelas = carne.parcelas.length
  const diaVencimento = parcela1 ? new Date(parcela1.dueDate).getDate() : 1
  const primeiroVenc = parcela1
    ? new Date(parcela1.dueDate).toLocaleDateString('pt-BR')
    : ''

  const credoraNome = cfg['financing.name'] || cfg['site.name'] || 'MYDSHOP'
  const credoraCnpj = cfg['site.cnpj'] || '____________'
  const credoraEndereco = cfg['site.address'] || '__________________________'
  const foro = cfg['financing.forum'] || '__________________'
  const taxaJuros = carne.interestRate > 0 ? `${carne.interestRate}` : '0'
  const multaPct = cfg['financing.lateFeePercent'] || '2'
  const jurosMoraPct = cfg['financing.lateInterestPercent'] || '1'
  const diasRescisao = cfg['financing.rescissionDays'] || '30'
  const diasAtraso = cfg['financing.rescissionDays'] || '30'

  const dataContrato = carne.financingAcceptedAt
    ? new Date(carne.financingAcceptedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  // Número do pedido formatado
  const numeroPedido = order.id.slice(-8).toUpperCase()

  const compradorNome = carne.buyerName || order.buyerName || '____________'
  const compradorCpf = carne.buyerCpf || order.buyerCpf || '____________'

  // Formato de pagamento das parcelas
  const formasPagamento = ['Pix', 'Transferência Bancária', 'Dinheiro']

  const contract = {
    // Metadados
    orderId: order.id,
    numeroPedido,
    acceptedAt: carne.financingAcceptedAt,
    generatedAt: new Date().toISOString(),

    // Partes
    credora: {
      nome: credoraNome,
      cnpj: credoraCnpj,
      endereco: credoraEndereco,
    },
    devedor: {
      nome: compradorNome,
      cpf: compradorCpf,
    },

    // Financeiro
    totalValue,
      totalWithInterest,
    valorParcela,
    numParcelas,
    taxaJuros: carne.interestRate,
    diaVencimento,
    primeiroVencimento: primeiroVenc,
    parcelas: carne.parcelas.map(p => ({
      numero: p.numero,
      valor: p.valor,
      dueDate: new Date(p.dueDate).toLocaleDateString('pt-BR'),
      status: p.status,
      paidAt: p.paidAt ? new Date(p.paidAt).toLocaleDateString('pt-BR') : null,
    })),

    // Cláusulas preenchidas
    clausulas: [
      {
        numero: 1,
        titulo: 'DO OBJETO',
        itens: [
          `1.1. O presente contrato tem por objeto a concessão de crédito direto ao consumidor pela CREDORA ao(à) DEVEDOR(A), destinado à aquisição de produtos ofertados na plataforma ${credoraNome}.`,
          `1.2. O valor total da compra financiada é de R$ ${fmt(totalValue)} (${numeroParaExtenso(totalValue)}), referente aos produtos descritos no pedido nº ${numeroPedido}.`,
        ],
      },
      {
        numero: 2,
        titulo: 'DO VALOR FINANCIADO E CONDIÇÕES DE PAGAMENTO',
        itens: [
          `2.1. O valor financiado será de R$ ${fmt(totalValue)} (${numeroParaExtenso(totalValue)}).`,
          `2.2. O pagamento será realizado em ${numParcelas} (${extensoParcelas(numParcelas)}) parcelas mensais e sucessivas de R$ ${fmt(valorParcela)} (${numeroParaExtenso(valorParcela)}), com vencimento todo dia ${diaVencimento} de cada mês, iniciando-se em ${primeiroVenc}.`,
          carne.interestRate > 0
            ? `2.3. Incide taxa de juros de ${taxaJuros}% ao mês (juros compostos), já incluída no valor das parcelas. Total a ser pago: R$ ${fmt(totalWithInterest)} (${numeroParaExtenso(totalWithInterest)}).`
            : `2.3. Não incide taxa de juros neste financiamento. O valor total a ser pago é de R$ ${fmt(totalWithInterest)} (${numeroParaExtenso(totalWithInterest)}).`,
          `2.4. O pagamento deverá ser realizado por meio de: ${formasPagamento.join(', ')}.`,
        ],
      },
      {
        numero: 3,
        titulo: 'DOS ENCARGOS POR INADIMPLEMENTO',
        itens: [
          `3.1. O não pagamento de qualquer parcela na data do vencimento implicará: (a) Multa moratória de ${multaPct}% sobre o valor da parcela em atraso; (b) Juros de mora de ${jurosMoraPct}% ao mês, calculados pro rata die; (c) Correção monetária conforme índice IPCA.`,
          `3.2. O atraso superior a ${diasAtraso} dias poderá ensejar: suspensão de novos créditos; inscrição do nome do(a) DEVEDOR(A) nos órgãos de proteção ao crédito; cobrança judicial ou extrajudicial do débito.`,
        ],
      },
      {
        numero: 4,
        titulo: 'DA ANÁLISE E CONCESSÃO DE CRÉDITO',
        itens: [
          `4.1. A concessão do crédito está sujeita à análise prévia cadastral e financeira do(a) DEVEDOR(A) pelo(a) ${credoraNome}.`,
          `4.2. A CREDORA poderá solicitar documentos complementares e comprovantes de renda a qualquer momento durante a vigência deste contrato.`,
        ],
      },
      {
        numero: 5,
        titulo: 'DA ANTECIPAÇÃO E QUITAÇÃO',
        itens: [
          `5.1. O(A) DEVEDOR(A) poderá antecipar parcelas ou quitar integralmente o contrato a qualquer momento, mediante solicitação formal ao(à) ${credoraNome}.`,
          `5.2. Em caso de quitação antecipada, será concedido desconto proporcional dos juros futuros, conforme legislação vigente (Lei nº 14.905/2024).`,
        ],
      },
      {
        numero: 6,
        titulo: 'DA RESCISÃO',
        itens: [
          `6.1. O presente contrato poderá ser rescindido: (a) Por comum acordo entre as partes; (b) Em caso de inadimplemento superior a ${diasRescisao} dias; (c) Por fraude ou informações cadastrais falsas fornecidas pelo(a) DEVEDOR(A).`,
        ],
      },
      {
        numero: 7,
        titulo: 'DAS DISPOSIÇÕES GERAIS',
        itens: [
          `7.1. O presente contrato constitui título executivo extrajudicial, nos termos do Código de Processo Civil (art. 784, III).`,
          `7.2. O(A) DEVEDOR(A) declara ter lido, compreendido e aceito todas as cláusulas e condições deste contrato, incluindo encargos por inadimplemento e condições de rescisão.`,
          `7.3. Aplica-se a este contrato o Código de Defesa do Consumidor (Lei nº 8.078/1990) e demais legislações aplicáveis, em especial a Lei nº 14.905/2024 sobre correção monetária.`,
        ],
      },
      {
        numero: 8,
        titulo: 'DO FORO',
        itens: [
          `8.1. Fica eleito o foro da Comarca de ${foro}, com renúncia a qualquer outro, por mais privilegiado que seja, para dirimir eventuais controvérsias decorrentes deste contrato.`,
        ],
      },
    ],

    assinatura: {
      local: foro || credoraEndereco,
      data: dataContrato,
      credora: credoraNome,
      devedor: compradorNome,
    },
  }

  return NextResponse.json({ contract })
}
