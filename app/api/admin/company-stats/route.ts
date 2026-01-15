import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const [
      totalProdutos,
      produtosDropshipping,
      totalVendedores,
      pedidosDropshipping
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isDropshipping: true } }),
      prisma.seller.count({ where: { status: "ACTIVE" } }),
      prisma.order.count({ where: { soldBySellerId: { not: null } } })
    ])

    return NextResponse.json({
      totalProdutos,
      produtosDropshipping,
      totalVendedores,
      pedidosDropshipping
    })
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error)
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas" },
      { status: 500 }
    )
  }
}
