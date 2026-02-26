import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateDevAuth, hasScope, devAuthError, logDevApiCall } from '@/lib/dev-auth'

/**
 * V1 — Inspeção de produto devolvido pelo galpão
 *
 * POST /api/v1/returns/:id/inspect
 *
 * Pré-requisito: return request com status APPROVED
 * (o admin já autorizou a devolução, o cliente enviou o produto, o galpão
 *  recebeu fisicamente e agora reporta o resultado da inspeção)
 *
 * Escopo necessário: orders:write
 *
 * Body:
 * {
 *   condition   : "GOOD" | "DAMAGED" | "WRONG_PRODUCT" | "INCOMPLETE",
 *   notes       : string,                       // descrição detalhada
 *   recommendation: "APPROVE" | "REJECT",       // parecer do galpão
 *   receivedAt? : string (ISO date),            // padrão = agora
 *   photos?     : string[]                      // URLs de fotos da inspeção
 * }
 */

const CONDITION_LABELS: Record<string, string> = {
  GOOD:          'Produto em bom estado',
  DAMAGED:       'Produto danificado',
  WRONG_PRODUCT: 'Produto diferente do pedido',
  INCOMPLETE:    'Produto incompleto (partes faltando)'
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const start = Date.now()
  const auth = await validateDevAuth(req)
  if (!auth.valid) return devAuthError(auth.error!, auth.statusCode!)
  if (!hasScope(auth, 'orders:write')) return devAuthError('Scope insuficiente: orders:write', 403)

  const path = `/api/v1/returns/${params.id}/inspect`

  try {
    const body = await req.json()
    const { condition, notes, recommendation, receivedAt, photos } = body

    // ── Validações básicas ──────────────────────────────────────────────────
    if (!condition || !CONDITION_LABELS[condition]) {
      return NextResponse.json({
        error: 'Campo "condition" inválido.',
        acceptedValues: Object.keys(CONDITION_LABELS),
        descriptions: CONDITION_LABELS
      }, { status: 400 })
    }

    if (!notes || typeof notes !== 'string' || notes.trim().length < 10) {
      return NextResponse.json({
        error: 'Campo "notes" é obrigatório e deve ter no mínimo 10 caracteres.'
      }, { status: 400 })
    }

    if (!recommendation || !['APPROVE', 'REJECT'].includes(recommendation)) {
      return NextResponse.json({
        error: 'Campo "recommendation" inválido.',
        acceptedValues: ['APPROVE', 'REJECT']
      }, { status: 400 })
    }

    // ── Buscar o ReturnRequest ──────────────────────────────────────────────
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: params.id },
      include: {
        order: {
          select: {
            id: true,
            warehouseCode: true,
            sellerId: true,
            status: true
          }
        }
      }
    })

    if (!returnRequest) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    // ── Verificar se o app tem acesso ao pedido desta devolução ────────────
    const app = await prisma.developerApp.findUnique({
      where: { id: auth.appId! },
      select: { filterConfig: true, name: true }
    })

    const fc = (app?.filterConfig as any)?.orders || {}
    if (fc.warehouseCode && returnRequest.order.warehouseCode !== fc.warehouseCode) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }
    if (fc.sellerId && returnRequest.order.sellerId !== fc.sellerId) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    // ── Pré-requisito: status deve ser APPROVED ────────────────────────────
    if (returnRequest.status !== 'APPROVED') {
      const messages: Record<string, string> = {
        PENDING:   'A solicitação ainda não foi aprovada pelo administrador.',
        REJECTED:  'Esta solicitação foi rejeitada e não pode ser inspecionada.',
        COMPLETED: 'Esta solicitação já foi concluída.'
      }
      return NextResponse.json({
        error: 'Inspeção só é possível em solicitações com status APPROVED.',
        currentStatus: returnRequest.status,
        detail: messages[returnRequest.status] || 'Status inválido para inspeção.',
        prerequisite: returnRequest.status === 'PENDING'
          ? 'Solicitar aprovação do administrador antes de inspecionar.'
          : undefined
      }, { status: 422 })
    }

    // ── Verificar se já foi inspecionado ───────────────────────────────────
    const alreadyInspected = returnRequest.adminNotes?.includes('[WAREHOUSE_INSPECTION]')
    if (alreadyInspected) {
      return NextResponse.json({
        error: 'Esta solicitação já foi inspecionada pelo galpão.',
        hint: 'O administrador irá revisar o parecer e concluir ou rejeitar.'
      }, { status: 409 })
    }

    // ── Montar bloco de inspeção (armazenado em adminNotes) ─────────────────
    const inspectedAt = receivedAt
      ? new Date(receivedAt).toISOString()
      : new Date().toISOString()

    const inspectionPayload = {
      warehouseCode: returnRequest.order.warehouseCode || fc.warehouseCode || 'N/A',
      appName:       app?.name || auth.appId,
      condition,
      conditionLabel: CONDITION_LABELS[condition],
      notes:         notes.trim(),
      recommendation,
      photos:        Array.isArray(photos) ? photos.slice(0, 10) : [],
      inspectedAt
    }

    // Prefixar com tag para separar de notas do admin
    const inspectionBlock =
      `[WAREHOUSE_INSPECTION]\n${JSON.stringify(inspectionPayload, null, 2)}`

    const existingNotes = returnRequest.adminNotes?.trim() || ''
    const mergedNotes = existingNotes
      ? `${inspectionBlock}\n\n[ADMIN_NOTES]\n${existingNotes}`
      : inspectionBlock

    // ── Persistir inspeção ─────────────────────────────────────────────────
    const updated = await prisma.returnRequest.update({
      where: { id: params.id },
      data: {
        adminNotes: mergedNotes,
        reviewedAt: new Date(inspectedAt),
        reviewedBy: `galpão:${inspectionPayload.warehouseCode}`
      }
    })

    // ── Log ───────────────────────────────────────────────────────────────
    logDevApiCall({
      appId:     auth.appId!,
      keyPrefix: auth.keyPrefix!,
      path,
      method:    'POST',
      statusCode: 200,
      latencyMs:  Date.now() - start
    })

    const nextStep =
      recommendation === 'APPROVE'
        ? 'Informar administrador para concluir a solicitação (reembolso/troca).'
        : 'Informar administrador para revisar e possivelmente rejeitar a solicitação.'

    return NextResponse.json({
      returnRequestId: params.id,
      orderId:         returnRequest.orderId,
      inspection: {
        condition,
        conditionLabel: CONDITION_LABELS[condition],
        recommendation,
        notes:          notes.trim(),
        photos:         inspectionPayload.photos,
        inspectedAt,
        warehouseCode:  inspectionPayload.warehouseCode
      },
      status:   'APPROVED',         // status não muda — admin decide o próximo passo
      nextStep,
      message:  'Inspeção registrada com sucesso. Aguardando decisão do administrador.'
    }, { status: 200 })

  } catch (error) {
    console.error('[V1_RETURN_INSPECT] Erro:', error)
    logDevApiCall({
      appId:    auth.appId!,
      keyPrefix: auth.keyPrefix!,
      path,
      method:   'POST',
      statusCode:   500,
      latencyMs: Date.now() - start
    })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
