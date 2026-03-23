import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Abrir sessão de caixa
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'ADMIN' && !session.user.isAdminStaff)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const caixa = await prisma.pdvCaixa.findUnique({ where: { id: params.id } })
  if (!caixa) return NextResponse.json({ error: 'Caixa não encontrado' }, { status: 404 })

  // Verifica se já tem sessão aberta
  const sessaoAberta = await prisma.pdvSessao.findFirst({
    where: { caixaId: params.id, status: 'ABERTA' }
  })
  if (sessaoAberta) {
    return NextResponse.json({ error: 'Caixa já está aberto', sessao: sessaoAberta }, { status: 400 })
  }

  const { valorAbertura = 0, observacoes } = await req.json()

  const sessao = await prisma.pdvSessao.create({
    data: {
      caixaId: params.id,
      operadorId: session.user.id,
      operadorNome: session.user.name || session.user.email || 'Operador',
      valorAbertura: parseFloat(valorAbertura),
      observacoes: observacoes || null,
      status: 'ABERTA'
    }
  })

  return NextResponse.json(sessao, { status: 201 })
}

// Fechar sessão de caixa
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'ADMIN' && !session.user.isAdminStaff)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const sessaoAberta = await prisma.pdvSessao.findFirst({
    where: { caixaId: params.id, status: 'ABERTA' }
  })
  if (!sessaoAberta) return NextResponse.json({ error: 'Nenhuma sessão aberta' }, { status: 404 })

  const { valorFechamento, observacoes } = await req.json()

  // Recalcula totais
  const vendas = await prisma.pdvVenda.findMany({
    where: { sessaoId: sessaoAberta.id, status: 'CONCLUIDA' }
  })

  const totais = vendas.reduce((acc: { totalVendas: number; totalDinheiro: number; totalCartao: number; totalPix: number; totalOutros: number; qtdVendas: number }, v: { total: number; formaPagamento: string }) => {
    acc.totalVendas += v.total
    acc.qtdVendas += 1
    const fp = v.formaPagamento
    if (fp === 'DINHEIRO') acc.totalDinheiro += v.total
    else if (fp === 'CARTAO_CREDITO' || fp === 'CARTAO_DEBITO') acc.totalCartao += v.total
    else if (fp === 'PIX') acc.totalPix += v.total
    else acc.totalOutros += v.total
    return acc
  }, { totalVendas: 0, totalDinheiro: 0, totalCartao: 0, totalPix: 0, totalOutros: 0, qtdVendas: 0 })

  const sessaoFechada = await prisma.pdvSessao.update({
    where: { id: sessaoAberta.id },
    data: {
      status: 'FECHADA',
      valorFechamento: valorFechamento ? parseFloat(valorFechamento) : null,
      fechadoEm: new Date(),
      observacoes: observacoes || sessaoAberta.observacoes,
      ...totais
    }
  })

  return NextResponse.json(sessaoFechada)
}

// Buscar sessão ativa
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'ADMIN' && !session.user.isAdminStaff)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const sessao = await prisma.pdvSessao.findFirst({
    where: { caixaId: params.id, status: 'ABERTA' },
    include: { _count: { select: { vendas: true } } }
  })

  return NextResponse.json(sessao)
}
