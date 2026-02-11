import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  try {
    console.log('[Auto Fetch Orders] Verificando novos pedidos...')

    const results = {
      mercadolivre: { imported: 0, errors: [] as string[] },
      // shopee: { imported: 0, errors: [] },
      // amazon: { imported: 0, errors: [] },
    }

    // Buscar pedidos do Mercado Livre
    try {
      const mlResult = await fetchMercadoLivreOrders()
      results.mercadolivre = mlResult
    } catch (error: any) {
      console.error('[Auto Fetch] Erro ML:', error)
      results.mercadolivre.errors.push(error.message)
    }

    // TODO: Adicionar outras plataformas aqui
    // const shopeeResult = await fetchShopeeOrders()
    // const amazonResult = await fetchAmazonOrders()

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

// GET para permitir verificação manual também
export async function GET(request: NextRequest) {
  return POST(request)
}
