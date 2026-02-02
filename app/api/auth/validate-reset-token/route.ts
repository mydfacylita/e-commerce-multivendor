import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIP } from '@/lib/api-security'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 1️⃣ RATE LIMITING (10 verificações por minuto)
    const clientIP = getClientIP(request)
    const rateLimitKey = `validate-token:${clientIP}`
    const rateLimit = checkRateLimit(rateLimitKey)
    
    if (!rateLimit.allowed || rateLimit.remaining < 50) {
      console.warn(`[SECURITY] Rate limit excedido para validate-token: ${clientIP}`)
      return NextResponse.json({ valid: false })
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    // 2️⃣ VALIDAÇÃO DE INPUT
    if (!token || token.length < 32 || token.length > 128) {
      return NextResponse.json({ valid: false })
    }

    // Buscar token no banco
    const verificationToken = await prisma.verificationToken.findFirst({
      where: { token }
    })

    if (!verificationToken) {
      return NextResponse.json({ valid: false })
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
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({ valid: true })

  } catch (error) {
    console.error('Erro ao validar token:', error)
    return NextResponse.json({ valid: false })
  }
}
