import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSellerFromSession } from "@/lib/seller"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SELLER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar seller (próprio ou do patrão)
    const seller = await getSellerFromSession(session)
    if (!seller) {
      return NextResponse.json({ error: "Vendedor não encontrado" }, { status: 404 })
    }

    // Buscar produtos que este vendedor já adicionou (isDropshipping: false e tem supplierId)
    const myProducts = await prisma.product.findMany({
      where: {
        sellerId: seller.id,
        supplierSku: { not: null }, // supplierSku contém o ID do produto original
        isDropshipping: false
      },
      select: {
        id: true,
        supplierSku: true, // ID do produto original do catálogo
        name: true,
        price: true
      }
    })

    return NextResponse.json(myProducts)
  } catch (error) {
    console.error("Erro ao buscar meus produtos:", error)
    return NextResponse.json(
      { error: "Erro ao buscar produtos" },
      { status: 500 }
    )
  }
}
