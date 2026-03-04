import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateApiKey, validateUserToken } from '@/lib/api-security'
import { analyzeFraud } from '@/lib/fraud-detection'
import { isValidCPF, validateCEPWithState } from '@/lib/validation'
import { cookies } from 'next/headers'
import { sendTemplateEmail, EMAIL_TEMPLATES } from '@/lib/email'
import { WhatsAppService } from '@/lib/whatsapp'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Resolve warehouseCode automático pela UF do comprador
async function resolveWarehouseCode(buyerState?: string | null): Promise<string | null> {
  try {
    const branches = await prisma.companyBranch.findMany({
      where: { isActive: true },
      select: { code: true, statesServed: true, isDefault: true },
    })
    if (!branches.length) return null

    if (buyerState) {
      const match = branches.find(b =>
        b.statesServed && (b.statesServed as unknown as string[]).includes(buyerState.toUpperCase())
      )
      if (match) return match.code
    }

    // Fallback: filial padrão
    const defaultBranch = branches.find(b => b.isDefault)
    return defaultBranch?.code || null
  } catch {
    return null
  }
}

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
    // IMPORTANTE: Não usar 'propria' como fallback - deixar null se não foi definido
    let normalizedShippingMethod = shippingMethod || null
    if (!normalizedShippingMethod && shipping?.method) {
      // Mapear método do app móvel
      if (shipping.method === 'free') {
        normalizedShippingMethod = 'gratis'
      } else if (shipping.method.toLowerCase().includes('correios')) {
        normalizedShippingMethod = 'correios'
      } else if (shipping.method.toLowerCase().includes('jadlog')) {
        normalizedShippingMethod = 'jadlog'
      } else if (shipping.method.toLowerCase().includes('melhor')) {
        normalizedShippingMethod = 'melhorenvio'
      } else {
        normalizedShippingMethod = shipping.method
      }
    }
    const normalizedShippingService = shippingService || shipping?.service || null
    const normalizedShippingCarrier = shippingCarrier || shipping?.carrier || null

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 [CREATE ORDER] Dados recebidos:')
    console.log('   Total:', normalizedTotal)
    console.log('   Subtotal:', normalizedSubtotal)
    console.log('   Frete:', normalizedShippingCost)
    console.log('   Método Envio:', normalizedShippingMethod, '(raw:', shippingMethod, ')')
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

    // ====== VALIDAÇÕES DE SEGURANÇA ======
    
    // Validar CPF
    if (normalizedBuyerCpf) {
      if (!isValidCPF(normalizedBuyerCpf)) {
        console.log('❌ [CREATE ORDER] CPF inválido:', normalizedBuyerCpf)
        return NextResponse.json(
          { message: 'CPF inválido. Verifique os números informados.' },
          { status: 400 }
        )
      }
    }
    
    // Validar CEP e correspondência com estado
    let addressObj: any = null
    if (normalizedShippingAddress) {
      try {
        addressObj = JSON.parse(normalizedShippingAddress)
      } catch {
        // Se não for JSON, tenta extrair CEP da string
      }
    } else if (address) {
      addressObj = address
    }
    
    if (addressObj?.zipCode) {
      const cepValidation = await validateCEPWithState(addressObj.zipCode, addressObj.state)
      if (!cepValidation.valid) {
        console.log('❌ [CREATE ORDER] CEP inválido:', cepValidation.error)
        return NextResponse.json(
          { message: cepValidation.error },
          { status: 400 }
        )
      }
      
      // Se a validação retornou dados do CEP, atualizar o estado correto
      if (cepValidation.data && cepValidation.data.uf !== addressObj.state) {
        console.log(`⚠️ [CREATE ORDER] Corrigindo estado: ${addressObj.state} -> ${cepValidation.data.uf}`)
        addressObj.state = cepValidation.data.uf
        // Atualizar o endereço normalizado com o estado correto
        if (address) {
          address.state = cepValidation.data.uf
        }
      }
    }

    // Buscar nome e email do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    })

    if (!user) {
      console.warn('Usuário não encontrado para o pedido:', userId)
      return NextResponse.json(
        { message: 'Usuário inválido. Faça login novamente.' },
        { status: 401 }
      )
    }

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
    const warehouseByDest: Map<string, string | null> = new Map() // warehouseCode por destino (do produto)
    
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
      // Primeira filial não-nula prevalece para este destino
      if (!warehouseByDest.has(destination)) {
        warehouseByDest.set(destination, product.warehouseCode || null)
      } else if (!warehouseByDest.get(destination) && product.warehouseCode) {
        warehouseByDest.set(destination, product.warehouseCode)
      }

      // Calcular comissões
      let commissionRate = 0
      let commissionAmount = 0
      let sellerRevenue = 0
      let supplierCost = null
      
      // Salvar o costPrice do produto no momento da venda (custo real do admin)
      const productCostPrice = product.costPrice || product.totalCost || 0

      if (isDropshipping) {
        // DROP: Vendedor ganha:
        // 1. A diferença entre preço de venda e custo base (markup)
        // 2. + comissão % sobre o custo base (definida pelo admin)
        // Buscar produto ORIGINAL (do admin) via supplierSku para obter custo base correto
        let costPrice = 0
        
        if (product.supplierSku) {
          const originalProduct = await prisma.product.findUnique({
            where: { id: product.supplierSku },
            select: { price: true, dropshippingCommission: true }
          })
          if (originalProduct) {
            costPrice = originalProduct.price || 0
            commissionRate = originalProduct.dropshippingCommission || 0
          }
        }
        
        // Fallback
        if (!costPrice) {
          costPrice = product.price || 0
          commissionRate = product.dropshippingCommission || 0
        }
        
        // Ex: Custo base R$162.50 (product original.price), comissão 16%, venda R$289.20
        //     Markup: 289.20 - 162.50 = 126.70
        //     Comissão: 162.50 * 16% = 26.00
        //     Total vendedor: 126.70 + 26.00 = 152.70
        commissionAmount = (costPrice * commissionRate) / 100 * item.quantity // Comissão total
        const markup = (item.price * item.quantity) - (costPrice * item.quantity) // Diferença de preço
        sellerRevenue = markup + commissionAmount // Total do vendedor
        supplierCost = costPrice // Custo base do vendedor
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

    // Resolver filial automaticamente a partir do produto (warehouseCode cadastrado no produto)
    const autoWarehouseCode = warehouseByDest.size === 1
      ? warehouseByDest.values().next().value
      : null
    if (autoWarehouseCode) {
      console.log(`🏭 [FILIAL] Atribuído pelo produto: ${autoWarehouseCode}`)
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
      
      // 🔗 VERIFICAR AFILIADO
      let affiliateId: string | null = null
      let affiliateCode: string | null = null
      
      // Tentar obter de 3 fontes (ordem de prioridade):
      const cookieStore = cookies()
      const affiliateRefFromCookie = cookieStore.get('affiliate_ref')?.value
      const affiliateRefFromHeader = req.headers.get('x-affiliate-ref') // Fallback do localStorage
      
      const affiliateRef = affiliateRefFromCookie || affiliateRefFromHeader
      
      if (affiliateRef) {
        console.log('🎯 [AFILIADO] Código detectado:', affiliateRef, `(Fonte: ${affiliateRefFromCookie ? 'cookie' : 'header/localStorage'})`)
        const affiliate = await prisma.affiliate.findUnique({
          where: { 
            code: affiliateRef,
            status: 'APPROVED',
            isActive: true
          }
        })
        
        if (affiliate) {
          affiliateId = affiliate.id
          affiliateCode = affiliate.code
          console.log('   ✅ Afiliado válido encontrado:', affiliate.name)
        } else {
          console.log('   ⚠️ Código de afiliado inválido ou inativo')
        }
      } else {
        console.log('🎯 [AFILIADO] Nenhum código encontrado (nem cookie nem header)')
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
          // Afiliado
          affiliateId,
          affiliateCode,
          // Filial auto-atribuída
          warehouseCode: autoWarehouseCode,
          items: {
            create: orderItems
          },
        },
        include: { items: true },
      })
      
      // Registrar conversão do afiliado (não-bloqueante - não deve quebrar a criação do pedido)
      if (affiliateId) {
        try {
          console.log('   🎯 Processando afiliado...', { affiliateId, orderId: order.id })
          
          // Marcar click como convertido
          if (ipAddress) {
            await prisma.affiliateClick.updateMany({
              where: {
                affiliateId,
                ipAddress: ipAddress,
                converted: false
              },
              data: {
                converted: true,
                convertedAt: new Date(),
                orderId: order.id
              }
            })
            console.log('   ✅ Click marcado como convertido')
          }
          
          // Criar registro de venda do afiliado
          const affiliate = await prisma.affiliate.findUnique({
            where: { id: affiliateId },
            select: { commissionRate: true, name: true }
          })
          
          if (affiliate) {
            const commissionAmount = (normalizedTotal * affiliate.commissionRate) / 100
            
            console.log('   📊 Criando AffiliateSale...', {
              affiliateId,
              orderId: order.id,
              customerId: userId || null,
              customerName: user?.name || 'Não informado',
              orderTotal: normalizedTotal,
              commissionRate: affiliate.commissionRate,
              commissionAmount
            })
            
            await prisma.affiliateSale.create({
              data: {
                affiliateId,
                orderId: order.id,
                customerId: userId || null,
                customerName: user?.name || 'Não informado',
                customerEmail: user?.email || null,
                orderTotal: normalizedTotal,
                commissionRate: affiliate.commissionRate,
                commissionAmount,
                status: 'PENDING'
              }
            })
            
            console.log('   🎯 Conversão de afiliado registrada para pedido:', order.id)
            console.log(`   💰 Comissão calculada: R$ ${commissionAmount.toFixed(2)} (${affiliate.commissionRate}%)`)
          } else {
            console.log('   ⚠️ Afiliado não encontrado:', affiliateId)
          }
        } catch (conversionError: any) {
          console.error('   ⚠️ ERRO ao registrar conversão de afiliado:', conversionError?.message || conversionError)
          console.error('   Stack:', conversionError?.stack)
          // NÃO propagar o erro - pedido já foi criado com sucesso
        }
      }
      
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

      // Enviar email de pedido confirmado (não-bloqueante)
      if (user?.email) {
        sendTemplateEmail(
          EMAIL_TEMPLATES.ORDER_CONFIRMED,
          user.email,
          {
            customerName: user.name || order.buyerName || 'Cliente',
            orderId: order.id,
            orderTotal: order.total.toFixed(2)
          }
        ).catch((error: any) => {
          console.error('⚠️ Erro ao enviar email de pedido confirmado:', error?.message)
        })
      }

      // Enviar WhatsApp de pedido confirmado (não-bloqueante)
      if (order.buyerPhone) {
        WhatsAppService.sendOrderConfirmation(order.buyerPhone, {
          orderId: order.id.slice(-8).toUpperCase(),
          buyerName: order.buyerName || user?.name || 'Cliente',
          total: Number(order.total),
          itemsCount: order.items?.length || 1
        }).catch((e: any) => console.error('⚠️ WhatsApp pedido confirmado falhou:', e?.message))
      }

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
            // Filial: usa o warehouseCode do produto deste destino
            warehouseCode: warehouseByDest.get(destination) || null,
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

      // Enviar email de pedido confirmado (não-bloqueante)
      if (user?.email) {
        const totalValue = Array.from(itemsByDestination.values())
          .reduce((sum, items) => sum + items.reduce((s, i) => s + (i.price * i.quantity), 0), 0)
        
        sendTemplateEmail(
          EMAIL_TEMPLATES.ORDER_CONFIRMED,
          user.email,
          {
            customerName: user.name || 'Cliente',
            orderId: parentOrderId,
            orderTotal: totalValue.toFixed(2)
          }
        ).catch((error: any) => {
          console.error('⚠️ Erro ao enviar email de pedido confirmado:', error?.message)
        })

        // Enviar WhatsApp de pedido confirmado (não-bloqueante)
        if (buyerPhone) {
          WhatsAppService.sendOrderConfirmation(buyerPhone, {
            orderId: parentOrderId.slice(-8).toUpperCase(),
            buyerName: user?.name || 'Cliente',
            total: totalValue,
            itemsCount: Array.from(itemsByDestination.values()).reduce((s, items) => s + items.length, 0)
          }).catch((e: any) => console.error('⚠️ WhatsApp pedido híbrido falhou:', e?.message))
        }
      }

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
  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO ao criar pedido:', error)
    console.error('   Mensagem:', error?.message)
    console.error('   Stack:', error?.stack)
    console.error('   Code:', error?.code)
    
    return NextResponse.json(
      { 
        message: 'Erro ao criar pedido',
        error: error?.message || 'Erro desconhecido',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
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
      select: {
        id: true,
        parentOrderId: true,
        status: true,
        total: true,
        subtotal: true,
        shippingCost: true,
        discountAmount: true,
        createdAt: true,
        deliveryDays: true,
        shippingMethod: true,
        shippingService: true,
        shippingCarrier: true,
        shippingLabel: true,
        trackingCode: true,
        // Dados de entrega mascarados
        shippingAddress: true,
        // Items do pedido
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            selectedSize: true,
            selectedColor: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
              }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Mascarar dados sensíveis do endereço
    const sanitizedOrders = orders.map(order => {
      // Parsear endereço se for string JSON
      let addressObj: any = null
      if (order.shippingAddress) {
        try {
          addressObj = typeof order.shippingAddress === 'string' 
            ? JSON.parse(order.shippingAddress) 
            : order.shippingAddress
        } catch {
          addressObj = { raw: '***' }
        }
      }
      
      // Retornar apenas dados necessários para o usuário ver seu pedido
      // Sem CPF, sem telefone completo, sem dados pessoais desnecessários
      return {
        id: order.id,
        parentOrderId: order.parentOrderId ?? null,
        status: order.status,
        total: order.total,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        discountAmount: order.discountAmount,
        createdAt: order.createdAt,
        deliveryDays: order.deliveryDays,
        shippingMethod: order.shippingMethod,
        shippingService: order.shippingService,
        shippingCarrier: order.shippingCarrier,
        shippingLabel: order.shippingLabel,
        trackingCode: order.trackingCode,
        items: order.items,
        // Endereço sanitizado - apenas o necessário para o cliente ver
        shippingAddress: addressObj ? {
          street: addressObj.street || addressObj.logradouro || '***',
          number: addressObj.number || addressObj.numero || '***',
          complement: addressObj.complement || addressObj.complemento || '',
          neighborhood: addressObj.neighborhood || addressObj.bairro || '***',
          city: addressObj.city || addressObj.cidade || '***',
          state: addressObj.state || addressObj.uf || '***',
          zipCode: addressObj.zipCode || addressObj.cep || '***',
          // NÃO incluir: cpf, phone, name completo, reference
        } : null
      }
    })

    // Retornar no formato esperado pelo app { orders: [...] }
    return NextResponse.json({ orders: sanitizedOrders })
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar pedidos' },
      { status: 500 }
    )
  }
}
