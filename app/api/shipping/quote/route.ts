import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-security'

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

    const { cep, cartValue, weight } = await req.json()

    if (!cep) {
      return NextResponse.json(
        { message: 'CEP é obrigatório' },
        { status: 400 }
      )
    }

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
        message: 'Frete grátis'
      })
    }

    // Limpar CEP
    const cleanCep = cep.replace(/\D/g, '')
    console.log('🔍 Calculando frete para CEP:', cleanCep, '| Carrinho:', cartValue, '| Peso:', weight)

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
      if (rule.minWeight && weight < rule.minWeight) {
        console.log(`❌ Peso ${weight}kg < mínimo ${rule.minWeight}kg`)
        continue
      }
      if (rule.maxWeight && weight > rule.maxWeight) {
        console.log(`❌ Peso ${weight}kg > máximo ${rule.maxWeight}kg`)
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
          // Pegar estado do CEP (primeiros 2 dígitos identificam região, mas vamos simplificar)
          matchesRegion = true // Por enquanto aceita todos
          console.log('✅ STATE - aceito (implementação simplificada)')
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
      if (rule.costPerKg && weight) {
        shippingCost += rule.costPerKg * weight
      }

      // Verificar frete grátis
      if (rule.freeShippingMin && cartValue >= rule.freeShippingMin) {
        return NextResponse.json({
          shippingCost: 0,
          deliveryDays: rule.deliveryDays,
          isFree: true,
          message: `Frete grátis! (compra acima de R$ ${rule.freeShippingMin.toFixed(2)})`
        })
      }

      return NextResponse.json({
        shippingCost: parseFloat(shippingCost.toFixed(2)),
        deliveryDays: rule.deliveryDays,
        isFree: false,
        ruleName: rule.name
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
            peso: weight || 0.5,
            comprimento: 20,
            altura: 10,
            largura: 15,
            valor: cartValue
          })
        })

        if (correiosResponse.ok) {
          const correiosData = await correiosResponse.json()
          
          // Pegar o resultado mais barato sem erro
          const resultadosValidos = correiosData.resultados?.filter((r: any) => !r.erro && r.valor > 0)
          
          if (resultadosValidos && resultadosValidos.length > 0) {
            // Ordenar por valor (mais barato primeiro)
            resultadosValidos.sort((a: any, b: any) => a.valor - b.valor)
            const maisBarato = resultadosValidos[0]
            
            console.log(`✅ Correios: ${maisBarato.servico} - R$ ${maisBarato.valor} (${maisBarato.prazo} dias)`)
            
            return NextResponse.json({
              shippingCost: maisBarato.valor,
              deliveryDays: maisBarato.prazo,
              isFree: false,
              message: `Via Correios (${maisBarato.servico})`
            })
          }
        }
      } catch (correiosError) {
        console.error('Erro ao consultar Correios:', correiosError)
      }
    }

    // Fallback: frete padrão
    return NextResponse.json({
      shippingCost: 15.00,
      deliveryDays: 10,
      isFree: false,
      message: 'Frete padrão'
    })

  } catch (error) {
    console.error('Erro ao calcular frete:', error)
    return NextResponse.json(
      { message: 'Erro ao calcular frete' },
      { status: 500 }
    )
  }
}
