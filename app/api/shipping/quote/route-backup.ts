import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-security'

// Force dynamic rendering
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
    'PA': [['66000000', '68999999']],
    'AP': [['68900000', '68999999']],
    'AM': [['69000000', '69299999'], ['69400000', '69899999']],
    'RR': [['69300000', '69399999']],
    'AC': [['69900000', '69999999']],
    'DF': [['70000000', '72799999'], ['73000000', '73699999']],
    'GO': [['72800000', '72999999'], ['73700000', '76999999']],
    'TO': [['77000000', '77999999']],
    'MT': [['78000000', '78899999']],
    'RO': [['76800000', '76999999']],
    'MS': [['79000000', '79999999']],
    'PR': [['80000000', '87999999']],
    'SC': [['88000000', '89999999']],
    'RS': [['90000000', '99999999']]
  };

  const cleanCep = cep.replace(/\D/g, '');
  const cepNum = parseInt(cleanCep);

  for (const [state, ranges] of Object.entries(cepRanges)) {
    for (const [min, max] of ranges) {
      if (cepNum >= parseInt(min) && cepNum <= parseInt(max)) {
        return state;
      }
    }
  }
  return null;
}

/**
 * Identifica o estado pelo CEP
 */
function getEstadoByCep(cep: number): string {
  // Faixas de CEP por estado (primeiros dígitos)
  const faixasCep: { [key: string]: number[] } = {
    'SP': [1000, 19999], // São Paulo: 01000-000 a 19999-999
    'RJ': [20000, 28999], // Rio de Janeiro: 20000-000 a 28999-999
    'ES': [29000, 29999], // Espírito Santo: 29000-000 a 29999-999
    'MG': [30000, 39999], // Minas Gerais: 30000-000 a 39999-999
    'BA': [40000, 48999], // Bahia: 40000-000 a 48999-999
    'SE': [49000, 49999], // Sergipe: 49000-000 a 49999-999
    'PE': [50000, 56999], // Pernambuco: 50000-000 a 56999-999
    'AL': [57000, 57999], // Alagoas: 57000-000 a 57999-999
    'PB': [58000, 58999], // Paraíba: 58000-000 a 58999-999
    'RN': [59000, 59999], // Rio Grande do Norte: 59000-000 a 59999-999
    'CE': [60000, 63999], // Ceará: 60000-000 a 63999-999
    'PI': [64000, 64999], // Piauí: 64000-000 a 64999-999
    'MA': [65000, 65999], // Maranhão: 65000-000 a 65999-999
    'PA': [66000, 68999], // Pará: 66000-000 a 68999-999
    'AP': [68900, 68999], // Amapá: 68900-000 a 68999-999
    'AM': [69000, 69299, 69400, 69899], // Amazonas: 69000-000 a 69299-999 e 69400-000 a 69899-999
    'RR': [69300, 69399], // Roraima: 69300-000 a 69399-999
    'AC': [69900, 69999], // Acre: 69900-000 a 69999-999
    'DF': [70000, 72799, 73000, 73699], // Distrito Federal: 70000-000 a 72799-999 e 73000-000 a 73699-999
    'GO': [72800, 72999, 73700, 76999], // Goiás: 72800-000 a 72999-999 e 73700-000 a 76999-999
    'TO': [77000, 77999], // Tocantins: 77000-000 a 77999-999
    'MT': [78000, 78899], // Mato Grosso: 78000-000 a 78899-999
    'RO': [76800, 76999], // Rondônia: 76800-000 a 76999-999
    'MS': [79000, 79999], // Mato Grosso do Sul: 79000-000 a 79999-999
    'PR': [80000, 87999], // Paraná: 80000-000 a 87999-999
    'SC': [88000, 89999], // Santa Catarina: 88000-000 a 89999-999
    'RS': [90000, 99999]  // Rio Grande do Sul: 90000-000 a 99999-999
  }

  for (const [estado, faixas] of Object.entries(faixasCep)) {
    for (let i = 0; i < faixas.length; i += 2) {
      const inicio = faixas[i]
      const fim = faixas[i + 1]
      if (cep >= inicio && cep <= fim) {
        return estado
      }
    }
  }

  return 'UNKNOWN'
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

    const { cep, cartValue, weight, items } = await req.json()

    if (!cep) {
      return NextResponse.json(
        { message: 'CEP é obrigatório' },
        { status: 400 }
      )
    }

    console.log('🛒 Dados recebidos:', { cep, cartValue, weight, items: items?.length })

    // Calcular peso e dimensões totais dos produtos se items estiver presente
    let totalWeight = weight || 0
    let totalLength = 0, totalWidth = 0, totalHeight = 0
    let hasAllWeightsDimensions = true

    if (items && Array.isArray(items)) {
      console.log('📦 Calculando peso e dimensões dos produtos...')
      
      for (const item of items) {
        const productId = item.id || item.productId
        // Limpar sufixos do carrinho (_none_none, etc)
        const cleanProductId = productId.split('_')[0]
        const quantity = item.quantity || 1
        
        console.log(`  🔍 Produto ${productId} -> ${cleanProductId} (qty: ${quantity})`)
        
        const product = await prisma.product.findUnique({
          where: { id: cleanProductId }
        })
        
        if (product) {
          const prodWeight = product.weight || 0
          const prodLength = product.length || 0
          const prodWidth = product.width || 0  
          const prodHeight = product.height || 0
          
          console.log(`    ⚖️ Peso: ${prodWeight}kg | Dim: ${prodLength}x${prodWidth}x${prodHeight}cm`)
          
          if (!prodWeight || !prodLength || !prodWidth || !prodHeight) {
            console.log(`    ⚠️ Produto sem peso/dimensões completas`)
            hasAllWeightsDimensions = false
          }
          
          // Somar peso
          totalWeight += (prodWeight || 0.1) * quantity // peso mínimo 0.1kg
          
          // Para dimensões, vamos somar de forma simples (assumindo empilhamento)
          totalLength = Math.max(totalLength, prodLength || 10) // comprimento máximo
          totalWidth = Math.max(totalWidth, prodWidth || 10)    // largura máxima  
          totalHeight += (prodHeight || 5) * quantity           // altura soma (empilhamento)
        } else {
          console.log(`    ❌ Produto não encontrado`)
          hasAllWeightsDimensions = false
          totalWeight += 0.2 * quantity // peso padrão
        }
      }
      
      console.log(`📊 Totais calculados: ${totalWeight}kg | ${totalLength}x${totalWidth}x${totalHeight}cm`)
      console.log(`✅ Todos produtos com peso/dimensões: ${hasAllWeightsDimensions}`)
    }

    // Limpar CEP
    const cleanCep = cep.replace(/\D/g, '')
    console.log('🔍 Calculando frete para CEP:', cleanCep, '| Carrinho:', cartValue, '| Peso:', totalWeight)

    // PRIORIDADE 1: Buscar regras ativas ordenadas por prioridade  
    const rules = await prisma.shippingRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    })

    console.log(`📋 Encontradas ${rules.length} regras de frete ativas`)

    // Tentar encontrar regra que se aplica
    for (const rule of rules) {
      console.log(`📋 Testando regra: ${rule.name} (${rule.regionType})`)
      
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

      // Verificar regiões
      let matchesRegion = false
      try {
        const regions = JSON.parse(rule.regions)
        console.log('📍 Regiões da regra:', regions)

        if (rule.regionType === 'NATIONWIDE') {
          matchesRegion = true
          console.log('✅ NATIONWIDE - aplica para todo Brasil')
        } else if (rule.regionType === 'STATE') {
          // Identificar estado pelo CEP
          const estadoCep = getCepState(cleanCep)
          console.log(`🏛️ Estado do CEP ${cleanCep}: ${estadoCep}`)
          
          matchesRegion = !!estadoCep && regions.includes(estadoCep)
          console.log(`✅ STATE - ${estadoCep} ${matchesRegion ? 'MATCH' : 'não match'} com ${regions}`)
        } else if (rule.regionType === 'ZIPCODE_RANGE') {
          // Verificar se CEP está nas faixas
          const cepNum = parseInt(cleanCep)
          console.log('🔢 CEP numérico:', cepNum)
          
          matchesRegion = regions.some((range: any) => {
            const [min, max] = range.split('-').map((c: string) => parseInt(c.replace(/\D/g, '')))
            const matches = cepNum >= min && cepNum <= max
            console.log(`  Faixa ${min}-${max}: ${matches ? '✅ MATCH' : '❌ não match'}`)
            return matches
          })
        } else if (rule.regionType === 'CITY') {
          // Por enquanto aceita
          matchesRegion = true
          console.log('✅ CITY - aceito (implementação simplificada)')
        }
      } catch (e) {
        console.log('⚠️ Erro ao parsear regiões:', e)
        matchesRegion = rule.regionType === 'NATIONWIDE'
      }

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
        console.log(`✅ Frete grátis aplicado! Compra R$${cartValue} >= R$${rule.freeShippingMin}`)
        return NextResponse.json({
          shippingCost: 0,
          deliveryDays: rule.deliveryDays,
          isFree: true,
          message: `Frete grátis! (compra acima de R$ ${rule.freeShippingMin.toFixed(2)})`,
          ruleName: rule.name
        })
      }

      console.log(`✅ Regra aplicada: ${rule.name} - R$ ${shippingCost.toFixed(2)}`)
      return NextResponse.json({
        shippingCost: parseFloat(shippingCost.toFixed(2)),
        deliveryDays: rule.deliveryDays,
        isFree: false,
        ruleName: rule.name,
        method: 'REGRA_PERSONALIZADA'
      })
    }

    console.log('⚠️ Nenhuma regra personalizada se aplicou')

    // PRIORIDADE 2: Se não há regras ou nenhuma se aplica, tentar Correios
    // Mas só se todos os produtos tiverem peso e dimensões
    const correiosConfig = await prisma.systemConfig.findFirst({
      where: { key: 'correios.enabled' }
    })
    
    const cepOrigemConfig = await prisma.systemConfig.findFirst({
      where: { key: 'correios.cepOrigem' }
    })

    console.log(`🔍 Verificando Correios...`)
    console.log(`   correios.enabled: ${correiosConfig?.value}`)
    console.log(`   cepOrigem: ${cepOrigemConfig?.value}`)
    console.log(`   hasAllWeightsDimensions: ${hasAllWeightsDimensions}`)
    console.log(`   totalWeight: ${totalWeight}`)

    if (correiosConfig?.value === 'true' && cepOrigemConfig?.value && hasAllWeightsDimensions && totalWeight > 0) {
      try {
        console.log('📦 ✅ ENTRANDO NA CONSULTA DOS CORREIOS!')
        console.log(`   Peso: ${Math.max(totalWeight, 0.1)}kg`)
        console.log(`   Dimensões: ${Math.max(totalLength, 20)}x${Math.max(totalWidth, 15)}x${Math.max(totalHeight, 5)}cm`)
        
        const correiosPayload = {
          cepOrigem: cepOrigemConfig.value,
          cepDestino: cleanCep,
          peso: Math.max(totalWeight, 0.1),
          comprimento: Math.max(totalLength, 20),
          altura: Math.max(totalHeight, 5),
          largura: Math.max(totalWidth, 15), 
          valor: cartValue
        }
        
        console.log('🚀 PAYLOAD PARA CORREIOS:')
        console.log(JSON.stringify(correiosPayload, null, 2))
        
        // Fazer requisição interna para API dos Correios
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        console.log(`🌐 URL DOS CORREIOS: ${baseUrl}/api/shipping/correios`)
        
        const correiosResponse = await fetch(`${baseUrl}/api/shipping/correios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(correiosPayload)
        })

        console.log(`📡 STATUS DOS CORREIOS: ${correiosResponse.status}`)
        console.log(`📡 STATUS TEXT: ${correiosResponse.statusText}`)

        if (correiosResponse.ok) {
          const correiosData = await correiosResponse.json()
          console.log('✅ RESPOSTA COMPLETA DOS CORREIOS:')
          console.log(JSON.stringify(correiosData, null, 2))
          
          // Pegar o resultado mais barato sem erro
          const resultadosValidos = correiosData.resultados?.filter((r: any) => !r.erro && r.valor > 0)
          
          console.log(`📊 TOTAL DE RESULTADOS: ${correiosData.resultados?.length || 0}`)
          console.log(`📊 RESULTADOS VÁLIDOS: ${resultadosValidos?.length || 0}`)
          
          if (resultadosValidos && resultadosValidos.length > 0) {
            // Ordenar por valor (mais barato primeiro)
            resultadosValidos.sort((a: any, b: any) => a.valor - b.valor)
            const maisBarato = resultadosValidos[0]
            
            console.log(`💰 ESCOLHIDO: ${maisBarato.servico} - R$ ${maisBarato.valor} (${maisBarato.prazo} dias)`)
            console.log('🎉 RETORNANDO RESULTADO DOS CORREIOS!')
            
            return NextResponse.json({
              shippingCost: maisBarato.valor,
              deliveryDays: maisBarato.prazo,
              isFree: false,
              message: `Via Correios (${maisBarato.servico})`,
              method: 'CORREIOS'
            })
          } else {
            console.log('❌ CORREIOS: Nenhum resultado válido encontrado')
            if (correiosData.resultados?.length > 0) {
              console.log('📋 RESULTADOS COM ERRO:')
              correiosData.resultados.forEach((r: any, i: number) => {
                console.log(`   ${i + 1}. ${r.servico}: ${r.erro || `R$ ${r.valor} - ${r.prazo} dias`}`)
              })
            }
          }
        } else {
          const errorText = await correiosResponse.text()
          console.log('❌ ERRO NA RESPOSTA DOS CORREIOS:')
          console.log(`   Status: ${correiosResponse.status}`)
          console.log(`   Erro: ${errorText}`)
        }
      } catch (correiosError) {
        console.error('❌ ERRO DURANTE CONSULTA DOS CORREIOS:')
        console.error('   Message:', correiosError.message)
        console.error('   Stack:', correiosError.stack)
      }
    } else {
      console.log('❌ CORREIOS: Não atende condições')
      if (!correiosConfig || correiosConfig.value !== 'true') {
        console.log('   📍 Correios não habilitado')
      }
      if (!cepOrigemConfig?.value) {
        console.log('   📍 CEP origem não configurado')
      }
      if (!hasAllWeightsDimensions) {
        console.log('   📍 Nem todos produtos têm peso/dimensões')
      }
      if (totalWeight <= 0) {
        console.log('   📍 Peso total zero ou negativo')
      }
    }

    console.log('⚠️ FALLBACK: Usando frete padrão')
    // Fallback: frete padrão
    return NextResponse.json({
      shippingCost: 15.00,
      deliveryDays: 10,
      isFree: false,
      message: 'Frete padrão (nenhuma regra aplicável)',
      method: 'FALLBACK'
    })

  } catch (error) {
    console.error('Erro ao calcular frete:', error)
    return NextResponse.json(
      { message: 'Erro ao calcular frete' },
      { status: 500 }
    )
  }
}
