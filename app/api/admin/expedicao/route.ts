import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET - Listar pedidos para expedição
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('📦 [Expedição] Session:', session?.user?.email, session?.user?.role)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      console.log('📦 [Expedição] ❌ Não autorizado')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const search = searchParams.get('search') || ''
    
    console.log('📦 [Expedição] Filtro:', status, '| Busca:', search)

    // Construir filtro baseado no status de expedição
    let whereClause: any = {
      // Apenas pedidos confirmados (PROCESSING = pago, aguardando envio)
      status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] },
      // Excluir pedidos de importação direta (AliExpress) - esses são enviados pelo fornecedor
      // Usando AND com NOT para cada condição separadamente para evitar problemas com NULL
      AND: [
        { OR: [{ shippingMethod: null }, { shippingMethod: { not: 'international' } }] },
        { OR: [{ shippingCarrier: null }, { shippingCarrier: { not: 'Importação Direta' } }] }
      ]
    }

    // Filtro por status de expedição
    switch (status) {
      case 'pending':
        // Pedidos pagos que ainda não foram separados
        whereClause.separatedAt = null
        whereClause.status = 'PROCESSING'
        break
      case 'separated':
        whereClause.separatedAt = { not: null }
        whereClause.packedAt = null
        break
      case 'packed':
        whereClause.packedAt = { not: null }
        whereClause.shippedAt = null
        break
      case 'shipped':
        whereClause.shippedAt = { not: null }
        break
      case 'all':
        // Sem filtro adicional
        break
    }

    // Busca por ID ou nome do cliente
    if (search) {
      whereClause.OR = [
        { id: { contains: search } },
        { buyerName: { contains: search } },
        { buyerEmail: { contains: search } },
        { trackingCode: { contains: search } }
      ]
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                weight: true,
                length: true,
                width: true,
                height: true
              }
            }
          }
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            accessKey: true,
            status: true,
            pdfUrl: true,
            errorMessage: true
          }
        }
      },
      orderBy: [
        { separatedAt: 'asc' }, // Pendentes primeiro
        { createdAt: 'asc' }     // Mais antigos primeiro
      ],
      take: 50
    })

    console.log('📦 [Expedição] Encontrados:', orders.length, 'pedidos')
    console.log('📦 [Expedição] Where:', JSON.stringify(whereClause))

    // Buscar informações da embalagem se tiver
    const ordersWithPackaging = await Promise.all(
      orders.map(async (order) => {
        let packagingBox = null
        if (order.packagingBoxId) {
          packagingBox = await prisma.packagingBox.findUnique({
            where: { id: order.packagingBoxId },
            select: { 
              id: true, 
              code: true, 
              name: true,
              innerLength: true,
              innerWidth: true,
              innerHeight: true,
              outerLength: true,
              outerWidth: true,
              outerHeight: true,
              maxWeight: true
            }
          })
        }
        return { ...order, packagingBox }
      })
    )

    return NextResponse.json({ orders: ordersWithPackaging })
  } catch (error) {
    console.error('Erro ao listar pedidos para expedição:', error)
    return NextResponse.json({ error: 'Erro ao listar pedidos' }, { status: 500 })
  }
}
