import { prisma } from './prisma'

interface Produto {
  id: string
  nome?: string
  comprimento: number // length
  largura: number     // width
  altura: number      // height
  peso: number        // weight
  quantidade: number
}

interface PackagingBox {
  id: string
  code: string
  name: string
  type: string
  innerLength: number
  innerWidth: number
  innerHeight: number
  outerLength: number
  outerWidth: number
  outerHeight: number
  emptyWeight: number
  maxWeight: number
  cost: number
  priority: number
}

interface ResultadoEmpacotamento {
  sucesso: boolean
  embalagem: PackagingBox | null
  codigoEmbalagem: string
  nomeEmbalagem: string
  pesoTotal: number
  pesoComEmbalagem: number
  volumeOcupado: number
  volumeEmbalagem: number
  ocupacao: number // percentual de ocupação
  custoEmbalagem: number
  mensagem: string
  dimensoesFinais: {
    comprimento: number
    largura: number
    altura: number
    peso: number
  }
}

/**
 * Seleciona a melhor embalagem para um conjunto de produtos
 * Usa algoritmo First Fit Decreasing (FFD) simplificado
 */
export async function selecionarEmbalagem(produtos: Produto[]): Promise<ResultadoEmpacotamento> {
  console.log('📦 [Empacotamento] Iniciando seleção de embalagem...')
  console.log(`   Produtos: ${produtos.length}`)

  // Buscar embalagens ativas ordenadas por volume interno (menor primeiro)
  const embalagens = await prisma.packagingBox.findMany({
    where: { isActive: true },
    orderBy: [
      { priority: 'asc' }, // menor prioridade = menor embalagem
      { innerLength: 'asc' },
      { innerWidth: 'asc' },
      { innerHeight: 'asc' }
    ]
  })

  if (embalagens.length === 0) {
    console.log('⚠️ [Empacotamento] Nenhuma embalagem cadastrada')
    return criarResultadoSemEmbalagem(produtos)
  }

  // Calcular dimensões e peso total dos produtos
  const analise = analisarProdutos(produtos)
  console.log(`   Peso total: ${analise.pesoTotal}kg`)
  console.log(`   Volume total: ${analise.volumeTotal}cm³`)
  console.log(`   Dimensão máxima: ${analise.maiorDimensao}cm`)

  // Tentar encaixar os produtos em cada embalagem
  for (const embalagem of embalagens) {
    const volumeInterno = embalagem.innerLength * embalagem.innerWidth * embalagem.innerHeight
    
    console.log(`   🔍 Testando ${embalagem.code} (${embalagem.name})...`)
    
    // Verificar se peso cabe
    if (analise.pesoTotal > embalagem.maxWeight) {
      console.log(`      ❌ Peso excede máximo (${analise.pesoTotal}kg > ${embalagem.maxWeight}kg)`)
      continue
    }

    // Verificar se volume cabe (com margem de 5% para acomodação)
    if (analise.volumeTotal > volumeInterno * 0.95) {
      console.log(`      ❌ Volume excede capacidade`)
      continue
    }

    // Verificar se cada dimensão dos produtos cabe na embalagem
    // Considerando que o produto pode ser rotacionado
    if (!cabeNaEmbalagem(analise, embalagem)) {
      console.log(`      ❌ Dimensões não cabem`)
      continue
    }

    // Embalagem encontrada!
    const pesoComEmbalagem = analise.pesoTotal + embalagem.emptyWeight
    const ocupacao = (analise.volumeTotal / volumeInterno) * 100

    console.log(`   ✅ Embalagem selecionada: ${embalagem.code}`)
    console.log(`      Ocupação: ${ocupacao.toFixed(1)}%`)
    console.log(`      Peso total c/ embalagem: ${pesoComEmbalagem}kg`)

    return {
      sucesso: true,
      embalagem,
      codigoEmbalagem: embalagem.code,
      nomeEmbalagem: embalagem.name,
      pesoTotal: analise.pesoTotal,
      pesoComEmbalagem: Math.round(pesoComEmbalagem * 100) / 100,
      volumeOcupado: analise.volumeTotal,
      volumeEmbalagem: volumeInterno,
      ocupacao: Math.round(ocupacao * 10) / 10,
      custoEmbalagem: embalagem.cost,
      mensagem: `Usar embalagem ${embalagem.code} - ${embalagem.name}`,
      dimensoesFinais: {
        comprimento: embalagem.outerLength,
        largura: embalagem.outerWidth,
        altura: embalagem.outerHeight,
        peso: Math.round(pesoComEmbalagem * 100) / 100
      }
    }
  }

  // Nenhuma embalagem comporta
  console.log('⚠️ [Empacotamento] Nenhuma embalagem comporta os produtos')
  return criarResultadoSemEmbalagem(produtos)
}

/**
 * Analisa os produtos para calcular dimensões e volumes totais
 */
function analisarProdutos(produtos: Produto[]) {
  let pesoTotal = 0
  let volumeTotal = 0
  let maiorComprimento = 0
  let maiorLargura = 0
  let alturaTotal = 0

  for (const produto of produtos) {
    const qty = produto.quantidade || 1
    
    // Peso
    pesoTotal += (produto.peso || 0.1) * qty

    // Volume de cada item
    const volumeItem = (produto.comprimento || 10) * (produto.largura || 10) * (produto.altura || 5)
    volumeTotal += volumeItem * qty

    // Dimensões (considerando empilhamento vertical)
    maiorComprimento = Math.max(maiorComprimento, produto.comprimento || 10)
    maiorLargura = Math.max(maiorLargura, produto.largura || 10)
    alturaTotal += (produto.altura || 5) * qty
  }

  return {
    pesoTotal: Math.round(pesoTotal * 100) / 100,
    volumeTotal,
    maiorComprimento,
    maiorLargura,
    alturaTotal,
    maiorDimensao: Math.max(maiorComprimento, maiorLargura, alturaTotal)
  }
}

/**
 * Verifica se os produtos cabem na embalagem considerando rotação
 */
function cabeNaEmbalagem(
  analise: ReturnType<typeof analisarProdutos>,
  embalagem: PackagingBox
): boolean {
  const dimensoesProduto = [
    analise.maiorComprimento,
    analise.maiorLargura,
    analise.alturaTotal
  ].sort((a, b) => b - a) // Maior para menor

  const dimensoesEmbalagem = [
    embalagem.innerLength,
    embalagem.innerWidth,
    embalagem.innerHeight
  ].sort((a, b) => b - a) // Maior para menor

  // Cada dimensão do produto deve caber na dimensão correspondente da embalagem
  return dimensoesProduto[0] <= dimensoesEmbalagem[0] &&
         dimensoesProduto[1] <= dimensoesEmbalagem[1] &&
         dimensoesProduto[2] <= dimensoesEmbalagem[2]
}

/**
 * Cria resultado quando não há embalagem disponível
 */
function criarResultadoSemEmbalagem(produtos: Produto[]): ResultadoEmpacotamento {
  const analise = analisarProdutos(produtos)
  
  // Calcular dimensões mínimas necessárias (mínimos dos Correios)
  const comprimentoMin = Math.max(analise.maiorComprimento + 2, 16)
  const larguraMin = Math.max(analise.maiorLargura + 2, 11)
  const alturaMin = Math.max(analise.alturaTotal + 2, 2)

  return {
    sucesso: false,
    embalagem: null,
    codigoEmbalagem: 'CUSTOM',
    nomeEmbalagem: 'Embalagem Personalizada',
    pesoTotal: analise.pesoTotal,
    pesoComEmbalagem: analise.pesoTotal + 0.1, // peso estimado embalagem genérica
    volumeOcupado: analise.volumeTotal,
    volumeEmbalagem: 0,
    ocupacao: 0,
    custoEmbalagem: 0,
    mensagem: 'Nenhuma embalagem padrão comporta. Usar embalagem personalizada.',
    dimensoesFinais: {
      comprimento: comprimentoMin,
      largura: larguraMin,
      altura: alturaMin,
      peso: Math.max(analise.pesoTotal + 0.1, 0.3) // peso mínimo Correios
    }
  }
}

/**
 * Busca embalagem por código
 */
export async function buscarEmbalagemPorCodigo(codigo: string): Promise<PackagingBox | null> {
  return prisma.packagingBox.findUnique({
    where: { code: codigo.toUpperCase() }
  })
}

/**
 * Calcula peso volumétrico (usado por transportadoras)
 * Fórmula: (C x L x A) / 6000 para aéreo, / 3000 para rodoviário
 */
export function calcularPesoVolumetrico(
  comprimento: number,
  largura: number,
  altura: number,
  divisor: number = 6000
): number {
  return (comprimento * largura * altura) / divisor
}

/**
 * Retorna o maior entre peso real e volumétrico
 */
export function calcularPesoCubado(
  pesoReal: number,
  comprimento: number,
  largura: number,
  altura: number
): number {
  const pesoVolumetrico = calcularPesoVolumetrico(comprimento, largura, altura)
  return Math.max(pesoReal, pesoVolumetrico)
}
