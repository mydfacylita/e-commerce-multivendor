import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Recuperar credenciais
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar credenciais do banco
    const credentials = await (prisma as any).mercadoLivreCredentials.findFirst({
      select: {
        clientId: true,
        // Não retornamos o clientSecret por segurança, apenas indicamos que existe
      }
    })

    return NextResponse.json({
      clientId: credentials?.clientId || '',
      clientSecret: credentials ? 'saved' : ''
    })

  } catch (error) {
    console.error('Erro ao buscar credenciais:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar credenciais' },
      { status: 500 }
    )
  }
}

// POST - Salvar credenciais
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, clientSecret } = body

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Client ID e Client Secret são obrigatórios' },
        { status: 400 }
      )
    }

    // Salvar ou atualizar credenciais
    const credentials = await (prisma as any).mercadoLivreCredentials.upsert({
      where: {
        id: 'default' // Usamos um ID fixo pois é apenas uma configuração global
      },
      create: {
        id: 'default',
        clientId,
        clientSecret,
      },
      update: {
        clientId,
        clientSecret,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Credenciais salvas com sucesso'
    })

  } catch (error) {
    console.error('Erro ao salvar credenciais:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar credenciais' },
      { status: 500 }
    )
  }
}
