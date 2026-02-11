import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  try {
    console.log('[Fetch ML Orders] Iniciando busca de pedidos do ML...')

    // Buscar token do ML do admin
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { mercadoLivreAuth: true },
    })

    if (!adminUser?.mercadoLivreAuth) {
      return NextResponse.json(
        { message: 'Autenticação ML não encontrada' },
        { status: 400 }
      )
    }

    const mlAuth = adminUser.mercadoLivreAuth

    // Verificar se token expirou
    if (mlAuth.expiresAt < new Date()) {
      return NextResponse.json(
        { message: 'Token ML expirado. Faça login novamente.' },
        { status: 400 }
      )
    }

    // Buscar informações do usuário primeiro para pegar o seller_id correto
    const userResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${mlAuth.accessToken}` },
    })

    if (!userResponse.ok) {
      return NextResponse.json(
        { message: 'Erro ao buscar dados do usuário ML' },
        { status: 400 }
      )
    }

    const userData = await userResponse.json()
    const sellerId = userData.id

    console.log('[Fetch ML Orders] Seller ID:', sellerId)

    // Buscar pedidos recentes do ML (últimos 30 dias)
    const ordersResponse = await fetch(
      `https://api.mercadolibre.com/orders/search?seller=${sellerId}&sort=date_desc&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${mlAuth.accessToken}`,
        },
      }
    )

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text()
      console.error('[Fetch ML Orders] Erro ao buscar pedidos:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { message: errorText }
      }
      return NextResponse.json(
        { message: 'Erro ao buscar pedidos do ML', error: errorData },
        { status: 400 }
      )
    }

    const ordersData = await ordersResponse.json()
    const mlOrders = ordersData.results || []

    console.log(`[Fetch ML Orders] Encontrados ${mlOrders.length} pedidos no ML`)

    let importedCount = 0
    let skippedCount = 0

    for (const mlOrder of mlOrders) {
      try {
        // Verificar se o pedido já existe
        const existingOrder = await prisma.order.findUnique({
          where: { marketplaceOrderId: String(mlOrder.id) },
        })

        if (existingOrder) {
          skippedCount++
          continue
        }

        // Criar pedido local
        const total = mlOrder.total_amount || 0
        
        // Processar itens
        const orderItems = []
        
        for (const mlItem of mlOrder.order_items || []) {
          // Buscar produto local pelo título (você pode melhorar isso)
          const product = await prisma.product.findFirst({
            where: {
              name: { contains: mlItem.item.title.substring(0, 30) }
            },
            include: {
              seller: true,
            }
          })

          if (product) {
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
          }
        }

        // Pular se não encontrou produtos
        if (orderItems.length === 0) {
          console.log(`[Fetch ML Orders] Pedido ${mlOrder.id} sem produtos locais, pulando...`)
          skippedCount++
          continue
        }

        // Buscar dados do comprador no ML
        const buyerResponse = await fetch(
          `https://api.mercadolibre.com/users/${mlOrder.buyer.id}`,
          { headers: { Authorization: `Bearer ${mlAuth.accessToken}` } }
        )

        const buyerData = buyerResponse.ok ? await buyerResponse.json() : null

        // Dados do comprador
        const buyerName = buyerData?.first_name && buyerData?.last_name 
          ? `${buyerData.first_name} ${buyerData.last_name}`
          : buyerData?.nickname || mlOrder.buyer.nickname || 'Comprador ML'
        
        const buyerEmail = buyerData?.email || null
        const buyerPhone = buyerData?.phone?.number || mlOrder.buyer.phone?.number || null

        // Montar endereço completo
        let shippingAddress = 'Endereço não disponível'
        if (mlOrder.shipping?.receiver_address) {
          const addr = mlOrder.shipping.receiver_address
          const parts = [
            addr.address_line,
            addr.street_name,
            addr.street_number,
            addr.apartment,
            addr.floor,
            addr.zip_code,
            addr.city?.name,
            addr.state?.name,
            addr.country?.name
          ].filter(Boolean)
          shippingAddress = parts.join(', ')
        }

        console.log(`[Fetch ML Orders] Comprador: ${buyerName}`)
        console.log(`[Fetch ML Orders] Endereço: ${shippingAddress}`)

        // Criar pedido sem vincular a usuário
        await prisma.order.create({
          data: {
            buyerName,
            buyerEmail,
            buyerPhone,
            status: 'PENDING',
            total,
            shippingAddress,
            marketplaceName: 'Mercado Livre',
            marketplaceOrderId: String(mlOrder.id),
            items: {
              create: orderItems
            }
          }
        })

        importedCount++
        console.log(`[Fetch ML Orders] ✅ Pedido ${mlOrder.id} importado`)

      } catch (error) {
        console.error(`[Fetch ML Orders] Erro ao importar pedido ${mlOrder.id}:`, error)
        skippedCount++
      }
    }

    console.log(`[Fetch ML Orders] Importação concluída: ${importedCount} importados, ${skippedCount} pulados`)

    return NextResponse.json({
      success: true,
      count: importedCount,
      skipped: skippedCount,
      total: mlOrders.length
    })

  } catch (error) {
    console.error('[Fetch ML Orders] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar pedidos' },
      { status: 500 }
    )
  }
}
