import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { 
        active: true, 
        isDropshipping: true, 
        supplierSku: true, 
        price: true,
        sellerId: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { message: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Se vendedor, verificar se é dono do produto
    if (session.user.role === 'SELLER') {
      const seller = await prisma.seller.findUnique({
        where: { userId: session.user.id }
      })
      
      if (!seller || product.sellerId !== seller.id) {
        return NextResponse.json(
          { message: 'Você não tem permissão para alterar este produto' },
          { status: 403 }
        )
      }
    }

    const wantsToActivate = !product.active

    // SE ESTÁ TENTANDO ATIVAR E É DROPSHIPPING, VALIDAR PREÇO MÍNIMO
    if (wantsToActivate && product.isDropshipping && product.supplierSku) {
      console.log('[Toggle Active] 🔍 Verificando preço mínimo para dropshipping...')
      
      const sourceProduct = await prisma.product.findUnique({
        where: { id: product.supplierSku },
        select: { price: true, active: true, isDropshipping: true }
      })

      // Produto original não existe mais
      if (!sourceProduct) {
        console.log('[Toggle Active] ❌ Produto original não encontrado')
        return NextResponse.json({
          message: 'Não é possível ativar este produto. O produto original não existe mais no catálogo.'
        }, { status: 400 })
      }

      // Produto original inativo ou não é mais dropshipping
      if (!sourceProduct.active || !sourceProduct.isDropshipping) {
        console.log('[Toggle Active] ❌ Produto original está inativo')
        return NextResponse.json({
          message: 'Não é possível ativar este produto. O produto original foi desativado pelo administrador.'
        }, { status: 400 })
      }

      // Preço abaixo do mínimo
      if (product.price < sourceProduct.price) {
        console.log(`[Toggle Active] ❌ Preço R$ ${product.price.toFixed(2)} < Mínimo R$ ${sourceProduct.price.toFixed(2)}`)
        return NextResponse.json({
          message: `Não é possível ativar este produto. O preço atual (R$ ${product.price.toFixed(2)}) está abaixo do mínimo permitido (R$ ${sourceProduct.price.toFixed(2)}). Edite o produto e aumente o preço primeiro.`,
          minPrice: sourceProduct.price,
          currentPrice: product.price
        }, { status: 400 })
      }

      console.log('[Toggle Active] ✅ Preço válido, ativando produto')
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: { active: wantsToActivate },
      select: { id: true, active: true }
    })

    return NextResponse.json({
      message: updated.active ? 'Produto ativado com sucesso' : 'Produto desativado com sucesso',
      active: updated.active
    })
  } catch (error) {
    console.error('[Toggle Active] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar status do produto' },
      { status: 500 }
    )
  }
}
