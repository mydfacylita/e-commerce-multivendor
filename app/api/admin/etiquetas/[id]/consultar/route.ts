import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { correiosCWS } from '@/lib/correios-cws'

/**
 * GET /api/admin/etiquetas/[id]/consultar
 * Consulta status da pré-postagem nos Correios
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = params

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (!order.trackingCode) {
      return NextResponse.json({ error: 'Etiqueta não encontrada' }, { status: 404 })
    }

    // Consultar rastreio nos Correios
    const resultado = await correiosCWS.rastrearObjeto(order.trackingCode)

    if (!resultado.success) {
      return NextResponse.json({ 
        error: resultado.error || 'Erro ao consultar nos Correios',
        trackingCode: order.trackingCode
      }, { status: 400 })
    }

    // Verificar se foi postado
    const eventos = resultado.eventos || []
    const foiPostado = eventos.some((e: any) => 
      e.codigo === 'PO' || // Postado
      e.descricao?.toLowerCase().includes('postado') ||
      e.descricao?.toLowerCase().includes('objeto recebido')
    )

    // Se foi postado e não está marcado, atualizar
    if (foiPostado && !order.shippedAt) {
      await prisma.order.update({
        where: { id },
        data: {
          shippedAt: new Date(),
          status: 'SHIPPED'
        }
      })
    }

    return NextResponse.json({
      success: true,
      trackingCode: order.trackingCode,
      status: foiPostado ? 'POSTADO' : 'AGUARDANDO_POSTAGEM',
      eventos: eventos.slice(0, 5), // Últimos 5 eventos
      ultimoEvento: eventos[0] || null
    })

  } catch (error: any) {
    console.error('Erro ao consultar etiqueta:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
