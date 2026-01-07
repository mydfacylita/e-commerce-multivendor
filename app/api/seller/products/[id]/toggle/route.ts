import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserPermissions, getSellerFromSession } from "@/lib/seller"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SELLER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar permissões
    const permissions = await getUserPermissions(session)
    if (!permissions || (!permissions.canManageProducts && !permissions.isOwner)) {
      return NextResponse.json(
        { error: "Você não tem permissão para gerenciar produtos" },
        { status: 403 }
      )
    }

    // Buscar seller
    const seller = await getSellerFromSession(session)
    if (!seller) {
      return NextResponse.json({ error: "Vendedor não encontrado" }, { status: 404 })
    }

    const { active } = await request.json()

    // Verificar se o produto pertence ao vendedor
    const product = await prisma.product.findFirst({
      where: {
        id: params.id,
        sellerId: seller.id
      }
    })

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
    }

    // Atualizar status
    await prisma.product.update({
      where: { id: params.id },
      data: { active }
    })

    console.log(`✅ [Toggle Product] Status alterado:`, {
      productId: params.id,
      active,
      sellerId: seller.id
    })

    return NextResponse.json({ success: true, active })
  } catch (error) {
    console.error("Erro ao alterar status do produto:", error)
    return NextResponse.json(
      { error: "Erro ao alterar status" },
      { status: 500 }
    )
  }
}
