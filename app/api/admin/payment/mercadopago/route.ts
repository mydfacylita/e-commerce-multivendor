import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/payment/mercadopago
 * Busca configuração do Mercado Pago
 */
export async function GET(request: NextRequest) {
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

    console.log('📦 [GET] Configuração Mercado Pago:', {
      existe: !!config,
      id: config?.id,
      isActive: config?.isActive,
      config: config?.config
    })

    return NextResponse.json({ config })

  } catch (error) {
    console.error('Erro ao buscar configuração:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar configuração' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/payment/mercadopago
 * Salva configuração do Mercado Pago
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

    const body = await request.json()
    const { isActive, publicKey, accessToken, webhookUrl, environment } = body

    console.log('📥 [POST] Dados recebidos:', {
      isActive,
      publicKey: publicKey?.substring(0, 10) + '...',
      accessToken: accessToken?.substring(0, 10) + '...',
      webhookUrl,
      environment
    })

    if (!publicKey || !accessToken) {
      return NextResponse.json(
        { error: 'Public Key e Access Token são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar configuração existente
    const existing = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO' }
    })

    const configData = {
      publicKey,
      accessToken,
      webhookUrl: webhookUrl || null,
      environment
    }

    let config

    if (existing) {
      // Atualizar
      config = await prisma.paymentGateway.update({
        where: { id: existing.id },
        data: {
          isActive,
          config: JSON.stringify(configData)
        }
      })
    } else {
      // Criar
      config = await prisma.paymentGateway.create({
        data: {
          gateway: 'MERCADOPAGO',
          isActive,
          config: JSON.stringify(configData)
        }
      })
    }

    console.log('💳 Configuração Mercado Pago salva:', {
      id: config.id,
      isActive: config.isActive,
      environment,
      adminId: user.id,
      configData: config.config
    })

    return NextResponse.json({
      message: 'Configuração salva com sucesso',
      config: {
        id: config.id,
        isActive: config.isActive,
        gateway: config.gateway,
        config: config.config
      }
    })

  } catch (error) {
    console.error('Erro ao salvar configuração:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configuração' },
      { status: 500 }
    )
  }
}
