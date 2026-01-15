import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-security'
import { PackagingService, PackagingResult } from '@/lib/packaging-service'

export const dynamic = 'force-dynamic'

// Função para identificar estado pelo CEP
function getCepState(cep: string): string | null {
  const cepRanges: { [key: string]: string[][] } = {
    'SP': [['01000000', '19999999']],
    'RJ': [['20000000', '28999999']],
    'ES': [['29000000', '29999999']],
    'MG': [['30000000', '39999999']],
    'BA': [['40000000', '48999999']],
    'SE': [['49000000', '49999999']],
    'PE': [['50000000', '56999999']],
    'AL': [['57000000', '57999999']],
    'PB': [['58000000', '58999999']],
    'RN': [['59000000', '59999999']],
    'CE': [['60000000', '63999999']],
    'PI': [['64000000', '64999999']],
    'MA': [['65000000', '65999999']],
    'PA': [['66000000', '68899999']],
    'AP': [['68900000', '68999999']],
    'AM': [['69000000', '69299999'], ['69400000', '69899999']],
    'RR': [['69300000', '69399999']],
    'AC': [['69900000', '69999999']],
    'DF': [['70000000', '72799999'], ['73000000', '73699999']],
    'GO': [['72800000', '72999999'], ['73700000', '76799999']],
    'TO': [['77000000', '77999999']],
    'MT': [['78000000', '78899999']],
    'RO': [['76800000', '76999999']],
    'MS': [['79000000', '79999999']],
    'PR': [['80000000', '87999999']],
    'SC': [['88000000', '89999999']],
    'RS': [['90000000', '99999999']]
  }

  const cleanCep = cep.replace(/\D/g, '')
  const cepNum = parseInt(cleanCep)

  for (const [state, ranges] of Object.entries(cepRanges)) {
    for (const [min, max] of ranges) {
      if (cepNum >= parseInt(min) && cepNum <= parseInt(max)) {
        return state
      }
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    // 🔐 Validar API Key
    const apiKey = req.headers.get('x-api-key')
    const validation = await validateApiKey(apiKey)
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'API Key inválida' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { cep, cartValue, weight: bodyWeight, products } = body

    if (!cep) {
      return NextResponse.json(
        { message: 'CEP é obrigatório' },
        { status: 400 }
      )
    }

    // Calcular peso e dimensões dos produtos usando o serviço de empacotamento
    let packagingResult: PackagingResult | null = null
    let totalWeight = bodyWeight || 0.3
    let totalLength = 20
    let totalWidth = 15
    let totalHeight = 10

    if (products && Array.isArray(products) && products.length > 0) {
      // Buscar dados completos dos produtos no banco
      const cartProducts = []
      
      for (const item of products) {
        const productId = item.id || item.productId
        if (!productId) continue

        const cleanProductId = productId.split('_')[0]
        const quantity = item.quantity || 1

        const product = await prisma.product.findUnique({
          where: { id: cleanProductId }
        })

        if (product) {
          cartProducts.push({
            id: product.id,
            name: product.name,
            quantity,
            weight: product.weight || 0.3,
            length: product.length || 16,
            width: product.width || 11,
            height: product.height || 5
          })
        } else {
          // Produto não encontrado, usar valores padrão
          cartProducts.push({
            id: cleanProductId,
            name: `Produto ${cleanProductId}`,
            quantity,
            weight: 0.3,
            length: 16,
            width: 11,
            height: 5
          })
        }
      }

      // Usar serviço de empacotamento inteligente
      if (cartProducts.length > 0) {
        packagingResult = await PackagingService.selectBestPackaging(cartProducts)
        
        if (packagingResult.packaging) {
          totalWeight = packagingResult.packaging.totalWeight
          totalLength = packagingResult.packaging.outerLength
          totalWidth = packagingResult.packaging.outerWidth
          totalHeight = packagingResult.packaging.outerHeight
          
          console.log(`📦 Embalagem selecionada: ${packagingResult.packaging.name}`)
          console.log(`   Peso total: ${totalWeight}kg | Dim: ${totalLength}x${totalWidth}x${totalHeight}cm`)
          console.log(`   Peso volumétrico: ${packagingResult.packaging.volumetricWeight.toFixed(2)}kg`)
          console.log(`   Utilização: ${packagingResult.debug.utilizationPercent}%`)
        }
      }
    }

    // Peso mínimo para Correios
    if (totalWeight < 0.3) totalWeight = 0.3
    if (totalLength < 16) totalLength = 16
    if (totalWidth < 11) totalWidth = 11
    if (totalHeight < 2) totalHeight = 2

    console.log(`📦 Frete: CEP=${cep} | Peso=${totalWeight}kg | Dim=${totalLength}x${totalWidth}x${totalHeight}cm`)

    // Buscar regras ativas ordenadas por prioridade
    const rules = await prisma.shippingRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    })

    if (rules.length === 0) {
      return NextResponse.json({
        shippingCost: 0,
        deliveryDays: 7,
        isFree: true,
        message: 'Frete grátis',
        // Campos de transportadora
        shippingMethod: 'propria',
        shippingService: 'Frete Grátis',
        shippingCarrier: 'Entrega Própria'
      })
    }

    // Limpar CEP
    const cleanCep = cep.replace(/\D/g, '')
    console.log('🔍 Calculando frete para CEP:', cleanCep, '| Carrinho:', cartValue, '| Peso:', totalWeight)

    // Coletar informações sobre promoções/requisitos mínimos
    let promoInfo: { minValue: number; ruleName: string } | null = null

    // Tentar encontrar regra que se aplica
    for (const rule of rules) {
      console.log(`📋 Testando regra: ${rule.name} (${rule.regionType})`)
      
      // Verificar se a região aplica primeiro (para coletar info de promoção relevante)
      let matchesRegion = false
      try {
        const regions = JSON.parse(rule.regions)
        if (rule.regionType === 'NATIONWIDE') {
          matchesRegion = true
        } else if (rule.regionType === 'STATE') {
          const estadoCep = getCepState(cleanCep)
          matchesRegion = !!estadoCep && regions.includes(estadoCep)
        } else if (rule.regionType === 'ZIPCODE_RANGE') {
          const cepNum = parseInt(cleanCep)
          matchesRegion = regions.some((range: any) => {
            const [min, max] = range.split('-').map((c: string) => parseInt(c.replace(/\D/g, '')))
            return cepNum >= min && cepNum <= max
          })
        } else if (rule.regionType === 'CITY') {
          matchesRegion = true
        }
      } catch (e) {
        matchesRegion = rule.regionType === 'NATIONWIDE'
      }

      // Se a região aplica mas o valor não atinge o mínimo, guardar info
      if (matchesRegion && rule.minCartValue && cartValue < rule.minCartValue) {
        if (!promoInfo || rule.minCartValue < promoInfo.minValue) {
          promoInfo = { minValue: rule.minCartValue, ruleName: rule.name }
        }
      }

      // Verificar restrições de valor do carrinho
      if (rule.minCartValue && cartValue < rule.minCartValue) {
        console.log(`❌ Carrinho R$${cartValue} < mínimo R$${rule.minCartValue}`)
        continue
      }
      if (rule.maxCartValue && cartValue > rule.maxCartValue) {
        console.log(`❌ Carrinho R$${cartValue} > máximo R$${rule.maxCartValue}`)
        continue
      }

      // Verificar restrições de peso
      if (rule.minWeight && totalWeight < rule.minWeight) {
        console.log(`❌ Peso ${totalWeight}kg < mínimo ${rule.minWeight}kg`)
        continue
      }
      if (rule.maxWeight && totalWeight > rule.maxWeight) {
        console.log(`❌ Peso ${totalWeight}kg > máximo ${rule.maxWeight}kg`)
        continue
      }

      // Já verificamos matchesRegion acima, só precisamos logar
      if (!matchesRegion) {
        console.log('❌ Região não corresponde')
        continue
      }
      
      console.log('✅ Regra aplicável encontrada!')

      // Regra encontrada! Calcular custo
      let shippingCost = rule.shippingCost

      // Adicionar custo por peso
      if (rule.costPerKg && totalWeight) {
        shippingCost += rule.costPerKg * totalWeight
      }

      // Verificar frete grátis
      if (rule.freeShippingMin && cartValue >= rule.freeShippingMin) {
        return NextResponse.json({
          shippingCost: 0,
          deliveryDays: rule.deliveryDays,
          isFree: true,
          message: `Frete grátis! (compra acima de R$ ${rule.freeShippingMin.toFixed(2)})`,
          packaging: packagingResult?.packaging || null,
          // Campos de transportadora
          shippingMethod: 'propria',
          shippingService: 'Frete Grátis',
          shippingCarrier: 'Entrega Própria'
        })
      }

      return NextResponse.json({
        shippingCost: parseFloat(shippingCost.toFixed(2)),
        deliveryDays: rule.deliveryDays,
        isFree: false,
        ruleName: rule.name,
        packaging: packagingResult?.packaging || null,
        // Campos de transportadora
        shippingMethod: 'propria',
        shippingService: rule.name,
        shippingCarrier: 'Entrega Própria'
      })
    }

    // Nenhuma regra se aplicou, tentar consultar Correios
    const correiosConfig = await prisma.systemConfig.findFirst({
      where: { key: 'correios.enabled' }
    })
    
    const cepOrigemConfig = await prisma.systemConfig.findFirst({
      where: { key: 'correios.cepOrigem' }
    })

    if (correiosConfig?.value === 'true' && cepOrigemConfig?.value) {
      try {
        console.log('📦 Consultando Correios para frete...')
        
        // Fazer requisição interna para API dos Correios
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const correiosResponse = await fetch(`${baseUrl}/api/shipping/correios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cepOrigem: cepOrigemConfig.value,
            cepDestino: cleanCep,
            peso: totalWeight,
            comprimento: totalLength,
            altura: totalHeight,
            largura: totalWidth,
            valor: cartValue
          })
        })

        if (correiosResponse.ok) {
          const correiosData = await correiosResponse.json()
          
          // Pegar todos os resultados válidos sem erro
          const resultadosValidos = correiosData.resultados?.filter((r: any) => !r.erro && r.valor > 0) || []
          
          if (resultadosValidos.length > 0) {
            // Ordenar por valor (mais barato primeiro)
            resultadosValidos.sort((a: any, b: any) => a.valor - b.valor)
            const maisBarato = resultadosValidos[0]
            
            // Mostrar todas as opções no log
            resultadosValidos.forEach((r: any) => {
              console.log(`✅ Correios: ${r.servico} - R$ ${r.valor} (${r.prazo} dias)`)
            })
            
            // Mapear todas as opções para o cliente escolher
            const shippingOptions = resultadosValidos.map((r: any) => ({
              id: `correios_${r.servico.toLowerCase().replace(/\s+/g, '_')}`,
              name: r.servico,
              price: r.valor,
              deliveryDays: r.prazo,
              carrier: 'Correios',
              method: 'correios',
              service: r.servico
            }))
            
            return NextResponse.json({
              shippingCost: maisBarato.valor,
              deliveryDays: maisBarato.prazo,
              isFree: false,
              message: `Via Correios`,
              packaging: packagingResult?.packaging || null,
              // Campos de transportadora (opção mais barata como padrão)
              shippingMethod: 'correios',
              shippingService: maisBarato.servico,
              shippingCarrier: 'Correios',
              // TODAS as opções de frete para o cliente escolher
              shippingOptions,
              // Info de promoção
              promo: promoInfo ? {
                minValue: promoInfo.minValue,
                missing: parseFloat((promoInfo.minValue - cartValue).toFixed(2)),
                ruleName: promoInfo.ruleName
              } : null
            })
          }
        }
      } catch (correiosError) {
        console.error('Erro ao consultar Correios:', correiosError)
      }
    }

    // Fallback: frete padrão
    let fallbackMessage = 'Frete padrão'
    if (promoInfo) {
      const faltam = promoInfo.minValue - cartValue
      fallbackMessage = `Frete padrão - 💡 Adicione mais R$ ${faltam.toFixed(2)} para frete especial!`
    }
    
    return NextResponse.json({
      shippingCost: 15.00,
      deliveryDays: 10,
      isFree: false,
      message: fallbackMessage,
      packaging: packagingResult?.packaging || null,
      // Campos de transportadora
      shippingMethod: 'propria',
      shippingService: 'Padrão',
      shippingCarrier: 'Entrega Própria',
      // Info de promoção
      promo: promoInfo ? {
        minValue: promoInfo.minValue,
        missing: parseFloat((promoInfo.minValue - cartValue).toFixed(2)),
        ruleName: promoInfo.ruleName
      } : null
    })

  } catch (error) {
    console.error('Erro ao calcular frete:', error)
    return NextResponse.json(
      { message: 'Erro ao calcular frete' },
      { status: 500 }
    )
  }
}
