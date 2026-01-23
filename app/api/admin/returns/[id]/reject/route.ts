import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const rejectSchema = z.object({
  adminNotes: z.string().min(1, 'Motivo da rejeição é obrigatório').max(500)
})

/**
 * POST /api/admin/returns/[id]/reject
 * Nível: Administrative
 * Descrição: Rejeita uma solicitação de devolução
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. AUTHENTICATION & AUTHORIZATION
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem rejeitar devoluções' },
        { status: 403 }
      )
    }

    // 2. INPUT VALIDATION
    const requestId = params.id
    let requestData

    try {
      const body = await request.json()
      requestData = rejectSchema.parse(body)
    } catch (error) {
      return NextResponse.json(
        { error: 'Motivo da rejeição é obrigatório' },
        { status: 400 }
      )
    }

    // 3. FETCH RETURN REQUEST
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: requestId },
      include: {
        order: true,
        user: true
      }
    })

    if (!returnRequest) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada' },
        { status: 404 }
      )
    }

    // 4. BUSINESS VALIDATION
    if (returnRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Apenas solicitações pendentes podem ser rejeitadas' },
        { status: 400 }
      )
    }

    // 5. UPDATE RETURN REQUEST STATUS
    const updatedRequest = await prisma.returnRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
        adminNotes: requestData.adminNotes
      }
    })

    // 6. AUDIT LOG
    console.log(`[AUDIT] Return request rejected:`, {
      action: 'RETURN_REQUEST_REJECTED',
      adminId: session.user.id,
      adminEmail: session.user.email,
      returnRequestId: requestId,
      orderId: returnRequest.orderId,
      userId: returnRequest.userId,
      reason: returnRequest.reason,
      rejectionReason: requestData.adminNotes,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({
      success: true,
      returnRequest: updatedRequest,
      message: 'Solicitação de devolução rejeitada'
    })

  } catch (error) {
    console.error('[RETURN_REJECT] Erro interno:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      returnRequestId: params.id,
      adminId: (await getServerSession(authOptions))?.user?.id,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}