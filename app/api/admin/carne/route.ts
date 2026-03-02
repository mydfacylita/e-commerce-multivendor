/**
 * GET  /api/admin/carne         — Lista todos os carnês
 * POST /api/admin/carne         — Cria carnê a partir de pedido existente
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // 'active' | 'completed' | 'overdue'

  const carnes = await prisma.carne.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      parcelas: { orderBy: { numero: 'asc' } },
      order: {
        select: {
          id: true,
          total: true,
          paymentMethod: true,
          paymentStatus: true,
          status: true,
          createdAt: true,
          buyerName: true,
          buyerEmail: true,
          buyerPhone: true,
          buyerCpf: true,
          items: { select: { id: true, quantity: true, price: true, product: { select: { name: true } } } },
        },
      },
    },
  })

  // Atualizar parcelas vencidas automaticamente
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const carne of carnes) {
    for (const p of carne.parcelas) {
      if (p.status === 'PENDING' && new Date(p.dueDate) < today) {
        await prisma.carneParcela.update({ where: { id: p.id }, data: { status: 'OVERDUE' } })
        p.status = 'OVERDUE'
      }
    }
  }

  return NextResponse.json({ carnes })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { orderId, numeroParcelas, primeiroVencimento, buyerName, buyerPhone, buyerCpf, notes } = body

  if (!orderId || !numeroParcelas || !primeiroVencimento) {
    return NextResponse.json({ error: 'orderId, numeroParcelas e primeiroVencimento são obrigatórios' }, { status: 400 })
  }

  // Buscar pedido
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { carne: true } })
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  if (order.carne) return NextResponse.json({ error: 'Este pedido já possui um carnê' }, { status: 409 })

  // Buscar taxa de juros configurada
  const interestConfig = await prisma.systemConfig.findUnique({ where: { key: 'financing.interestRate' } })
  const interestRate = interestConfig ? (parseFloat(interestConfig.value) || 0) : 0

  const totalValue = order.total

  // Calcular total com juros compostos: M = C × (1 + i)^n
  const totalWithInterest = interestRate > 0
    ? Math.round(totalValue * Math.pow(1 + interestRate / 100, numeroParcelas) * 100) / 100
    : totalValue

  const valorParcela = Math.round((totalWithInterest / numeroParcelas) * 100) / 100
  const primeiroVenc = new Date(primeiroVencimento)

  // Gerar parcelas mensais com valores baseados no total COM juros
  const parcelasData = Array.from({ length: numeroParcelas }, (_, i) => {
    const dueDate = new Date(primeiroVenc)
    dueDate.setMonth(dueDate.getMonth() + i)
    // Ajuste do último para fechar o total exato (elimina diferença de centavos)
    const valor = i === numeroParcelas - 1
      ? Math.round((totalWithInterest - valorParcela * (numeroParcelas - 1)) * 100) / 100
      : valorParcela
    return { numero: i + 1, valor, dueDate, status: 'PENDING' as const }
  })

  const carne = await prisma.carne.create({
    data: {
      orderId,
      buyerName: buyerName || order.buyerName || 'Comprador',
      buyerPhone: buyerPhone || order.buyerPhone,
      buyerCpf: buyerCpf || order.buyerCpf,
      totalValue,
      interestRate,
      totalWithInterest,
      notes,
      createdById: (session.user as any)?.id,
      parcelas: { createMany: { data: parcelasData } },
    },
    include: { parcelas: { orderBy: { numero: 'asc' } } },
  })

  // Atualizar pedido: mantém PENDING aguardando aceite do cliente
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentMethod: 'carne', paymentStatus: 'PENDING' },
  })

  return NextResponse.json({ carne }, { status: 201 })
}
