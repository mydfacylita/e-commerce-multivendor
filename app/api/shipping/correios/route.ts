import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Códigos de serviço dos Correios
const SERVICOS_CORREIOS = {
  SEDEX: '04014',
  PAC: '04510',
  SEDEX_10: '40215',
  SEDEX_12: '40169',
  SEDEX_HOJE: '40290',
  // Versões com contrato
  SEDEX_CONTRATO: '04162',
  PAC_CONTRATO: '04669',
}

interface CotacaoRequest {
  cepOrigem: string
  cepDestino: string
  peso: number // em kg
  comprimento: number // em cm
  altura: number // em cm
  largura: number // em cm
  valor?: number // valor declarado
  maoPropria?: boolean
  avisoRecebimento?: boolean
}

/**
 * POST /api/shipping/correios
 * Consulta frete nos Correios
 */
export async function POST(request: NextRequest) {
  try {
    const body: CotacaoRequest = await request.json()
    const { cepOrigem, cepDestino, peso, comprimento, altura, largura, valor } = body

    if (!cepOrigem || !cepDestino) {
      return NextResponse.json({ error: 'CEP de origem e destino são obrigatórios' }, { status: 400 })
    }

    // Buscar configurações dos Correios
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'correios.' } }
    })

    const configMap: Record<string, string> = {}
    configs.forEach((c: { key: string; value: string }) => {
      configMap[c.key.replace('correios.', '')] = c.value
    })

    // Determinar quais serviços consultar
    const servicosParaConsultar: { nome: string; codigo: string }[] = []
    
    if (configMap['servicoPac'] !== 'false') {
      servicosParaConsultar.push({ nome: 'PAC', codigo: SERVICOS_CORREIOS.PAC })
    }
    if (configMap['servicoSedex'] !== 'false') {
      servicosParaConsultar.push({ nome: 'SEDEX', codigo: SERVICOS_CORREIOS.SEDEX })
    }
    if (configMap['servicoSedex10'] === 'true') {
      servicosParaConsultar.push({ nome: 'SEDEX 10', codigo: SERVICOS_CORREIOS.SEDEX_10 })
    }
    if (configMap['servicoSedex12'] === 'true') {
      servicosParaConsultar.push({ nome: 'SEDEX 12', codigo: SERVICOS_CORREIOS.SEDEX_12 })
    }
    if (configMap['servicoSedexHoje'] === 'true') {
      servicosParaConsultar.push({ nome: 'SEDEX Hoje', codigo: SERVICOS_CORREIOS.SEDEX_HOJE })
    }

    // Se nenhum serviço selecionado, usar PAC e SEDEX padrão
    if (servicosParaConsultar.length === 0) {
      servicosParaConsultar.push(
        { nome: 'PAC', codigo: SERVICOS_CORREIOS.PAC },
        { nome: 'SEDEX', codigo: SERVICOS_CORREIOS.SEDEX }
      )
    }

    // Consultar cada serviço
    const resultados = await Promise.all(
      servicosParaConsultar.map(async (servico) => {
        try {
          const resultado = await consultarCorreios({
            cepOrigem: cepOrigem.replace(/\D/g, ''),
            cepDestino: cepDestino.replace(/\D/g, ''),
            peso,
            comprimento,
            altura,
            largura,
            valor: valor || 0,
            codigoServico: servico.codigo
          })

          return {
            servico: servico.nome,
            codigo: servico.codigo,
            valor: resultado.valor,
            prazo: resultado.prazo,
            erro: resultado.erro
          }
        } catch (error: any) {
          return {
            servico: servico.nome,
            codigo: servico.codigo,
            valor: 0,
            prazo: 0,
            erro: error.message || 'Erro ao consultar'
          }
        }
      })
    )

    return NextResponse.json({ resultados })
  } catch (error) {
    console.error('Erro na cotação Correios:', error)
    return NextResponse.json({ error: 'Erro ao consultar frete' }, { status: 500 })
  }
}

/**
 * Consulta frete usando a API pública dos Correios (sem contrato)
 */
async function consultarCorreios(params: {
  cepOrigem: string
  cepDestino: string
  peso: number
  comprimento: number
  altura: number
  largura: number
  valor: number
  codigoServico: string
}): Promise<{ valor: number; prazo: number; erro?: string }> {
  const { cepOrigem, cepDestino, peso, comprimento, altura, largura, valor, codigoServico } = params

  // Garantir dimensões mínimas (Correios exige mínimo)
  const pesoFinal = Math.max(peso, 0.3) // mínimo 300g
  const comprimentoFinal = Math.max(comprimento, 16) // mínimo 16cm
  const alturaFinal = Math.max(altura, 2) // mínimo 2cm
  const larguraFinal = Math.max(largura, 11) // mínimo 11cm
  
  // URL da API de calculador dos Correios (sem autenticação)
  const url = new URL('http://ws.correios.com.br/calculador/CalcPrecoPrazo.aspx')
  
  url.searchParams.set('nCdEmpresa', '') // Sem contrato
  url.searchParams.set('sDsSenha', '')
  url.searchParams.set('nCdServico', codigoServico)
  url.searchParams.set('sCepOrigem', cepOrigem)
  url.searchParams.set('sCepDestino', cepDestino)
  url.searchParams.set('nVlPeso', pesoFinal.toString())
  url.searchParams.set('nCdFormato', '1') // Caixa/pacote
  url.searchParams.set('nVlComprimento', comprimentoFinal.toString())
  url.searchParams.set('nVlAltura', alturaFinal.toString())
  url.searchParams.set('nVlLargura', larguraFinal.toString())
  url.searchParams.set('nVlDiametro', '0')
  url.searchParams.set('sCdMaoPropria', 'N')
  url.searchParams.set('nVlValorDeclarado', valor > 0 ? valor.toString() : '0')
  url.searchParams.set('sCdAvisoRecebimento', 'N')
  url.searchParams.set('StrRetorno', 'xml')

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'text/xml',
      },
      // Timeout de 10 segundos
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const xml = await response.text()
    
    // Parse simples do XML
    const valorMatch = xml.match(/<Valor>([^<]+)<\/Valor>/)
    const prazoMatch = xml.match(/<PrazoEntrega>([^<]+)<\/PrazoEntrega>/)
    const erroMatch = xml.match(/<MsgErro>([^<]*)<\/MsgErro>/)

    if (erroMatch && erroMatch[1].trim()) {
      return { valor: 0, prazo: 0, erro: erroMatch[1].trim() }
    }

    const valorStr = valorMatch ? valorMatch[1].replace(',', '.') : '0'
    const prazoStr = prazoMatch ? prazoMatch[1] : '0'

    return {
      valor: parseFloat(valorStr),
      prazo: parseInt(prazoStr)
    }
  } catch (error: any) {
    console.error('Erro ao consultar Correios:', error)
    
    // Fallback: usar estimativa baseada em distância
    return calcularFreteEstimado(cepOrigem, cepDestino, pesoFinal, codigoServico)
  }
}

/**
 * Calcula frete estimado quando API dos Correios está indisponível
 */
function calcularFreteEstimado(
  cepOrigem: string,
  cepDestino: string,
  peso: number,
  codigoServico: string
): { valor: number; prazo: number; erro?: string } {
  // Região do CEP (primeiro dígito indica região)
  const regiaoOrigem = parseInt(cepOrigem[0])
  const regiaoDestino = parseInt(cepDestino[0])
  
  // Distância simplificada (mesma região = local, diferente = nacional)
  const mesmaRegiao = regiaoOrigem === regiaoDestino
  const mesmaCidade = cepOrigem.substring(0, 5) === cepDestino.substring(0, 5)
  
  // Tabela base de preços (aproximada)
  let valorBase: number
  let prazoBase: number
  
  const isSedex = codigoServico.includes('40') || codigoServico === SERVICOS_CORREIOS.SEDEX
  
  if (mesmaCidade) {
    valorBase = isSedex ? 15 : 12
    prazoBase = isSedex ? 1 : 3
  } else if (mesmaRegiao) {
    valorBase = isSedex ? 22 : 18
    prazoBase = isSedex ? 2 : 5
  } else {
    valorBase = isSedex ? 35 : 28
    prazoBase = isSedex ? 3 : 8
  }
  
  // Ajuste por peso
  const pesoExcedente = Math.max(0, peso - 1) // cada kg acima de 1kg
  const adicionalPeso = pesoExcedente * (isSedex ? 8 : 5)
  
  return {
    valor: Math.round((valorBase + adicionalPeso) * 100) / 100,
    prazo: prazoBase,
    erro: undefined
  }
}
