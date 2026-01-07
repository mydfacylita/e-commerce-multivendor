import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserPermissions } from '@/lib/seller'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    console.log('🔐 [API Permissions] Verificando sessão:', {
      userId: session?.user?.id,
      userRole: session?.user?.role,
      userEmail: session?.user?.email
    })

    if (!session || session.user.role !== 'SELLER') {
      console.log('❌ [API Permissions] Acesso negado - não é vendedor')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const permissions = await getUserPermissions(session)

    console.log('✅ [API Permissions] Permissões carregadas:', permissions)

    if (!permissions) {
      // Se não tem permissões definidas, é porque é proprietário sem seller ainda
      // Retorna permissões completas de owner por padrão
      console.log('⚠️ [API Permissions] Sem permissões específicas - usando padrão de owner')
      return NextResponse.json({
        isOwner: true,
        canManageProducts: true,
        canManageOrders: true,
        canViewFinancial: true,
        canManageEmployees: true,
        canManageIntegrations: true,
        canManageDropshipping: true
      })
    }

    return NextResponse.json(permissions)
  } catch (error) {
    console.error('❌ [API Permissions] Erro ao buscar permissões:', error)
    return NextResponse.json({ error: 'Erro ao buscar permissões' }, { status: 500 })
  }
}
