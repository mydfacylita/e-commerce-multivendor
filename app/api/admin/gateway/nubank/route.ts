import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obter configuração do Nubank
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const gateway = await prisma.paymentGateway.findUnique({
      where: { gateway: 'NUBANK' }
    })

    if (!gateway) {
      return NextResponse.json({
        config: {
          clientId: '',
          clientSecret: '',
          environment: 'production'
        },
        isActive: false
      })
    }

    return NextResponse.json({
      config: gateway.config,
      isActive: gateway.isActive
    })

  } catch (error) {
    console.error('Erro ao buscar configuração:', error)
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 })
  }
}

// POST - Salvar configuração do Nubank
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { config, isActive } = await req.json()

    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json({ error: 'Client ID e Client Secret são obrigatórios' }, { status: 400 })
    }

    await prisma.paymentGateway.upsert({
      where: { gateway: 'NUBANK' },
      create: {
        gateway: 'NUBANK',
        config,
        isActive
      },
      update: {
        config,
        isActive
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao salvar configuração:', error)
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
  }
}
