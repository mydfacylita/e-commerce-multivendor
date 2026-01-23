import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shipping/free-shipping-info
 * Retorna informações sobre frete grátis disponível
 * API pública para exibir no app
 */
export async function GET() {
  try {
    // Buscar regras de frete ativas com frete grátis configurado
    const rules = await prisma.shippingRule.findMany({
      where: {
        isActive: true,
        freeShippingMin: {
          not: null,
          gt: 0
        }
      },
      orderBy: [
        { freeShippingMin: 'asc' }, // Menor valor primeiro
        { priority: 'desc' }
      ]
    })

    if (rules.length === 0) {
      // Buscar config global de frete grátis
      const globalConfig = await prisma.systemConfig.findFirst({
        where: { key: 'ecommerce.freeShippingMin' }
      })

      if (globalConfig && parseFloat(globalConfig.value) > 0) {
        return NextResponse.json({
          hasFreeShipping: true,
          global: {
            minValue: parseFloat(globalConfig.value),
            region: null // Não especificar região para config global
          },
          rules: []
        })
      }

      return NextResponse.json({
        hasFreeShipping: false,
        global: null,
        rules: []
      })
    }

    // Mapear regiões para nomes legíveis
    const stateNames: Record<string, string> = {
      'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
      'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
      'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
      'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
      'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
      'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
      'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
    }

    const macroRegions: Record<string, string[]> = {
      'sudeste': ['SP', 'RJ', 'MG', 'ES'],
      'sul': ['PR', 'SC', 'RS'],
      'nordeste': ['BA', 'CE', 'PE', 'MA', 'PB', 'RN', 'AL', 'SE', 'PI'],
      'norte': ['AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO'],
      'centro-oeste': ['GO', 'MT', 'MS', 'DF']
    }

    const formattedRules = rules.map(rule => {
      let regions: string[] = []
      try {
        regions = JSON.parse(rule.regions || '[]')
      } catch {
        regions = []
      }

      let regionLabel: string | null = null
      
      if (rule.regionType === 'state' && regions.length > 0) {
        if (regions.length === 1) {
          regionLabel = stateNames[regions[0]] || regions[0]
        } else if (regions.length <= 3) {
          regionLabel = regions.map(r => stateNames[r] || r).join(', ')
        } else {
          // Verificar se é uma macro região
          for (const [macro, states] of Object.entries(macroRegions)) {
            const allStatesMatch = states.every(s => regions.includes(s))
            const onlyTheseStates = regions.every(r => states.includes(r))
            if (allStatesMatch && onlyTheseStates) {
              regionLabel = `Região ${macro.charAt(0).toUpperCase() + macro.slice(1)}`
              break
            }
          }
          if (!regionLabel) {
            regionLabel = `${regions.length} estados`
          }
        }
      } else if (rule.regionType === 'cep_range') {
        regionLabel = 'Região específica'
      } else if (rule.regionType === 'city') {
        if (regions.length === 1) {
          regionLabel = regions[0]
        } else {
          regionLabel = `${regions.length} cidades`
        }
      }
      // Se não tem região definida, fica null

      return {
        id: rule.id,
        name: rule.name,
        minValue: rule.freeShippingMin,
        region: regionLabel,
        regionType: rule.regionType,
        deliveryDays: rule.deliveryDays
      }
    })

    // Pegar a regra com menor valor mínimo
    const bestRule = formattedRules[0]

    return NextResponse.json({
      hasFreeShipping: true,
      global: null,
      bestOffer: bestRule,
      rules: formattedRules
    })
  } catch (error: any) {
    console.error('[FreeShippingInfo] Erro:', error)
    return NextResponse.json({
      hasFreeShipping: false,
      global: null,
      rules: [],
      error: error.message
    })
  }
}
