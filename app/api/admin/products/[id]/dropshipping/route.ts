import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { isDropshipping, dropshippingCommission } = await request.json()

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        isDropshipping,
        dropshippingCommission: dropshippingCommission ? parseFloat(dropshippingCommission) : null
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error("Erro ao atualizar produto:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar produto" },
      { status: 500 }
    )
  }
}
