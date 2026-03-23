import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Listar vendas (com filtros)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'ADMIN' && !session.user.isAdminStaff)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const sessaoId = searchParams.get('sessaoId')
  const caixaId = searchParams.get('caixaId')
  const data = searchParams.get('data')

  const where: Record<string, unknown> = {}
  if (sessaoId) where.sessaoId = sessaoId
  if (caixaId) where.caixaId = caixaId
  if (data) {
    const d = new Date(data)
    const fim = new Date(data)
    fim.setDate(fim.getDate() + 1)
    where.createdAt = { gte: d, lt: fim }
  }

  const vendas = await prisma.pdvVenda.findMany({
    where,
    include: { itens: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  return NextResponse.json(vendas)
}

// Registrar venda
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'ADMIN' && !session.user.isAdminStaff)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const {
    caixaId, sessaoId,
    clienteNome, clienteCpf, clienteTelefone,
    itens, desconto = 0, acrescimo = 0,
    formaPagamento, pagamentos, troco = 0,
    observacoes
  } = body

  if (!caixaId || !sessaoId || !itens?.length || !formaPagamento) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Verifica sessão aberta
  const sessao = await prisma.pdvSessao.findFirst({
    where: { id: sessaoId, caixaId, status: 'ABERTA' }
  })
  if (!sessao) return NextResponse.json({ error: 'Sessão não está aberta' }, { status: 400 })

  const subtotal = itens.reduce((s: number, i: { quantidade: number; precoUnit: number }) => s + (i.quantidade * i.precoUnit), 0)
  const total = subtotal - desconto + acrescimo

  // Calcula próximo número
  const ultima = await prisma.pdvVenda.findFirst({
    where: { caixaId },
    orderBy: { numero: 'desc' },
    select: { numero: true }
  })
  const numero = (ultima?.numero || 0) + 1

  const venda = await prisma.pdvVenda.create({
    data: {
      numero,
      caixaId,
      sessaoId,
      operadorId: session.user.id,
      operadorNome: session.user.name || session.user.email || 'Operador',
      clienteNome: clienteNome || null,
      clienteCpf: clienteCpf || null,
      clienteTelefone: clienteTelefone || null,
      subtotal,
      desconto: parseFloat(desconto),
      acrescimo: parseFloat(acrescimo),
      total,
      formaPagamento,
      pagamentos: pagamentos ? JSON.stringify(pagamentos) : null,
      troco: parseFloat(troco),
      observacoes: observacoes || null,
      status: 'CONCLUIDA',
      itens: {
        create: itens.map((i: { productId?: string; codigo?: string; nome: string; quantidade: number; precoUnit: number; desconto?: number }) => ({
          productId: i.productId || null,
          codigo: i.codigo || null,
          nome: i.nome,
          quantidade: parseFloat(String(i.quantidade)),
          precoUnit: parseFloat(String(i.precoUnit)),
          desconto: parseFloat(String(i.desconto || 0)),
          total: (i.quantidade * i.precoUnit) - (i.desconto || 0)
        }))
      }
    },
    include: { itens: true }
  })

  // Atualiza totais na sessão
  const fp = formaPagamento
  await prisma.pdvSessao.update({
    where: { id: sessaoId },
    data: {
      totalVendas: { increment: total },
      qtdVendas: { increment: 1 },
      totalDinheiro: fp === 'DINHEIRO' ? { increment: total } : undefined,
      totalCartao: (fp === 'CARTAO_CREDITO' || fp === 'CARTAO_DEBITO') ? { increment: total } : undefined,
      totalPix: fp === 'PIX' ? { increment: total } : undefined,
      totalOutros: (fp !== 'DINHEIRO' && fp !== 'CARTAO_CREDITO' && fp !== 'CARTAO_DEBITO' && fp !== 'PIX') ? { increment: total } : undefined,
    }
  })

  return NextResponse.json(venda, { status: 201 })
}
