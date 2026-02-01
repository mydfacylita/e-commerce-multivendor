import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { WhatsAppService } from '@/lib/whatsapp'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

/**
 * GET - Buscar configuração do WhatsApp
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const config = await WhatsAppService.getConfig()

    // Mascarar o token para segurança
    const maskedConfig = {
      ...config,
      accessToken: config.accessToken 
        ? config.accessToken.substring(0, 20) + '...' 
        : null
    }

    return NextResponse.json({ 
      success: true,
      config: maskedConfig 
    })
  } catch (error) {
    console.error('Erro ao buscar config WhatsApp:', error)
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 })
  }
}

/**
 * POST - Salvar configuração do WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { phoneNumberId, accessToken, businessId, verifyToken, isActive } = body

    // Se accessToken contém '...', significa que não foi alterado
    let finalAccessToken = accessToken
    if (accessToken && accessToken.includes('...')) {
      const currentConfig = await WhatsAppService.getConfig()
      finalAccessToken = currentConfig.accessToken
    }

    const success = await WhatsAppService.saveConfig({
      enabled: isActive,
      phoneNumberId,
      accessToken: finalAccessToken,
      businessId,
      verifyToken
    })

    if (success) {
      return NextResponse.json({ 
        success: true,
        message: 'Configuração salva com sucesso'
      })
    } else {
      return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
    }
  } catch (error) {
    console.error('Erro ao salvar config WhatsApp:', error)
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
  }
}

/**
 * PUT - Alias para POST (manter compatibilidade)
 */
export async function PUT(request: NextRequest) {
  return POST(request)
}
