import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/user/addresses/[id]/default
 * Define um endereço como padrão
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const addressId = params.id

    // Verificar se o endereço pertence ao usuário
    const address = await prisma.address.findFirst({
      where: { 
        id: addressId,
        userId: session.user.id 
      }
    })

    if (!address) {
      return NextResponse.json({ error: 'Endereço não encontrado' }, { status: 404 })
    }

    // Remover padrão de todos os endereços do usuário
    await prisma.address.updateMany({
      where: { 
        userId: session.user.id,
        isDefault: true 
      },
      data: { isDefault: false }
    })

    // Definir este endereço como padrão
    await prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Endereço definido como padrão' 
    })
  } catch (error) {
    console.error('Erro ao definir endereço padrão:', error)
    return NextResponse.json({ error: 'Erro ao definir endereço padrão' }, { status: 500 })
  }
}
