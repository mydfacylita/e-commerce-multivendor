import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

/**
 * GET /api/orders/[id]/carne/parcelas/[parcelaId]/check-status
 * Verifica status da parcela.
 * Fallback: se ainda PENDING, consulta MP por external_reference e auto-corrige o banco.
 * Isso garante que funciona mesmo quando o webhook não chegou (dev local, falha de rede).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; parcelaId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verifica dono do pedido
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { userId: true }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const parcela = await prisma.carneParcela.findFirst({
      where: { id: params.parcelaId, carne: { orderId: params.id } },
      select: { id: true, status: true, paidAt: true, paidBy: true, numero: true, valor: true, carneId: true, paymentId: true }
    })

    if (!parcela) {
      return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 })
    }

    // Já está paga no banco — retorna imediatamente
    if (parcela.status === 'PAID') {
      return NextResponse.json({
        parcelaId: parcela.id,
        status: 'PAID',
        paid: true,
        paidAt: parcela.paidAt,
        paidBy: parcela.paidBy,
        numero: parcela.numero,
        valor: parcela.valor
      })
    }

    // ----- FALLBACK: consulta MP diretamente -----
    // Necessário quando webhook não chegou (dev local, falha de delivery)
    try {
      const gateway = await prisma.paymentGateway.findFirst({
        where: { gateway: 'MERCADOPAGO', isActive: true },
        select: { config: true }
      })

      if (gateway?.config) {
        const cfg = typeof gateway.config === 'string'
          ? JSON.parse(gateway.config)
          : gateway.config

        const headers = { 'Authorization': `Bearer ${cfg.accessToken}` }
        let approved: any = null

        // Estratégia 1: buscar diretamente pelo paymentId gravado na parcela (mais rápido e confiável)
        if (parcela.paymentId) {
          const mpRes = await fetch(
            `https://api.mercadopago.com/v1/payments/${parcela.paymentId}`,
            { headers }
          )
          if (mpRes.ok) {
            const payment = await mpRes.json()
            if (payment.status === 'approved') approved = payment
          }
        }

        // Estratégia 2: busca por external_reference (fallback para casos sem paymentId gravado)
        if (!approved) {
          const externalRef = `CARNE_PARCELA_${params.parcelaId}`
          const mpRes = await fetch(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${externalRef}&sort=date_created&criteria=desc&limit=5`,
            { headers }
          )
          if (mpRes.ok) {
            const mpData = await mpRes.json()
            approved = (mpData.results || []).find((p: any) => p.status === 'approved')

            // Se achou pagamento aprovado via search, atualiza o paymentId no banco para as próximas consultas
            if (approved && !parcela.paymentId) {
              await prisma.carneParcela.update({
                where: { id: parcela.id },
                data: { paymentId: String(approved.id) }
              })
            }
          }
        }

        if (approved) {
          // Atualiza banco (auto-heal do webhook perdido)
          const paidBy = `${approved.payment_method_id || 'pix'} #${approved.id}`

          await prisma.carneParcela.update({
            where: { id: parcela.id },
            data: { status: 'PAID', paidAt: new Date(approved.date_approved || Date.now()), paidBy }
          })

          // Verifica se todas as parcelas do carnê foram pagas
          const todasParcelas = await prisma.carneParcela.findMany({
            where: { carneId: parcela.carneId },
            select: { id: true, status: true }
          })
          const todasPagas = todasParcelas
            .filter(p => p.id !== parcela.id)
            .every(p => p.status === 'PAID')
          if (todasPagas) {
            await prisma.order.update({
              where: { id: params.id },
              data: { paymentStatus: 'paid' }
            })
          }

          console.log(`✅ [CHECK-STATUS] Parcela ${parcela.numero} auto-corrigida para PAID via fallback MP (id: ${approved.id})`)

          return NextResponse.json({
            parcelaId: parcela.id,
            status: 'PAID',
            paid: true,
            paidAt: new Date(approved.date_approved || Date.now()),
            paidBy,
            numero: parcela.numero,
            valor: parcela.valor
          })
        }
      }
    } catch (mpError) {
      // Falha no fallback não impede retornar o status atual do banco
      console.warn('[CHECK-STATUS] Fallback MP falhou:', mpError)
    }

    // Retorna status atual do banco (ainda pendente)
    return NextResponse.json({
      parcelaId: parcela.id,
      status: parcela.status,
      paid: false,
      numero: parcela.numero,
      valor: parcela.valor
    })
  } catch (error) {
    console.error('Erro ao verificar status da parcela:', error)
    return NextResponse.json({ error: 'Erro ao verificar status' }, { status: 500 })
  }
}
