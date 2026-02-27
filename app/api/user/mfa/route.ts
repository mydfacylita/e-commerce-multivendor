/**
 * 🔑 MFA — Setup e Gerenciamento de Autenticação Multi-fator
 * ISO 27001 A.9.4 — Autenticação forte para usuários privilegiados
 *
 * GET    /api/user/mfa  — Retorna status MFA do usuário
 * POST   /api/user/mfa  — Inicia setup (gera secret + QR code)
 * PUT    /api/user/mfa  — Confirma ativação (valida código TOTP)
 * DELETE /api/user/mfa  — Desativa MFA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditLog } from '@/lib/audit'
import {
  generateTotpSecret,
  verifyTotp,
  generateOtpauthUrl,
  generateQrCodeUrl,
  generateBackupCodes,
  hashBackupCode,
} from '@/lib/mfa'

// ─── GET: Status do MFA ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true, mfaEnabledAt: true },
  })

  return NextResponse.json({
    mfaEnabled: user?.mfaEnabled ?? false,
    mfaEnabledAt: user?.mfaEnabledAt ?? null,
  })
}

// ─── POST: Iniciar setup — gera novo secret ───────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true },
  })

  if (user?.mfaEnabled) {
    return NextResponse.json(
      { error: 'MFA já está ativo. Desative primeiro para reconfigurar.' },
      { status: 400 }
    )
  }

  // Gerar novo secret (não salva ainda — só salva após confirmação)
  const secret = generateTotpSecret()
  const otpauthUrl = generateOtpauthUrl({
    secret,
    email: session.user.email,
    issuer: 'MydShop',
  })
  const qrCodeUrl = generateQrCodeUrl(otpauthUrl)

  // Salvar secret temporariamente (pendente de confirmação)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { mfaSecret: `pending:${secret}` },
  })

  return NextResponse.json({
    secret,
    otpauthUrl,
    qrCodeUrl,
    instructions: 'Escaneie o QR code no Google Authenticator e confirme com PUT /api/user/mfa enviando { token: "123456" }',
  })
}

// ─── PUT: Confirmar ativação — validar código TOTP ───────────────────────────
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { token } = await req.json()
  if (!token) {
    return NextResponse.json({ error: 'token é obrigatório' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaSecret: true, mfaEnabled: true },
  })

  if (!user?.mfaSecret?.startsWith('pending:')) {
    return NextResponse.json(
      { error: 'Nenhum setup em andamento. Inicie com POST /api/user/mfa' },
      { status: 400 }
    )
  }

  const secret = user.mfaSecret.replace('pending:', '')

  if (!verifyTotp(secret, token)) {
    await auditLog({
      userId: session.user.id,
      action: 'MFA_FAILED',
      status: 'FAILURE',
      details: { reason: 'invalid_token_during_setup' },
      ipAddress: ip,
    })
    return NextResponse.json({ error: 'Código inválido. Tente novamente.' }, { status: 400 })
  }

  // Gerar backup codes
  const backupCodes = generateBackupCodes(8)
  const hashedCodes = backupCodes.map(hashBackupCode)

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      mfaEnabled: true,
      mfaSecret: secret, // Remove prefixo "pending:"
      mfaBackupCodes: JSON.stringify(hashedCodes),
      mfaEnabledAt: new Date(),
    },
  })

  await auditLog({
    userId: session.user.id,
    action: 'MFA_ENABLED',
    status: 'SUCCESS',
    ipAddress: ip,
    userAgent: req.headers.get('user-agent') || 'unknown',
  })

  return NextResponse.json({
    message: 'MFA ativado com sucesso!',
    backupCodes,
    warning: '⚠️ Guarde esses códigos de backup em local seguro. Eles são exibidos UMA ÚNICA VEZ.',
  })
}

// ─── DELETE: Desativar MFA ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { token, backupCode } = await req.json().catch(() => ({}))
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaSecret: true, mfaEnabled: true, mfaBackupCodes: true },
  })

  if (!user?.mfaEnabled) {
    return NextResponse.json({ error: 'MFA não está ativo.' }, { status: 400 })
  }

  let verified = false

  if (token && user.mfaSecret) {
    verified = verifyTotp(user.mfaSecret, token)
  } else if (backupCode && user.mfaBackupCodes) {
    const codes: string[] = JSON.parse(user.mfaBackupCodes)
    const hashedInput = hashBackupCode(backupCode)
    if (codes.includes(hashedInput)) {
      verified = true
      // Consumir o backup code
      const remaining = codes.filter(c => c !== hashedInput)
      await prisma.user.update({
        where: { id: session.user.id },
        data: { mfaBackupCodes: JSON.stringify(remaining) },
      })
    }
  }

  if (!verified) {
    await auditLog({
      userId: session.user.id,
      action: 'MFA_FAILED',
      status: 'FAILURE',
      details: { reason: 'invalid_token_during_disable' },
      ipAddress: ip,
    })
    return NextResponse.json(
      { error: 'Código inválido. Forneça { token } TOTP ou { backupCode }.' },
      { status: 401 }
    )
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
      mfaEnabledAt: null,
    },
  })

  await auditLog({
    userId: session.user.id,
    action: 'MFA_DISABLED',
    status: 'SUCCESS',
    ipAddress: ip,
    userAgent: req.headers.get('user-agent') || 'unknown',
  })

  return NextResponse.json({ message: 'MFA desativado com sucesso.' })
}
