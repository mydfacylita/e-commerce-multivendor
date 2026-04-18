import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  try {
    console.log('[Auto Fetch Orders] Verificando novos pedidos...')

    const results = {
      mercadolivre: { imported: 0, errors: [] as string[] },
      shopee: { imported: 0, errors: [] as string[] },
    }

    // Buscar pedidos do Mercado Livre
    try {
      const mlResult = await fetchMercadoLivreOrders()
      results.mercadolivre = mlResult
    } catch (error: any) {
      console.error('[Auto Fetch] Erro ML:', error)
      results.mercadolivre.errors.push(error.message)
    }

    // Buscar pedidos da Shopee
    try {
      const shopeeResult = await fetchShopeeOrders()
      results.shopee = shopeeResult
    } catch (error: any) {
      console.error('[Auto Fetch] Erro Shopee:', error)
      results.shopee.errors.push(error.message)
    }

    const totalImported = Object.values(results).reduce((sum, r) => sum + r.imported, 0)

    return NextResponse.json({
      success: true,
      totalImported,
      details: results
    })

  } catch (error) {
    console.error('[Auto Fetch Orders] Erro:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao buscar pedidos' },
      { status: 500 }
    )
  }
}

async function fetchMercadoLivreOrders() {
  const result = { imported: 0, errors: [] as string[] }

  try {
    // Buscar token do ML
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { mercadoLivreAuth: true },
    })

    if (!adminUser?.mercadoLivreAuth) {
      result.errors.push('Autenticação ML não encontrada')
      return result
    }

    const mlAuth = adminUser.mercadoLivreAuth

    if (mlAuth.expiresAt < new Date()) {
      result.errors.push('Token ML expirado')
      return result
    }

    // Buscar apenas pedidos recentes (últimas 24 horas)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    // Buscar informações do usuário primeiro para pegar o seller_id correto
    const userResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${mlAuth.accessToken}` },
    })

    if (!userResponse.ok) {
      result.errors.push('Erro ao buscar dados do usuário ML')
      return result
    }

    const userData = await userResponse.json()
    const sellerId = userData.id

    // Buscar pedidos do vendedor
    const ordersResponse = await fetch(
      `https://api.mercadolibre.com/orders/search?seller=${sellerId}&sort=date_desc&limit=20`,
      {
        headers: { Authorization: `Bearer ${mlAuth.accessToken}` },
      }
    )

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text()
      console.error('[Auto Fetch ML] Erro ao buscar pedidos:', errorText)
      result.errors.push(`Erro ML: ${ordersResponse.status} - ${errorText}`)
      return result
    }

    const ordersData = await ordersResponse.json()
    const mlOrders = ordersData.results || []

    console.log(`[Auto Fetch ML] Encontrados ${mlOrders.length} pedidos no ML`)

    for (const mlOrder of mlOrders) {
      try {
        console.log(`[Auto Fetch ML] 📦 Processando pedido ${mlOrder.id}`)
        
        // ============================================
        // SEMPRE BUSCAR STATUS ATUALIZADO DO ML
        // ============================================
        const orderDetailResponse = await fetch(
          `https://api.mercadolibre.com/orders/${mlOrder.id}`,
          { headers: { Authorization: `Bearer ${mlAuth.accessToken}` } }
        )
        const orderDetail = orderDetailResponse.ok ? await orderDetailResponse.json() : mlOrder
        
        // Verificar tags especiais do ML
        const hasFraud = orderDetail.tags?.includes('fraud')
        const hasTest = orderDetail.tags?.includes('test_order')
        
        console.log(`[Auto Fetch ML] 📊 Status ML: ${orderDetail.status} | Substatus: ${orderDetail.substatus || 'N/A'}`)
        console.log(`[Auto Fetch ML] 🏷️ Tags: ${orderDetail.tags?.join(', ') || 'Nenhuma'}`)
        
        if (hasFraud) {
          console.log(`[Auto Fetch ML] 🚨 ATENÇÃO: Pedido marcado como FRAUDE pelo ML!`)
          console.log(`[Auto Fetch ML] 💡 O ML cancelou automaticamente por suspeita de fraude`)
        }
        
        if (hasTest) {
          console.log(`[Auto Fetch ML] 🧪 Pedido de TESTE do Mercado Livre`)
        }

        // ============================================
        // VERIFICAR SE PEDIDO JÁ EXISTE
        // ============================================
        const existingOrder = await prisma.order.findUnique({
          where: { marketplaceOrderId: String(mlOrder.id) },
        })

        if (existingOrder) {
          console.log(`[Auto Fetch ML] 🔄 Pedido ${mlOrder.id} já existe, verificando atualizações...`)
          
          // Mapear status do ML
          let orderStatus: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' = 'PENDING'
          let cancelReason = null

          if (orderDetail.status === 'cancelled') {
            orderStatus = 'CANCELLED'
            
            // Verificar motivo do cancelamento
            if (hasFraud) {
              cancelReason = '🚨 FRAUDE: Mercado Livre detectou atividade suspeita e cancelou automaticamente'
            } else {
              cancelReason = orderDetail.cancel_detail?.description || 'Cancelado no Mercado Livre'
            }
          } else if (orderDetail.status === 'paid') {
            if (orderDetail.tags?.includes('delivered')) {
              orderStatus = 'DELIVERED'
            } else if (orderDetail.tags?.includes('shipped')) {
              orderStatus = 'SHIPPED'
            } else {
              orderStatus = 'PROCESSING'
            }
          }
          
          // Buscar mensagens atualizadas
          let buyerMessages = existingOrder.buyerMessages
          try {
            const packId = orderDetail.pack_id || orderDetail.id
            const messagesUrl = `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${mlAuth.userId}?tag=post_sale`
            const messagesResponse = await fetch(messagesUrl, {
              headers: { Authorization: `Bearer ${mlAuth.accessToken}` }
            })

            if (messagesResponse.ok) {
              const messagesData = await messagesResponse.json()
              if (messagesData.messages && messagesData.messages.length > 0) {
                const buyerMessagesArray = messagesData.messages
                  .filter((msg: any) => msg.from.user_id !== mlAuth.userId)
                
                if (buyerMessagesArray.length > 0) {
                  buyerMessages = buyerMessagesArray
                    .map((msg: any) => `[${new Date(msg.date_created).toLocaleString('pt-BR')}] ${msg.text}`)
                    .join('\n\n')
                }
              }
            }
          } catch (error) {
            console.error('[Auto Fetch ML] ❌ Erro ao buscar mensagens:', error)
          }
          
          // Atualizar pedido
          await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              status: orderStatus,
              cancelReason,
              buyerMessages,
            }
          })
          
          console.log(`[Auto Fetch ML] ✅ Pedido ${mlOrder.id} ATUALIZADO!`)
          console.log(`[Auto Fetch ML]    - Status: ${existingOrder.status} → ${orderStatus}`)
          if (cancelReason) {
            console.log(`[Auto Fetch ML]    - 🚫 CANCELADO: ${cancelReason}`)
          }
          if (buyerMessages !== existingOrder.buyerMessages) {
            console.log(`[Auto Fetch ML]    - 💬 Mensagens atualizadas`)
          }
          
          continue
        }
        
        console.log(`[Auto Fetch ML] 🆕 Pedido novo, importando completo...`)
        
        // Buscar produto local
        const orderItems = []
        for (const mlItem of mlOrder.order_items || []) {
          console.log(`[Auto Fetch ML] Buscando produto: ${mlItem.item.title}`)
          
          const product = await prisma.product.findFirst({
            where: {
              OR: [
                { name: { contains: mlItem.item.title.substring(0, 30) } },
                { marketplaceListings: { some: { listingId: mlItem.item.id } } }
              ]
            },
            include: {
              seller: true,
            }
          })

          if (product) {
            console.log(`[Auto Fetch ML] ✅ Produto encontrado: ${product.name}`)
            
            const itemTotal = mlItem.unit_price * mlItem.quantity
            const isDropshipping = !!product.supplierSku
            
            let commissionRate = 0
            let commissionAmount = 0
            let sellerRevenue = 0

            if (isDropshipping && product.supplierSku) {
              // DROP: Vendedor ganha markup + comissão % do custo base (product.price)
              const originalProduct = await prisma.product.findUnique({
                where: { id: product.supplierSku },
                select: { dropshippingCommission: true, price: true }
              })
              
              commissionRate = originalProduct?.dropshippingCommission || 0
              const vendorBaseCost = originalProduct?.price || product.price || 0
              const costBase = vendorBaseCost * mlItem.quantity
              commissionAmount = vendorBaseCost * commissionRate / 100 * mlItem.quantity
              const markup = itemTotal - costBase
              sellerRevenue = markup + commissionAmount
            } else {
              // Produto próprio: vendedor PAGA comissão
              commissionRate = product.seller?.commission || 0
              commissionAmount = (itemTotal * commissionRate) / 100
              sellerRevenue = itemTotal - commissionAmount
            }

            orderItems.push({
              productId: product.id,
              quantity: mlItem.quantity,
              price: mlItem.unit_price,
              sellerId: product.sellerId,
              commissionRate,
              commissionAmount,
              sellerRevenue,
            })
          } else {
            console.log(`[Auto Fetch ML] ❌ Produto não encontrado para: ${mlItem.item.title}`)
          }
        }

        if (orderItems.length === 0) {
          console.log(`[Auto Fetch ML] ⏭️ Pedido ${mlOrder.id} sem produtos locais, pulando...`)
          continue
        }
        
        // ============================================
        // ETAPA 1: COLETAR DADOS DO PEDIDO (NOVO)
        // ============================================

        // ============================================
        // ETAPA 2: DADOS DO COMPRADOR
        // ============================================
        const buyerData = {
          nome: '',
          cpf: null as string | null,
          telefone: null as string | null,
        }

        // Nome completo
        if (orderDetail.buyer?.first_name && orderDetail.buyer?.last_name) {
          buyerData.nome = `${orderDetail.buyer.first_name} ${orderDetail.buyer.last_name}`
        } else {
          buyerData.nome = orderDetail.buyer?.nickname || 'Comprador ML'
        }

        // CPF do buyer
        if (orderDetail.buyer?.id) {
          try {
            const buyerResponse = await fetch(
              `https://api.mercadolibre.com/users/${orderDetail.buyer.id}`,
              { headers: { Authorization: `Bearer ${mlAuth.accessToken}` } }
            )
            
            if (buyerResponse.ok) {
              const buyerInfo = await buyerResponse.json()
              buyerData.cpf = buyerInfo.identification?.number || null
            }
          } catch (error) {
            console.error(`[Auto Fetch ML] ❌ Erro ao buscar CPF:`, error)
          }
        }

        // ============================================
        // ETAPA 3: DADOS DE ENDEREÇO E TELEFONE
        // ============================================
        const shippingData = {
          rua: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          cep: '',
          referencia: '',
          telefone: null as string | null,
        }

        if (orderDetail.shipping?.id) {
          try {
            const shipmentResponse = await fetch(
              `https://api.mercadolibre.com/shipments/${orderDetail.shipping.id}`,
              { headers: { Authorization: `Bearer ${mlAuth.accessToken}` } }
            )
            
            if (shipmentResponse.ok) {
              const shipmentData = await shipmentResponse.json()
              const addr = shipmentData.receiver_address

              if (addr) {
                shippingData.rua = addr.street_name || ''
                shippingData.numero = addr.street_number || ''
                shippingData.complemento = [
                  addr.apartment ? `Apto ${addr.apartment}` : null,
                  addr.floor ? `Andar ${addr.floor}` : null
                ].filter(Boolean).join(' ')
                shippingData.bairro = typeof addr.neighborhood === 'object' 
                  ? addr.neighborhood?.name || '' 
                  : addr.neighborhood || ''
                shippingData.cidade = addr.city?.name || ''
                shippingData.estado = addr.state?.name || ''
                shippingData.cep = addr.zip_code || ''
                shippingData.referencia = addr.comment || ''
                shippingData.telefone = addr.receiver_phone || null
              }
            }
          } catch (error) {
            console.error(`[Auto Fetch ML] ❌ Erro ao buscar endereço:`, error)
          }
        }

        // Se não conseguiu telefone do shipment, tenta do buyer
        if (!shippingData.telefone && orderDetail.buyer?.phone) {
          shippingData.telefone = orderDetail.buyer.phone.number || null
        }

        // Usar telefone do shipping como telefone do comprador
        buyerData.telefone = shippingData.telefone

        // ============================================
        // ETAPA 4: DADOS DE PAGAMENTO
        // ============================================
        const payment = orderDetail.payments?.[0]
        const paymentData = {
          metodo: payment?.payment_method_id || 'Não informado',
          frete: payment?.shipping_cost || 0,
        }

        // ============================================
        // ETAPA 5: MONTAR ENDEREÇO COMPLETO
        // ============================================
        const enderecoCompleto = [
          shippingData.rua && shippingData.numero ? `${shippingData.rua} ${shippingData.numero}` : shippingData.rua,
          shippingData.complemento,
          shippingData.bairro,
          shippingData.cidade && shippingData.estado ? `${shippingData.cidade} - ${shippingData.estado}` : '',
          shippingData.cep,
          shippingData.referencia,
        ].filter(Boolean).join(', ')

        // ============================================
        // ETAPA 6: LOG DOS DADOS COLETADOS
        // ============================================
        
        // Verificar se dados estão censurados pelo ML
        const dadosCensurados = 
          shippingData.rua.includes('XXX') || 
          shippingData.cep.includes('XXX') || 
          (shippingData.telefone && shippingData.telefone.includes('XXX'))
        
        if (dadosCensurados) {
          console.log(`[Auto Fetch ML] ⚠️⚠️⚠️ ATENÇÃO: MERCADO LIVRE CENSUROU OS DADOS! ⚠️⚠️⚠️`)
          console.log(`[Auto Fetch ML] Possíveis causas:`)
          console.log(`[Auto Fetch ML] - Token sem permissões de dados pessoais`)
          console.log(`[Auto Fetch ML] - Pedido em status de revisão (substatus: ${orderDetail.substatus || 'N/A'})`)
          console.log(`[Auto Fetch ML] - Conta em modo sandbox/teste`)
          console.log(`[Auto Fetch ML] 🔧 Solução: Aguarde aprovação do pedido ou verifique scopes do token`)
        }
        
        console.log(`[Auto Fetch ML] ==================== DADOS DO CLIENTE ====================`)
        console.log(`[Auto Fetch ML] 👤 Nome: ${buyerData.nome}`)
        console.log(`[Auto Fetch ML] 📄 CPF: ${buyerData.cpf || 'NÃO INFORMADO'}`)
        console.log(`[Auto Fetch ML] 📞 Telefone: ${buyerData.telefone || 'NÃO INFORMADO'}`)
        console.log(`[Auto Fetch ML] 📍 Rua: ${shippingData.rua} ${shippingData.numero}`)
        console.log(`[Auto Fetch ML] 🏘️ Bairro: ${shippingData.bairro}`)
        console.log(`[Auto Fetch ML] 🏙️ Cidade: ${shippingData.cidade}`)
        console.log(`[Auto Fetch ML] 🗺️ Estado: ${shippingData.estado}`)
        console.log(`[Auto Fetch ML] 📮 CEP: ${shippingData.cep}`)
        console.log(`[Auto Fetch ML] 📝 Referência: ${shippingData.referencia || 'Nenhuma'}`)
        console.log(`[Auto Fetch ML] 💳 Pagamento: ${paymentData.metodo}`)
        console.log(`[Auto Fetch ML] 🚚 Frete: R$ ${paymentData.frete}`)
        console.log(`[Auto Fetch ML] 📊 Substatus ML: ${orderDetail.substatus || 'N/A'}`)
        console.log(`[Auto Fetch ML] ================================================================`)

        // ============================================
        // ETAPA 7: STATUS E MENSAGENS
        // ============================================
        let orderStatus: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' = 'PENDING'
        let cancelReason = null

        if (orderDetail.status === 'cancelled') {
          orderStatus = 'CANCELLED'
          cancelReason = orderDetail.cancel_detail?.description || 'Cancelado no Mercado Livre'
        } else if (orderDetail.status === 'paid') {
          if (orderDetail.tags.includes('delivered')) {
            orderStatus = 'DELIVERED'
          } else if (orderDetail.tags.includes('shipped')) {
            orderStatus = 'SHIPPED'
          } else {
            orderStatus = 'PROCESSING'
          }
        }

        // Mensagens do comprador
        let buyerMessages = null
        try {
          const packId = orderDetail.pack_id || orderDetail.id
          const messagesUrl = `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${mlAuth.userId}?tag=post_sale`
          
          console.log(`[Auto Fetch ML] 📨 Buscando mensagens: ${messagesUrl}`)
          
          const messagesResponse = await fetch(messagesUrl, {
            headers: { Authorization: `Bearer ${mlAuth.accessToken}` }
          })

          console.log(`[Auto Fetch ML] 📨 Response status: ${messagesResponse.status}`)

          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json()
            console.log(`[Auto Fetch ML] 📨 Total de mensagens: ${messagesData.messages?.length || 0}`)
            
            if (messagesData.messages && messagesData.messages.length > 0) {
              const buyerMessagesArray = messagesData.messages
                .filter((msg: any) => msg.from.user_id !== mlAuth.userId)
              
              console.log(`[Auto Fetch ML] 📨 Mensagens do comprador: ${buyerMessagesArray.length}`)
              
              if (buyerMessagesArray.length > 0) {
                buyerMessages = buyerMessagesArray
                  .map((msg: any) => `[${new Date(msg.date_created).toLocaleString('pt-BR')}] ${msg.text}`)
                  .join('\n\n')
                
                console.log(`[Auto Fetch ML] 📨 Primeira mensagem: ${buyerMessagesArray[0].text}`)
              }
            } else {
              console.log(`[Auto Fetch ML] 📨 Nenhuma mensagem encontrada`)
            }
          } else {
            const errorText = await messagesResponse.text()
            console.log(`[Auto Fetch ML] 📨 Erro ao buscar mensagens: ${errorText}`)
          }
        } catch (error) {
          console.error('[Auto Fetch ML] ❌ Erro ao buscar mensagens:', error)
        }

        console.log(`[Auto Fetch ML] 📊 Status: ${orderStatus}`)
        console.log(`[Auto Fetch ML] 💬 Mensagens salvando: ${buyerMessages ? 'SIM' : 'NÃO'}`)

        // ============================================
        // ETAPA 8: INSERIR NO BANCO DE DADOS
        // ============================================
        console.log(`[Auto Fetch ML] 💾 Inserindo pedido no banco de dados...`)
        
        try {
          await prisma.order.create({
            data: {
              // Dados do comprador
              buyerName: buyerData.nome,
              buyerEmail: null,
              buyerPhone: buyerData.telefone,
              buyerCpf: buyerData.cpf,
              buyerMessages,
              
              // Dados de pagamento
              paymentMethod: paymentData.metodo,
              shippingCost: paymentData.frete,
              
              // Dados do pedido
              cancelReason,
              status: orderStatus,
              total: mlOrder.total_amount || 0,
              shippingAddress: enderecoCompleto,
              
              // Marketplace
              marketplaceName: 'Mercado Livre',
              marketplaceOrderId: String(mlOrder.id),
              
              // Itens
              items: { create: orderItems }
            }
          })
          
          result.imported++
          console.log(`[Auto Fetch ML] ✅ Pedido ${mlOrder.id} importado com sucesso!`)
        } catch (createError: any) {
          if (createError.code === 'P2002') {
            console.log(`[Auto Fetch ML] ⏭️ Pedido ${mlOrder.id} já existe (duplicata)`)
          } else {
            throw createError
          }
        }

      } catch (error) {
        console.error(`[Auto Fetch ML] Erro ao importar ${mlOrder.id}:`, error)
      }
    }

  } catch (error: any) {
    result.errors.push(error.message)
  }

  return result
}

// ─── Shopee helpers ─────────────────────────────────────────────────────────

const SHOPEE_PROD_BASE = 'https://partner.shopeemobile.com'
const SHOPEE_UAT_BASE = 'https://partner.uat.shopeemobile.com'

function shopeeBaseUrl(auth: any): string {
  return auth.isSandbox ? SHOPEE_UAT_BASE : SHOPEE_PROD_BASE
}

function shopeeSign(partnerId: number, endpoint: string, timestamp: number, accessToken: string, shopId: number, partnerKey: string): string {
  const base = `${partnerId}${endpoint}${timestamp}${accessToken}${shopId}`
  return crypto.createHmac('sha256', partnerKey).update(base).digest('hex')
}

async function shopeePost(endpoint: string, auth: any, body: any) {
  const timestamp = Math.floor(Date.now() / 1000)
  const sign = shopeeSign(auth.partnerId, endpoint, timestamp, auth.accessToken, auth.shopId, auth.partnerKey)
  const baseUrl = shopeeBaseUrl(auth)
  const url = `${baseUrl}${endpoint}?partner_id=${auth.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${auth.accessToken}&shop_id=${auth.shopId}`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`Shopee API HTTP ${res.status}: ${text.substring(0, 200)}`)
  }
}

// GET para endpoints de listagem (get_order_list, etc.)
async function shopeeGet(endpoint: string, auth: any, params: Record<string, any>) {
  const timestamp = Math.floor(Date.now() / 1000)
  const sign = shopeeSign(auth.partnerId, endpoint, timestamp, auth.accessToken, auth.shopId, auth.partnerKey)
  const baseUrl = shopeeBaseUrl(auth)
  const qs = new URLSearchParams({
    partner_id: String(auth.partnerId),
    timestamp: String(timestamp),
    sign,
    access_token: auth.accessToken,
    shop_id: String(auth.shopId),
  })
  for (const [k, v] of Object.entries(params)) {
    qs.append(k, String(v))
  }
  const url = `${baseUrl}${endpoint}?${qs.toString()}`
  const res = await fetch(url, { method: 'GET' })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`Shopee API HTTP ${res.status}: ${text.substring(0, 200)}`)
  }
}

async function shopeeRefreshIfNeeded(auth: any): Promise<any> {
  if (!auth.expiresAt || auth.expiresAt > new Date(Date.now() + 60 * 60 * 1000)) return auth
  if (!auth.refreshToken) return auth
  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const endpoint = '/api/v2/auth/access_token/get'
    const sign = crypto.createHmac('sha256', auth.partnerKey)
      .update(`${auth.partnerId}${endpoint}${timestamp}`).digest('hex')
    const baseUrl = shopeeBaseUrl(auth)
    const res = await fetch(
      `${baseUrl}${endpoint}?partner_id=${auth.partnerId}&timestamp=${timestamp}&sign=${sign}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: auth.refreshToken, partner_id: auth.partnerId, shop_id: auth.shopId }) }
    )
    const refreshText = await res.text()
    const data = JSON.parse(refreshText)
    if (data.access_token) {
      const updated = await prisma.shopeeAuth.update({
        where: { id: auth.id },
        data: { accessToken: data.access_token, refreshToken: data.refresh_token || auth.refreshToken, expiresAt: new Date(Date.now() + data.expire_in * 1000) }
      })
      console.log('[Auto Fetch Shopee] Token renovado.')
      return updated
    }
  } catch (e: any) {
    console.error('[Auto Fetch Shopee] Erro ao renovar token:', e.message)
  }
  return auth
}

function mapShopeeStatus(status: string): 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' {
  switch (status) {
    case 'UNPAID': return 'PENDING'
    case 'READY_TO_SHIP': return 'PROCESSING'
    case 'PROCESSED': return 'PROCESSING'
    case 'SHIPPED': return 'SHIPPED'
    case 'IN_CANCEL': return 'CANCELLED'
    case 'CANCELLED': return 'CANCELLED'
    case 'COMPLETED': return 'DELIVERED'
    default: return 'PENDING'
  }
}

async function fetchShopeeOrders() {
  const result = { imported: 0, errors: [] as string[] }

  try {
    let auth = await prisma.shopeeAuth.findFirst({ where: { accessToken: { not: '' } } })
    if (!auth) { result.errors.push('Shopee não conectada'); return result }

    auth = await shopeeRefreshIfNeeded(auth)
    console.log(`[Auto Fetch Shopee] 🔑 Auth OK — shopId=${auth?.shopId} isSandbox=${auth?.isSandbox}`)

    // Buscar pedidos dos últimos 2 dias em múltiplos status
    const timeFrom = Math.floor((Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000)
    const timeTo = Math.floor(Date.now() / 1000)
    const statuses = ['UNPAID', 'READY_TO_SHIP', 'PROCESSED', 'SHIPPED', 'COMPLETED', 'IN_CANCEL', 'CANCELLED']

    console.log(`[Auto Fetch Shopee] 🔍 Buscando pedidos de ${new Date(timeFrom*1000).toLocaleString('pt-BR')} até ${new Date(timeTo*1000).toLocaleString('pt-BR')}`)

    let allOrderSns: string[] = []
    for (const status of statuses) {
      const listData = await shopeeGet('/api/v2/order/get_order_list', auth, {
        time_range_field: 'create_time', time_from: timeFrom, time_to: timeTo,
        page_size: 50, order_status: status,
      })
      const sns = listData.response?.order_list?.map((o: any) => o.order_sn) || []
      if (sns.length > 0) {
        console.log(`[Auto Fetch Shopee] 📦 Status ${status}: ${sns.length} pedido(s) — ${sns.join(', ')}`)
      } else {
        console.log(`[Auto Fetch Shopee] ➖ Status ${status}: 0 pedidos`)
      }
      if (listData.error && listData.error !== 'error_not_found') {
        console.warn(`[Auto Fetch Shopee] ⚠️ API retornou erro para ${status}: ${listData.error} — ${listData.message}`)
      }
      allOrderSns = allOrderSns.concat(sns)
    }

    if (allOrderSns.length === 0) {
      console.log('[Auto Fetch Shopee] Nenhum pedido encontrado.')
      return result
    }

    console.log(`[Auto Fetch Shopee] ${allOrderSns.length} pedidos encontrados`)

    // Buscar detalhes em lotes de 50
    const chunks: string[][] = []
    for (let i = 0; i < allOrderSns.length; i += 50) chunks.push(allOrderSns.slice(i, i + 50))

    const allOrders: any[] = []
    for (const chunk of chunks) {
      console.log(`[Auto Fetch Shopee] 📋 Buscando detalhes de ${chunk.length} pedido(s): ${chunk.join(', ')}`)
      const detail = await shopeeGet('/api/v2/order/get_order_detail', auth, {
        order_sn_list: chunk.join(','),
        response_optional_fields: 'buyer_user_id,buyer_username,recipient_address,actual_shipping_fee,item_list',
      })
      const orders = detail.response?.order_list || []
      console.log(`[Auto Fetch Shopee] ✅ Detalhes recebidos: ${orders.length} pedido(s)`)
      if (detail.error) console.warn(`[Auto Fetch Shopee] ⚠️ Erro no get_order_detail: ${detail.error} — ${detail.message}`)
      allOrders.push(...orders)
    }

    for (const shopeeOrder of allOrders) {
      try {
        const orderSn = shopeeOrder.order_sn
        const status = mapShopeeStatus(shopeeOrder.order_status)

        console.log(`[Auto Fetch Shopee] ⏳ Processando pedido ${orderSn} | Status: ${shopeeOrder.order_status} → ${status} | Comprador: ${shopeeOrder.buyer_username || 'N/A'}`)

        // Pedido já existe? Só atualiza status
        const existing = await prisma.order.findFirst({ where: { marketplaceOrderId: orderSn } })
        if (existing) {
          if (existing.status !== status) {
            await prisma.order.update({ where: { id: existing.id }, data: { status } })
            console.log(`[Auto Fetch Shopee] 🔄 ${orderSn} atualizado: ${existing.status} → ${status}`)
          } else {
            console.log(`[Auto Fetch Shopee] ⏭️ ${orderSn} já existe com status ${status}, pulando`)
          }
          continue
        }

        // Pedido novo — montar dados
        const address = shopeeOrder.recipient_address
        const shippingAddress = JSON.stringify({
          name: address?.name || '',
          phone: address?.phone || '',
          street: address?.full_address || '',
          city: address?.city || '',
          state: address?.state || '',
          zipCode: address?.zipcode || '',
          country: address?.region || 'BR',
        })

        const total = (shopeeOrder.item_list || []).reduce(
          (sum: number, item: any) => sum + (item.model_discounted_price || item.model_original_price || 0) * (item.model_quantity || 1), 0
        ) + (shopeeOrder.actual_shipping_fee || 0)

        console.log(`[Auto Fetch Shopee] 📍 Endereço: ${address?.full_address || 'N/A'} — ${address?.city || 'N/A'}/${address?.state || 'N/A'} — CEP: ${address?.zipcode || 'N/A'}`)
        console.log(`[Auto Fetch Shopee] 💰 Total calculado: R$ ${total.toFixed(2)} (frete: R$ ${(shopeeOrder.actual_shipping_fee || 0).toFixed(2)})`)
        console.log(`[Auto Fetch Shopee] 🛒 Itens: ${(shopeeOrder.item_list || []).length} produto(s) no pedido`)

        // Associar itens a produtos locais
        const orderItems: any[] = []
        for (const item of (shopeeOrder.item_list || [])) {
          console.log(`[Auto Fetch Shopee]   📦 Item: ${item.item_name} | itemId=${item.item_id} | qty=${item.model_quantity} | preço=${item.model_discounted_price || item.model_original_price}`)
          const listing = await prisma.marketplaceListing.findFirst({
            where: { marketplace: { in: ['shopee', 'SHOPEE'] }, listingId: String(item.item_id) }
          })
          if (listing) {
            console.log(`[Auto Fetch Shopee]   ✅ Produto mapeado: listingId=${listing.listingId} → productId=${listing.productId}`)
            orderItems.push({ productId: listing.productId, quantity: item.model_quantity || 1, price: item.model_discounted_price || item.model_original_price || 0 })
          } else {
            console.log(`[Auto Fetch Shopee]   ⚠️ Produto SEM listing local: ${item.item_name} (itemId=${item.item_id})`)
          }
        }
        console.log(`[Auto Fetch Shopee] 💾 Criando pedido no banco... (${orderItems.length}/${(shopeeOrder.item_list||[]).length} itens mapeados)`)

        // Criar pedido (mesmo sem itens mapeados, para não perder o pedido)
        await prisma.order.create({
          data: {
            buyerName: shopeeOrder.buyer_username || 'Cliente Shopee',
            buyerEmail: `shopee_${shopeeOrder.buyer_user_id || 'unknown'}@marketplace.com`,
            buyerPhone: address?.phone || null,
            shippingAddress,
            status,
            total,
            shippingCost: shopeeOrder.actual_shipping_fee || 0,
            marketplaceName: 'Shopee',
            marketplaceOrderId: orderSn,
            ...(orderItems.length > 0 ? { items: { create: orderItems } } : {}),
          }
        })

        result.imported++
        console.log(`[Auto Fetch Shopee] ✅ PEDIDO IMPORTADO: ${orderSn} | Status: ${shopeeOrder.order_status} | Comprador: ${shopeeOrder.buyer_username} | Total: R$ ${total.toFixed(2)}`)

      } catch (err: any) {
        if (err.code === 'P2002') {
          console.log(`[Auto Fetch Shopee] ⏭️ Duplicata ignorada: ${shopeeOrder.order_sn}`)
        } else {
          console.error(`[Auto Fetch Shopee] Erro no pedido ${shopeeOrder.order_sn}:`, err.message)
          result.errors.push(`${shopeeOrder.order_sn}: ${err.message}`)
        }
      }
    }

  } catch (error: any) {
    result.errors.push(error.message)
  }

  return result
}

// GET para permitir verificação manual também
export async function GET(request: NextRequest) {
  return POST(request)
}
