import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { correiosCWS } from '@/lib/correios-cws'

/**
 * GET /api/admin/etiquetas/[id]
 * Consulta detalhes de uma etiqueta específica
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

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        invoices: { where: { status: 'ISSUED' }, take: 1 }
      }
    })

    if (!order || !order.trackingCode) {
      return NextResponse.json({ error: 'Etiqueta não encontrada' }, { status: 404 })
    }

    const orderAny = order as any

    return NextResponse.json({
      success: true,
      etiqueta: {
        orderId: order.id,
        trackingCode: order.trackingCode,
        correiosIdPrePostagem: orderAny.correiosIdPrePostagem || ''
      }
    })

  } catch (error: any) {
    console.error('Erro ao consultar etiqueta:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/etiquetas/[id]
 * Atualiza dados de uma pré-postagem nos Correios
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id }
    })

    const orderAny = order as any

    if (!order || !orderAny.correiosIdPrePostagem) {
      return NextResponse.json({ error: 'Pré-postagem não encontrada' }, { status: 404 })
    }

    // Verificar se já foi postada
    if (order.shippedAt) {
      return NextResponse.json({ 
        error: 'Não é possível alterar uma etiqueta já postada' 
      }, { status: 400 })
    }

    // Atualizar pré-postagem nos Correios
    const resultado = await correiosCWS.atualizarPrePostagem(
      orderAny.correiosIdPrePostagem,
      {
        destinatario: body.destinatario,
        peso: body.peso,
        altura: body.altura,
        largura: body.largura,
        comprimento: body.comprimento,
        nfe: body.nfeChave ? {
          chave: body.nfeChave,
          numero: body.nfeNumero,
          serie: body.nfeSerie
        } : undefined
      }
    )

    if (!resultado.success) {
      return NextResponse.json({ 
        error: resultado.error || 'Erro ao atualizar nos Correios' 
      }, { status: 400 })
    }

    // Atualizar dados locais do pedido também
    const shippingData = order.shippingAddress ? JSON.parse(order.shippingAddress) : {}
    const updatedShippingData = {
      ...shippingData,
      name: body.destinatario?.nome || shippingData.name,
      cpf: body.destinatario?.cpfCnpj || shippingData.cpf,
      street: body.destinatario?.logradouro || shippingData.street,
      number: body.destinatario?.numero || shippingData.number,
      complement: body.destinatario?.complemento || shippingData.complement,
      neighborhood: body.destinatario?.bairro || shippingData.neighborhood,
      city: body.destinatario?.cidade || shippingData.city,
      state: body.destinatario?.uf || shippingData.state,
      zipCode: body.destinatario?.cep || shippingData.zipCode,
      phone: body.destinatario?.telefone || shippingData.phone,
      email: body.destinatario?.email || shippingData.email
    }

    await prisma.order.update({
      where: { id },
      data: {
        buyerName: body.destinatario?.nome || order.buyerName,
        buyerPhone: body.destinatario?.telefone || order.buyerPhone,
        buyerEmail: body.destinatario?.email || order.buyerEmail,
        buyerCpf: body.destinatario?.cpfCnpj || order.buyerCpf,
        shippingAddress: JSON.stringify(updatedShippingData)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Etiqueta atualizada com sucesso!'
    })

  } catch (error: any) {
    console.error('Erro ao atualizar etiqueta:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
