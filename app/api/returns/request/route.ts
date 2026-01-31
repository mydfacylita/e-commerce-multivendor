import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Schema de validação seguindo as diretrizes do API Governance
const returnRequestSchema = z.object({
  orderId: z.string().min(1, 'ID do pedido é obrigatório'),
  itemIds: z.array(z.string()).min(1, 'Pelo menos um item deve ser selecionado'),
  reason: z.enum([
    'PRODUTO_DANIFICADO',
    'PRODUTO_INCORRETO', 
    'NAO_ATENDE_EXPECTATIVA',
    'DEFEITO_FABRICACAO',
    'ARREPENDIMENTO',
    'OUTRO'
  ]),
  description: z.string().max(500).optional()
})

/**
 * POST /api/returns/request
 * Nível: Authenticated
 * Descrição: Permite que clientes solicitem devolução de pedidos entregues
 * 
 * Seguindo API Governance:
 * - Autenticação obrigatória
 * - Validação de ownership (cliente só pode solicitar devolução dos próprios pedidos)
 * - Validação de regras de negócio (prazo de 7 dias)
 * - Audit log da operação
 */
export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATION CHECK (Required - Governance Level: Authenticated)
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Acesso negado. Login obrigatório.' },
        { status: 401 }
      )
    }

    // 2. INPUT VALIDATION (Required - Security Best Practice)
    let requestData
    try {
      const body = await request.json()
      requestData = returnRequestSchema.parse(body)
    } catch (error) {
      console.warn('[RETURN_REQUEST] Dados inválidos:', error)
      return NextResponse.json(
        { error: 'Dados de entrada inválidos' },
        { status: 400 }
      )
    }

    const { orderId, itemIds, reason, description } = requestData

    // 3. OWNERSHIP VERIFICATION (Required - Security)
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id // Garantir que o pedido pertence ao usuário
      },
      include: {
        items: true,
        returnRequests: true
      }
    })

    if (!order) {
      console.warn(`[RETURN_REQUEST] Pedido não encontrado ou acesso negado. User: ${session.user.id}, Order: ${orderId}`)
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // 4. BUSINESS RULE VALIDATION

    // 4.1 Verificar se o pedido está entregue
    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { error: 'Apenas pedidos entregues podem ser devolvidos' },
        { status: 400 }
      )
    }

    // 4.2 Verificar prazo de devolução (7 dias)
    if (order.shippedAt) {
      const shippedDate = new Date(order.shippedAt)
      const daysSinceShipped = Math.floor((Date.now() - shippedDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceShipped > 7) {
        return NextResponse.json(
          { error: 'Prazo para devolução expirado (máximo 7 dias após entrega)' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Data de envio não encontrada' },
        { status: 400 }
      )
    }

    // 4.3 Verificar se os itens existem no pedido
    const orderItemIds = order.items.map(item => item.id)
    const invalidItemIds = itemIds.filter(id => !orderItemIds.includes(id))
    
    if (invalidItemIds.length > 0) {
      return NextResponse.json(
        { error: 'Alguns itens não pertencem a este pedido' },
        { status: 400 }
      )
    }

    // 4.4 Verificar se já existe solicitação de devolução para algum item
    const existingReturnRequests = order.returnRequests.filter(
      request => request.status !== 'REJECTED'
    )
    
    const itemsAlreadyRequested = existingReturnRequests.flatMap(
      request => request.itemIds
    )
    
    const duplicateItems = itemIds.filter(id => itemsAlreadyRequested.includes(id))
    
    if (duplicateItems.length > 0) {
      return NextResponse.json(
        { error: 'Alguns itens já possuem solicitação de devolução ativa' },
        { status: 400 }
      )
    }

    // 5. CREATE RETURN REQUEST
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId,
        userId: session.user.id,
        itemIds: JSON.stringify(itemIds),
        reason,
        description,
        status: 'PENDING',
        requestedAt: new Date()
      }
    })

    // 6. AUDIT LOG (Required - Governance)
    console.log(`[AUDIT] Return request created:`, {
      action: 'RETURN_REQUEST_CREATED',
      userId: session.user.id,
      userEmail: session.user.email,
      orderId,
      returnRequestId: returnRequest.id,
      itemIds,
      reason,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    })

    // 7. CALCULATE RETURN VALUE
    const selectedItems = order.items.filter(item => itemIds.includes(item.id))
    const returnValue = selectedItems.reduce((total, item) => total + (item.price * item.quantity), 0)

    return NextResponse.json({
      success: true,
      returnRequest: {
        id: returnRequest.id,
        status: returnRequest.status,
        requestedAt: returnRequest.requestedAt,
        reason: returnRequest.reason,
        itemCount: itemIds.length,
        estimatedValue: returnValue
      },
      message: 'Solicitação de devolução enviada com sucesso. Será analisada em até 48 horas.'
    })

  } catch (error) {
    // ERROR HANDLING AND LOGGING
    console.error('[RETURN_REQUEST] Erro interno:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: (await getServerSession(authOptions))?.user?.id,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { 
        error: 'Erro interno do servidor. Tente novamente em instantes.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}