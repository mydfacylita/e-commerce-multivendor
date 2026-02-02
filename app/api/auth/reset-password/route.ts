import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { checkRateLimit, getClientIP } from '@/lib/api-security'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validação
const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres').max(100)
})

// Rate limit específico (5 tentativas por minuto)
const AUTH_RATE_LIMIT = 5

export async function POST(request: NextRequest) {
  try {
    // 1️⃣ RATE LIMITING
    const clientIP = getClientIP(request)
    const rateLimitKey = `reset-password:${clientIP}`
    const rateLimit = checkRateLimit(rateLimitKey)
    
    if (!rateLimit.allowed || rateLimit.remaining < (60 - AUTH_RATE_LIMIT)) {
      console.warn(`[SECURITY] Rate limit excedido para reset-password: ${clientIP}`)
      return NextResponse.json(
        { message: 'Muitas tentativas. Aguarde alguns minutos.' },
        { status: 429 }
      )
    }

    // 2️⃣ VALIDAÇÃO DE INPUT
    const body = await request.json()
    const validation = resetPasswordSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0]?.message || 'Dados inválidos' },
        { status: 400 }
      )
    }
    
    const { token, password } = validation.data

    // Buscar token no banco
    const verificationToken = await prisma.verificationToken.findFirst({
      where: { token }
    })

    if (!verificationToken) {
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 400 })
    }

    // Verificar se expirou
    if (new Date() > verificationToken.expires) {
      // Deletar token expirado
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token
          }
        }
      })
      return NextResponse.json({ message: 'Token expirado. Solicite um novo link.' }, { status: 400 })
    }

    // Buscar usuário pelo email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier }
    })

    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
    }

    // Atualizar senha
    const hashedPassword = await bcrypt.hash(password, 10)
    
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })

    // Deletar token usado
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token
        }
      }
    })

    console.log('Senha alterada com sucesso para:', user.email)

    return NextResponse.json({ 
      success: true,
      message: 'Senha alterada com sucesso!' 
    })

  } catch (error) {
    console.error('Erro ao redefinir senha:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
