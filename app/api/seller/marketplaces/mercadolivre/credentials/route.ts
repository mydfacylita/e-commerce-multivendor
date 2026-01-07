import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserPermissions } from '@/lib/seller'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'SELLER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar permissões
    const permissions = await getUserPermissions(session)
    if (!permissions || !permissions.canManageIntegrations) {
      return NextResponse.json(
        { error: 'Você não tem permissão para gerenciar integrações' },
        { status: 403 }
      )
    }

    // Buscar vendedor
    const seller = await prisma.seller.findFirst({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    // Buscar credenciais do Mercado Livre
    const credentials = await prisma.sellerMarketplaceCredential.findUnique({
      where: {
        sellerId_marketplace: {
          sellerId: seller.id,
          marketplace: 'mercadolivre'
        }
      }
    })

    if (!credentials || !credentials.mlClientId) {
      return NextResponse.json({ clientId: '', clientSecret: '' })
    }

    return NextResponse.json({
      clientId: credentials.mlClientId,
      clientSecret: credentials.mlClientSecret ? '••••••••' : ''
    })
  } catch (error) {
    console.error('Erro ao carregar credenciais:', error)
    return NextResponse.json({ error: 'Erro ao carregar credenciais' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'SELLER') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar permissões
    const permissions = await getUserPermissions(session)
    if (!permissions || !permissions.canManageIntegrations) {
      return NextResponse.json(
        { error: 'Você não tem permissão para gerenciar integrações' },
        { status: 403 }
      )
    }

    const { clientId, clientSecret } = await request.json()

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Client ID e Secret são obrigatórios' }, { status: 400 })
    }

    // Buscar vendedor
    const seller = await prisma.seller.findFirst({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    // Salvar ou atualizar credenciais
    const credentials = await prisma.sellerMarketplaceCredential.upsert({
      where: {
        sellerId_marketplace: {
          sellerId: seller.id,
          marketplace: 'mercadolivre'
        }
      },
      create: {
        sellerId: seller.id,
        marketplace: 'mercadolivre',
        mlClientId: clientId,
        mlClientSecret: clientSecret
      },
      update: {
        mlClientId: clientId,
        mlClientSecret: clientSecret
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar credenciais:', error)
    return NextResponse.json({ error: 'Erro ao salvar credenciais' }, { status: 500 })
  }
}
