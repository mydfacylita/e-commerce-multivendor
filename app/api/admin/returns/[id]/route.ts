import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/admin/returns/:id
 *
 * Ações disponíveis via campo "action":
 *   approve  — Aprova a solicitação (status → APPROVED)
 *   reject   — Rejeita a solicitação (status → REJECTED)
 *   complete — Conclui após logística reversa (status → COMPLETED)
 *
 * Campos opcionais:
 *   adminNotes — Observação interna do admin
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const VALID_ACTIONS = ['approve', 'reject', 'complete']

  try {
    const body = await req.json()
    const { action, adminNotes } = body

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({
        error: `Campo "action" obrigatório. Valores aceitos: ${VALID_ACTIONS.join(', ')}`
      }, { status: 400 })
    }

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: params.id },
      include: { order: { select: { id: true, status: true, total: true, paymentId: true, paymentMethod: true } } }
    })

    if (!returnRequest) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    // Transições de status válidas
    const TRANSITIONS: Record<string, string[]> = {
      approve:  ['PENDING'],
      reject:   ['PENDING', 'APPROVED'],
      complete: ['APPROVED']
    }

    if (!TRANSITIONS[action].includes(returnRequest.status)) {
      return NextResponse.json({
        error: `Não é possível executar "${action}" em uma solicitação com status "${returnRequest.status}".`,
        validFromStatuses: TRANSITIONS[action]
      }, { status: 422 })
    }

    const adminName = (session.user as any).name || (session.user as any).email || 'admin'

    const newStatus =
      action === 'approve'  ? 'APPROVED'  :
      action === 'reject'   ? 'REJECTED'  :
      'COMPLETED'

    const updated = await prisma.returnRequest.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        adminNotes: adminNotes || returnRequest.adminNotes,
        reviewedAt: action !== 'complete' ? new Date() : returnRequest.reviewedAt,
        reviewedBy: action !== 'complete' ? adminName : returnRequest.reviewedBy,
        completedAt: action === 'complete' ? new Date() : null
      }
    })

    // Se COMPLETED e for devolução, o admin deve processar o reembolso manualmente via gateway
    // (o sistema registra mas não processa estorno automaticamente)
    const isReturn = returnRequest.reason?.startsWith('[DEVOLUÇÃO]')
    const refundNote = action === 'complete' && isReturn
      ? ' Lembre-se de processar o reembolso financeiro no gateway de pagamento.'
      : ''

    return NextResponse.json({
      data: {
        id: updated.id,
        orderId: updated.orderId,
        status: updated.status,
        adminNotes: updated.adminNotes,
        reviewedAt: updated.reviewedAt,
        reviewedBy: updated.reviewedBy,
        completedAt: updated.completedAt,
        message: `Solicitação ${newStatus.toLowerCase()} com sucesso.${refundNote}`
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 })
  }
}
