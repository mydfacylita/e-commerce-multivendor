import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/admin/payment/mercadopago/test
 * Testa conexão com Mercado Pago
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar configuração
    const config = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO' }
    })

    if (!config || !config.config) {
      return NextResponse.json(
        { error: 'Configuração não encontrada' },
        { status: 404 }
      )
    }

    const { accessToken, environment } = config.config as any

    console.log('🧪 [TEST] Testando Mercado Pago:', {
      environment,
      accessToken: accessToken?.substring(0, 10) + '...',
      hasToken: !!accessToken
    })

    // Testar API do Mercado Pago
    const apiUrl = environment === 'production'
      ? 'https://api.mercadopago.com'
      : 'https://api.mercadopago.com'

    const response = await fetch(`${apiUrl}/v1/payment_methods`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    console.log('🔍 [TEST] Resposta Mercado Pago:', {
      status: response.status,
      ok: response.ok
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        success: true,
        message: 'Conexão testada com sucesso!',
        paymentMethods: data.length,
        environment
      })
    } else {
      const errorData = await response.json().catch(() => null)
      console.error('❌ [TEST] Erro da API:', {
        status: response.status,
        error: errorData
      })
      return NextResponse.json(
        { 
          error: 'Erro ao conectar com Mercado Pago', 
          status: response.status,
          details: errorData 
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Erro ao testar conexão:', error)
    return NextResponse.json(
      { error: 'Erro ao testar conexão' },
      { status: 500 }
    )
  }
}
