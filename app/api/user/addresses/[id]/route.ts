import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/user/addresses/[id]
 * Retorna um endereço específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const address = await prisma.address.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id 
      }
    })

    if (!address) {
      return NextResponse.json({ error: 'Endereço não encontrado' }, { status: 404 })
    }

    return NextResponse.json(address)
  } catch (error) {
    console.error('Erro ao buscar endereço:', error)
    return NextResponse.json({ error: 'Erro ao buscar endereço' }, { status: 500 })
  }
}

/**
 * PUT /api/user/addresses/[id]
 * Atualiza um endereço
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

    // Verificar se o endereço pertence ao usuário
    const existing = await prisma.address.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id 
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Endereço não encontrado' }, { status: 404 })
    }

    const data = await request.json()

    // Se este endereço for o padrão, remover padrão dos outros
    if (data.isDefault && !existing.isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false }
      })
    }

    const address = await prisma.address.update({
      where: { id: params.id },
      data: {
        label: data.label,
        recipientName: data.recipientName,
        street: data.street,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode?.replace(/\D/g, ''),
        phone: data.phone?.replace(/\D/g, ''),
        cpf: data.cpf?.replace(/\D/g, ''),
        isDefault: data.isDefault ?? existing.isDefault
      }
    })

    return NextResponse.json(address)
  } catch (error) {
    console.error('Erro ao atualizar endereço:', error)
    return NextResponse.json({ error: 'Erro ao atualizar endereço' }, { status: 500 })
  }
}

/**
 * DELETE /api/user/addresses/[id]
 * Remove um endereço
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se o endereço pertence ao usuário
    const existing = await prisma.address.findFirst({
      where: { 
        id: params.id,
        userId: session.user.id 
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Endereço não encontrado' }, { status: 404 })
    }

    await prisma.address.delete({
      where: { id: params.id }
    })

    // Se era o padrão, tornar o mais recente como padrão
    if (existing.isDefault) {
      const newest = await prisma.address.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
      })
      
      if (newest) {
        await prisma.address.update({
          where: { id: newest.id },
          data: { isDefault: true }
        })
      }
    }

    return NextResponse.json({ success: true, message: 'Endereço removido' })
  } catch (error) {
    console.error('Erro ao remover endereço:', error)
    return NextResponse.json({ error: 'Erro ao remover endereço' }, { status: 500 })
  }
}
