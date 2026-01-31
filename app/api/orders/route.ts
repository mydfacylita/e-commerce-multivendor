import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateApiKey, validateUserToken } from '@/lib/api-security'
import { analyzeFraud } from '@/lib/fraud-detection'

// Função para extrair número de dias da string de prazo de entrega
// Exemplos: "05 - 22 de Fev." -> 22, "5 dias úteis" -> 5, "10-15 dias" -> 15
function parseDeliveryDays(value: any): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // Tentar extrair o maior número da string (geralmente o prazo máximo)
    const numbers = value.match(/\d+/g)
    if (numbers && numbers.length > 0) {
      // Pegar o maior número encontrado (prazo máximo)
      return Math.max(...numbers.map(n => parseInt(n, 10)))
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    // Capturar IP do usuário
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('x-real-ip') ||
                     null
    const userAgent = req.headers.get('user-agent') || null

    // 🔐 Validar API Key (obrigatório para app móvel)
    const apiKey = req.headers.get('x-api-key')
    if (apiKey) {
      const apiValidation = await validateApiKey(apiKey)
      if (!apiValidation.valid) {
        return NextResponse.json(
          { message: apiValidation.error || 'API Key inválida' },
          { status: 401 }
        )
      }
    }

    // 🔐 Tentar autenticação por JWT (app móvel) ou Session (web)
    let userId: string | null = null
    let isFromApp = false // Identificar se veio do app móvel
    
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      // App móvel: usar JWT
      const tokenValidation = await validateUserToken(authHeader)
      if (!tokenValidation.valid) {
        return NextResponse.json(
          { message: tokenValidation.error || 'Token inválido' },
          { status: 401 }
        )
      }
      userId = tokenValidation.user?.userId || null
      isFromApp = true // Veio do app móvel via JWT
    } else {
      // Web: usar Session
      const session = await getServerSession(authOptions)
      userId = session?.user?.id || null
    }

    if (!userId) {
      return NextResponse.json(
        { message: 'Não autorizado. Faça login para continuar.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { 
      items, 
      total, 
      shippingAddress, 
      buyerPhone, 
      buyerCpf, 
      couponCode, 
      discountAmount, 
      shippingCost, 
      subtotal,
      // Campos de transportadora (formato web)
      shippingMethod,     // 'correios', 'jadlog', 'propria', 'melhorenvio', etc.
      shippingService,    // 'SEDEX', 'PAC', 'Expresso', etc.
      shippingCarrier,    // Nome da transportadora para exibição
      // Impostos de importação
      importTax,          // Imposto de importação (20%)
      icmsTax,            // ICMS estadual
      // Suporte a formato do app móvel
      address,  // { street, number, city, state, zipCode, ... }
      shipping, // { method, price }
      payment,  // { method, cpf, installments }
      totals    // { subtotal, shipping, discount, paymentDiscount, total }
    } = body

    // Normalizar dados do app móvel para formato web
    const normalizedShippingAddress = shippingAddress || (address ? JSON.stringify(address) : null)
    const normalizedTotal = total || totals?.total
    const normalizedSubtotal = subtotal || totals?.subtotal
    const normalizedShippingCost = shippingCost ?? shipping?.price ?? 0
    const normalizedBuyerCpf = buyerCpf || payment?.cpf
    
    // Calcular desconto total (cupom + desconto do método de pagamento como PIX)
    const normalizedDiscountAmount = discountAmount || ((totals?.discount || 0) + (totals?.paymentDiscount || 0))
    
    // Extrair método de envio do formato app ou web
    const normalizedShippingMethod = shippingMethod || (shipping?.method === 'free' ? 'propria' : shipping?.method) || 'propria'
    const normalizedShippingService = shippingService || null
    const normalizedShippingCarrier = shippingCarrier || null

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 [CREATE ORDER] Dados recebidos:')
    console.log('   Total:', normalizedTotal)
    console.log('   Subtotal:', normalizedSubtotal)
    console.log('   Frete:', normalizedShippingCost)
    console.log('   Método Envio:', normalizedShippingMethod)
    console.log('   Serviço:', normalizedShippingService)
    console.log('   Transportadora:', normalizedShippingCarrier)
    console.log('   Cupom:', couponCode)
    console.log('   Desconto:', normalizedDiscountAmount, '(cupom:', totals?.discount, '+ pagto:', totals?.paymentDiscount, ')')
    console.log('   Itens:', items?.length)
    items?.forEach((item: any, i: number) => {
      console.log(`   Item ${i + 1}:`, {
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor
      })
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Buscar nome e email do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    })

    // Buscar informações dos produtos
    const productIds = items.map((item: any) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { 
        seller: {
          include: {
            subscriptions: {
              where: { status: { in: ['ACTIVE', 'TRIAL'] } },
              include: { plan: true },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      },
    })

    // AGRUPAR ITENS POR DESTINO
    // REGRA CRÍTICA:
    // - DROPSHIPPING → Sempre ADM (são clones/integrações gerenciadas pela plataforma)
    // - ESTOQUE LOCAL do vendedor → Vendedor gerencia
    // - ESTOQUE LOCAL da plataforma → ADM gerencia
    const itemsByDestination: Map<string, any[]> = new Map()
    
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)
      if (!product) continue

      const itemTotal = item.price * item.quantity
      
      // ATENÇÃO: product.isDropshipping=1 apenas DISPONIBILIZA para dropshipping
      // Para SER DROP de verdade: isDropshipping=true E sellerId != null (vendedor vendendo)
      const sellerId = product.sellerId
      const isDropshipping = product.isDropshipping && sellerId !== null

      // DESTINO do pedido:
      // - Se é DROP (vendedor vendendo produto disponibilizado) → SELLER_{sellerId}
      // - Se é STOCK com vendedor → SELLER_{sellerId}
      // - Se não tem vendedor (próprio da ADM) → ADMIN
      let destination: string
      
      if (sellerId) {
        destination = `SELLER_${sellerId}` // Vendedor gerencia (DROP ou STOCK)
      } else {
        destination = 'ADMIN' // ADM gerencia (estoque próprio)
      }

      if (!itemsByDestination.has(destination)) {
        itemsByDestination.set(destination, [])
      }

      // Calcular comissões
      let commissionRate = 0
      let commissionAmount = 0
      let sellerRevenue = 0
      let supplierCost = null
      
      // Salvar o costPrice do produto no momento da venda
      const productCostPrice = product.costPrice || product.totalCost || 0

      if (isDropshipping) {
        // DROP: vendedor tem DESCONTO de X% no preço base
        // Ex: Produto R$1,00 com 15% desconto = Vendedor paga R$0,85
        // Se vende por R$1,10, lucro = R$0,25
        const costPrice = productCostPrice
        commissionRate = product.dropshippingCommission || 0
        const discount = (costPrice * commissionRate) / 100
        const vendorCost = costPrice - discount // Custo do vendedor após desconto
        supplierCost = vendorCost
        sellerRevenue = (item.price * item.quantity) - (vendorCost * item.quantity) // Lucro = venda - custo
        commissionAmount = discount * item.quantity // Desconto total
      } else {
        // STOCK: vendedor paga taxa da plataforma definida no PLANO
        const activeSubscription = product.seller?.subscriptions?.[0]
        const planCommission = activeSubscription?.plan?.platformCommission || product.seller?.commission || 10
        commissionRate = planCommission
        commissionAmount = (itemTotal * commissionRate) / 100
        sellerRevenue = itemTotal - commissionAmount
      }

      itemsByDestination.get(destination)!.push({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        costPrice: productCostPrice, // ✅ Salvar custo no momento da venda
        selectedSize: item.selectedSize || null,
        selectedColor: item.selectedColor || null,
        supplierSkuId: item.skuId || null, // ✅ SUB-SKU do fornecedor
        itemType: isDropshipping ? 'DROPSHIPPING' : 'STOCK',
        sellerId: sellerId || null,
        commissionRate,
        commissionAmount,
        sellerRevenue,
        supplierCost: isDropshipping ? supplierCost : null,
      })
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🛒 PROCESSANDO PEDIDO')
    console.log(`📦 Destinos: ${itemsByDestination.size}`)
    for (const [dest, destItems] of itemsByDestination.entries()) {
      console.log(`   - ${dest}: ${destItems.length} item(s)`)
    }

    // CASO 1: Pedido SIMPLES (apenas 1 destino)
    if (itemsByDestination.size === 1) {
      console.log('✅ Pedido SIMPLES')
      
      const [[destination, orderItems]] = Array.from(itemsByDestination.entries())
      
      console.log('💾 [SALVANDO NO BANCO] Dados que SERÃO salvos:')
      console.log('   Total:', normalizedTotal)
      console.log('   Subtotal:', normalizedSubtotal || normalizedTotal)
      console.log('   ShippingCost:', normalizedShippingCost)
      console.log('   ShippingMethod:', normalizedShippingMethod)
      console.log('   CouponCode:', couponCode || null)
      console.log('   DiscountAmount:', normalizedDiscountAmount)
      console.log('   Items com size/color:', orderItems.map((i: any) => ({
        productId: i.productId,
        selectedSize: i.selectedSize,
        selectedColor: i.selectedColor
      })))
      
      // 🛡️ ANÁLISE DE FRAUDE
      console.log('\n🛡️ [ANTIFRAUDE] Analisando pedido...')
      const fraudAnalysis = await analyzeFraud({
        userId,
        total: normalizedTotal,
        buyerCpf: normalizedBuyerCpf || null,
        buyerEmail: user?.email || null,
        buyerPhone: buyerPhone || null,
        shippingAddress: normalizedShippingAddress || null,
        ipAddress,
        paymentMethod: payment?.method || null,
        paymentDetails: null // Será preenchido depois na confirmação de pagamento
      })
      
      console.log(`   Score de Risco: ${fraudAnalysis.score}/100`)
      console.log(`   Nível: ${fraudAnalysis.riskLevel.toUpperCase()}`)
      console.log(`   Alertar Equipe: ${fraudAnalysis.shouldAlert ? 'SIM ⚠️' : 'NÃO ✅'}`)
      if (fraudAnalysis.reasons.length > 0) {
        console.log('   Motivos:')
        fraudAnalysis.reasons.forEach(r => console.log(`     - ${r}`))
      }
      
      const order = await prisma.order.create({
        data: {
          user: { connect: { id: userId } },
          total: normalizedTotal,
          subtotal: normalizedSubtotal || normalizedTotal,
          shippingCost: normalizedShippingCost,
          deliveryDays: parseDeliveryDays(body.deliveryDays),
          couponCode: couponCode || null,
          discountAmount: normalizedDiscountAmount,
          shippingAddress: normalizedShippingAddress,
          status: 'PENDING',
          buyerName: user?.name || '',
          buyerEmail: user?.email || '',
          buyerPhone: buyerPhone || '',
          buyerCpf: normalizedBuyerCpf || '',
          // Origem do pedido
          marketplaceName: isFromApp ? 'APP' : null,
          // Forma de pagamento
          paymentMethod: payment?.method || null,
          // Campos de transportadora
          shippingMethod: normalizedShippingMethod,
          shippingService: normalizedShippingService,
          shippingCarrier: normalizedShippingCarrier,
          // Impostos de importação
          importTax: importTax || null,
          icmsTax: icmsTax || null,
          // Campos de antifraude
          fraudScore: fraudAnalysis.score,
          fraudReasons: JSON.stringify(fraudAnalysis.reasons),
          fraudStatus: fraudAnalysis.shouldAlert ? 'pending' : null,
          ipAddress,
          userAgent,
          items: {
            create: orderItems
          },
        },
        include: { items: true },
      })
      
      console.log('✅ [SALVO] Pedido criado:', order.id)
      console.log('   Subtotal salvo:', order.subtotal)
      console.log('   ShippingCost salvo:', order.shippingCost)
      console.log('   CouponCode salvo:', order.couponCode)
      console.log('   DiscountAmount salvo:', order.discountAmount)

      // Registrar uso do cupom se aplicado
      if (couponCode) {
        try {
          const coupon = await prisma.coupon.findUnique({
            where: { code: couponCode.toUpperCase() }
          })
          if (coupon) {
            // Incrementar contador de uso
            await prisma.coupon.update({
              where: { id: coupon.id },
              data: { usageCount: { increment: 1 } }
            })
            // Registrar uso
            await prisma.couponUsage.create({
              data: {
                couponId: coupon.id,
                orderId: order.id,
                userId: userId,
                discount: normalizedDiscountAmount || 0
              }
            })
            console.log('   ✅ Uso do cupom registrado:', couponCode)
          }
        } catch (couponError) {
          console.error('   ⚠️ Erro ao registrar uso do cupom:', couponError)
          // Não falha o pedido por erro no cupom
        }
      }

      console.log(`   Pedido: ${order.id}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      return NextResponse.json(
        { message: 'Pedido criado com sucesso', orderId: order.id },
        { status: 201 }
      )
    } 
    // CASO 2: Pedido HÍBRIDO (DROP + LOCAL ou ADM + SELLER)
    else {
      console.log('🔀 Pedido HÍBRIDO - Separando subpedidos')
      
      const createdOrders = []
      const parentOrderId = `HYB${Date.now().toString().slice(-10)}`

      for (const [destination, orderItems] of itemsByDestination.entries()) {
        const subTotal = orderItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
        )
        
        const order = await prisma.order.create({
          data: {
            user: { connect: { id: userId } },
            parentOrderId,
            total: subTotal,
            subtotal: subTotal,
            shippingCost: normalizedShippingCost / itemsByDestination.size, // Divide frete entre subpedidos
            deliveryDays: parseDeliveryDays(body.deliveryDays),
            couponCode: couponCode || null,
            discountAmount: normalizedDiscountAmount / itemsByDestination.size, // Divide desconto proporcionalmente
            shippingAddress: normalizedShippingAddress,
            status: 'PENDING',
            buyerName: user?.name || '',
            buyerEmail: user?.email || '',
            buyerPhone: buyerPhone || '',
            buyerCpf: normalizedBuyerCpf || '',
            // Forma de pagamento
            paymentMethod: payment?.method || null,
            // Campos de transportadora
            shippingMethod: normalizedShippingMethod,
            shippingService: normalizedShippingService,
            shippingCarrier: normalizedShippingCarrier,
            // Impostos de importação (divididos proporcionalmente)
            importTax: importTax ? importTax / itemsByDestination.size : null,
            icmsTax: icmsTax ? icmsTax / itemsByDestination.size : null,
            items: {
              create: orderItems
            },
          },
          include: { items: true },
        })

        createdOrders.push(order.id)
        console.log(`   └─ ${destination}: ${order.id} (R$ ${subTotal.toFixed(2)})`)
      }

      // Registrar uso do cupom para pedidos híbridos (apenas uma vez)
      if (couponCode && createdOrders.length > 0) {
        try {
          const coupon = await prisma.coupon.findUnique({
            where: { code: couponCode.toUpperCase() }
          })
          if (coupon) {
            // Incrementar contador de uso
            await prisma.coupon.update({
              where: { id: coupon.id },
              data: { usageCount: { increment: 1 } }
            })
            // Registrar uso (usar o primeiro pedido como referência)
            await prisma.couponUsage.create({
              data: {
                couponId: coupon.id,
                orderId: createdOrders[0],
                userId: userId,
                discount: normalizedDiscountAmount || 0
              }
            })
            console.log('   ✅ Uso do cupom registrado:', couponCode)
          }
        } catch (couponError) {
          console.error('   ⚠️ Erro ao registrar uso do cupom:', couponError)
        }
      }

      console.log(`✅ ${createdOrders.length} subpedidos criados`)
      console.log(`   ID Pai: ${parentOrderId}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      return NextResponse.json(
        { 
          message: 'Pedido híbrido criado',
          orderId: parentOrderId,
          subOrders: createdOrders,
          isHybrid: true
        },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    return NextResponse.json(
      { message: 'Erro ao criar pedido' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    // 🔐 Tentar autenticação por JWT (app móvel) ou Session (web)
    let userId: string | null = null
    
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      // App móvel: usar JWT
      const tokenValidation = await validateUserToken(authHeader)
      if (!tokenValidation.valid) {
        return NextResponse.json(
          { message: tokenValidation.error || 'Token inválido' },
          { status: 401 }
        )
      }
      userId = tokenValidation.user?.userId || null
    } else {
      // Web: usar Session
      const session = await getServerSession(authOptions)
      userId = session?.user?.id || null
    }

    if (!userId) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Retornar no formato esperado pelo app { orders: [...] }
    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar pedidos' },
      { status: 500 }
    )
  }
}
