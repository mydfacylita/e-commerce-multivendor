import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { webhookUrl } = await request.json()
    
    if (!webhookUrl) {
      return NextResponse.json({ error: 'webhookUrl obrigatório' }, { status: 400 })
    }

    // Buscar access token do MP
    const prisma = (await import('@/lib/prisma')).default
    const mpConfig = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    })

    if (!mpConfig) {
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 })
    }

    const config = mpConfig.config as any
    const accessToken = config.accessToken

    // Registrar webhook no Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: [
          { topic: 'payment' }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Erro ao registrar webhook:', data)
      return NextResponse.json({ 
        error: 'Erro ao registrar webhook',
        details: data 
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      webhook: data
    })

  } catch (error: any) {
    console.error('Erro:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Listar webhooks registrados
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const prisma = (await import('@/lib/prisma')).default
    const mpConfig = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    })

    if (!mpConfig) {
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 })
    }

    const config = mpConfig.config as any
    const accessToken = config.accessToken

    const response = await fetch('https://api.mercadopago.com/v1/webhooks', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    const data = await response.json()

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Erro:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
