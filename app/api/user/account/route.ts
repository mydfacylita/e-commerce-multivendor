/**
 * 🗑️ LGPD — Direito ao Esquecimento e Portabilidade de Dados
 * LGPD Art. 18, VI — Direito à exclusão dos dados pessoais
 * LGPD Art. 18, V  — Direito à portabilidade dos dados
 *
 * DELETE /api/user/account  — Anonimiza/exclui conta do usuário
 * GET    /api/user/account  — Exporta todos os dados do usuário (portabilidade)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditLog } from '@/lib/audit'
import { decryptField } from '@/lib/crypto-fields'

// ─── GET: Exportar dados do usuário (portabilidade LGPD) ─────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const userId = session.user.id
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      addresses: true,
      orders: {
        select: {
          id: true,
          status: true,
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
      productReviews: {
        select: { id: true, rating: true, comment: true, createdAt: true },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  await auditLog({
    userId,
    action: 'DATA_EXPORT_REQUESTED',
    status: 'SUCCESS',
    details: { fields: ['profile', 'addresses', 'orders', 'reviews'] },
    ipAddress: ip,
    userAgent: req.headers.get('user-agent') || 'unknown',
  })

  // Decriptografar campos sensíveis para a exportação (usuário tem direito ao dado original)
  const exportData = {
    exportedAt: new Date().toISOString(),
    exportedBy: 'MydShop — Sistema de Proteção de Dados (LGPD Art.18 V)',
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: decryptField(user.phone),
      cpf: decryptField(user.cpf),
      role: user.role,
      createdAt: user.createdAt,
    },
    addresses: user.addresses,
    orders: user.orders,
    reviews: user.productReviews,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="meus-dados-mydshop-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}

// ─── DELETE: Anonimizar/excluir conta (direito ao esquecimento) ───────────────
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const userId = session.user.id
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const body = await req.json().catch(() => ({}))
  const { confirmText } = body

  // Requer confirmação explícita para evitar deleção acidental
  if (confirmText !== 'EXCLUIR MINHA CONTA') {
    return NextResponse.json(
      { error: 'Para confirmar, envie { confirmText: "EXCLUIR MINHA CONTA" }' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orders: { where: { status: { in: ['PENDING', 'PROCESSING', 'SHIPPED'] } }, select: { id: true } },
      seller: { select: { id: true } },
    }
  })

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // Bloqueio: pedidos em aberto devem ser resolvidos antes
  if (user.orders.length > 0) {
    return NextResponse.json(
      {
        error: 'Você possui pedidos em andamento. Aguarde a conclusão antes de excluir sua conta.',
        pendingOrders: user.orders.length,
      },
      { status: 422 }
    )
  }

  // Bloqueio: vendedores devem encerrar a conta de vendedor primeiro
  if (user.seller) {
    return NextResponse.json(
      {
        error: 'Você possui uma conta de vendedor ativa. Encerre a loja antes de excluir sua conta.',
      },
      { status: 422 }
    )
  }

  // Anonimizar os dados (LGPD — "direito ao esquecimento"):
  // Não deletamos fisicamente pois pedidos/transações precisam dos registros por 5 anos (legislação fiscal)
  const anonymizedEmail = `deleted_${userId}@anonymized.mydshop`
  const now = new Date()

  await prisma.$transaction([
    // Anonimizar User
    prisma.user.update({
      where: { id: userId },
      data: {
        name: '[CONTA EXCLUÍDA]',
        email: anonymizedEmail,
        phone: null,
        cpf: null,
        image: null,
        password: null,
        isActive: false,
        blockedAt: now,
        blockedReason: 'Conta excluída pelo próprio usuário (LGPD Art.18 VI)',
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
      },
    }),
    // Remover endereços (dados pessoais puros)
    prisma.address.deleteMany({ where: { userId } }),
    // Remover itens do carrinho
    prisma.cartItem.deleteMany({ where: { userId } }),
  ])

  await auditLog({
    userId,
    action: 'ACCOUNT_DELETED',
    status: 'SUCCESS',
    details: { method: 'self_deletion', lgpd: 'Art.18 VI' },
    ipAddress: ip,
    userAgent: req.headers.get('user-agent') || 'unknown',
  })

  return NextResponse.json({
    message: 'Conta anonimizada com sucesso conforme LGPD Art. 18, VI.',
    deletedAt: now.toISOString(),
  })
}
