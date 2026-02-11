import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Listar produtos pendentes de aprovação
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'PENDING'

    const products = await prisma.product.findMany({
      where: {
        approvalStatus: status,
        // Apenas produtos de vendedores (não do admin)
        sellerId: { not: null },
        // Apenas produtos próprios (não dropshipping)
        isDropshipping: false,
      },
      include: {
        category: {
          select: { name: true }
        },
        seller: {
          select: { 
            id: true,
            storeName: true,
            nomeFantasia: true 
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      products,
      total: products.length
    })
  } catch (error: any) {
    console.error('Erro ao buscar produtos para aprovação:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Aprovar ou rejeitar produto
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { productId, action, note } = await req.json()

    if (!productId || !action) {
      return NextResponse.json(
        { error: 'productId e action são obrigatórios' },
        { status: 400 }
      )
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json(
        { error: 'action deve ser APPROVED ou REJECTED' },
        { status: 400 }
      )
    }

    // Buscar produto
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: {
          select: { storeName: true, userId: true }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Atualizar status de aprovação
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        approvalStatus: action,
        approvalNote: note || null,
        approvedAt: new Date(),
        approvedBy: session.user.id,
        // Se aprovado, ativar o produto; se rejeitado, desativar
        active: action === 'APPROVED' ? true : false,
      }
    })

    // TODO: Enviar notificação para o vendedor (email, push, etc)
    console.log(`📋 Produto "${product.name}" ${action === 'APPROVED' ? 'APROVADO' : 'REJEITADO'} por ${session.user.email}`)
    if (note) {
      console.log(`   Nota: ${note}`)
    }

    return NextResponse.json({
      success: true,
      message: action === 'APPROVED' 
        ? 'Produto aprovado com sucesso! Agora está visível na loja.'
        : 'Produto rejeitado. O vendedor será notificado.',
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        approvalStatus: updatedProduct.approvalStatus,
        active: updatedProduct.active
      }
    })
  } catch (error: any) {
    console.error('Erro ao processar aprovação:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
