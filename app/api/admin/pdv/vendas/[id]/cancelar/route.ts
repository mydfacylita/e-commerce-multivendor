import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'ADMIN' && !session.user.isAdminStaff)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const venda = await prisma.pdvVenda.findUnique({ where: { id: params.id } })
  if (!venda) return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
  if (venda.status === 'CANCELADA') return NextResponse.json({ error: 'Venda já cancelada' }, { status: 400 })

  const { motivoCancelamento } = await req.json()

  const vendaCancelada = await prisma.pdvVenda.update({
    where: { id: params.id },
    data: {
      status: 'CANCELADA',
      canceladoEm: new Date(),
      canceladoPor: session.user.name || session.user.email || 'Operador',
      motivoCancelamento: motivoCancelamento || null
    }
  })

  // Reverte totais na sessão
  const fp = venda.formaPagamento
  await prisma.pdvSessao.update({
    where: { id: venda.sessaoId },
    data: {
      totalVendas: { decrement: venda.total },
      qtdVendas: { decrement: 1 },
      totalDinheiro: fp === 'DINHEIRO' ? { decrement: venda.total } : undefined,
      totalCartao: (fp === 'CARTAO_CREDITO' || fp === 'CARTAO_DEBITO') ? { decrement: venda.total } : undefined,
      totalPix: fp === 'PIX' ? { decrement: venda.total } : undefined,
      totalOutros: (fp !== 'DINHEIRO' && fp !== 'CARTAO_CREDITO' && fp !== 'CARTAO_DEBITO' && fp !== 'PIX') ? { decrement: venda.total } : undefined,
    }
  })

  return NextResponse.json(vendaCancelada)
}
