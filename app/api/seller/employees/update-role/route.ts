import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getUserPermissions } from "@/lib/seller"

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SELLER") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar permissões
    const permissions = await getUserPermissions(session)
    if (!permissions || !permissions.canManageEmployees) {
      return NextResponse.json(
        { error: "Você não tem permissão para gerenciar funcionários" },
        { status: 403 }
      )
    }

    // Buscar vendedor
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json({ error: "Vendedor não encontrado" }, { status: 404 })
    }

    const { employeeId, employeeRole } = await request.json()

    // Validar employeeRole
    const validRoles = ['MANAGER', 'OPERATOR', 'VIEWER']
    if (!validRoles.includes(employeeRole)) {
      return NextResponse.json(
        { error: "Nível de acesso inválido" },
        { status: 400 }
      )
    }

    // Verificar se o funcionário pertence a este vendedor
    const employee = await prisma.user.findFirst({
      where: {
        id: employeeId,
        workForSellerId: seller.id
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: "Funcionário não encontrado" },
        { status: 404 }
      )
    }

    // Atualizar o nível de acesso
    await prisma.user.update({
      where: { id: employeeId },
      data: { employeeRole }
    })

    console.log(`✅ [Update Role] Nível de acesso atualizado:`, {
      employeeId,
      employeeName: employee.name,
      newRole: employeeRole,
      sellerId: seller.id
    })

    return NextResponse.json({ 
      success: true,
      message: "Nível de acesso atualizado com sucesso" 
    })
  } catch (error) {
    console.error("❌ [Update Role] Erro ao atualizar nível de acesso:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar nível de acesso" },
      { status: 500 }
    )
  }
}
