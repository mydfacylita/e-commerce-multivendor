import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { getUserPermissions } from "@/lib/seller"

export async function GET() {
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
      where: { userId: session.user.id },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeRole: true,
            createdAt: true
          }
        }
      }
    })

    if (!seller) {
      return NextResponse.json({ error: "Vendedor não encontrado" }, { status: 404 })
    }

    return NextResponse.json(seller.employees)
  } catch (error) {
    console.error("Erro ao buscar funcionários:", error)
    return NextResponse.json(
      { error: "Erro ao buscar funcionários" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
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

    const { name, email, password, employeeRole } = await request.json()

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 400 }
      )
    }

    // Validar employeeRole
    const validRoles = ['MANAGER', 'OPERATOR', 'VIEWER']
    if (!validRoles.includes(employeeRole)) {
      return NextResponse.json(
        { error: "Nível de acesso inválido" },
        { status: 400 }
      )
    }

    // Criar funcionário
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const employee = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "SELLER", // Funcionário também é SELLER
        workForSellerId: seller.id, // Vincula ao vendedor
        employeeRole: employeeRole as any // Nível de acesso
      }
    })

    return NextResponse.json({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      employeeRole: employee.employeeRole,
      createdAt: employee.createdAt
    })
  } catch (error) {
    console.error("Erro ao criar funcionário:", error)
    return NextResponse.json(
      { error: "Erro ao criar funcionário" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
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

    // Buscar vendedor    // Buscar vendedor
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })

    if (!seller) {
      return NextResponse.json({ error: "Vendedor não encontrado" }, { status: 404 })
    }

    const { employeeId } = await request.json()

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

    // Remover vínculo (não deleta o user, só remove o vínculo)
    await prisma.user.update({
      where: { id: employeeId },
      data: {
        workForSellerId: null,
        role: "USER" // Volta a ser usuário comum
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao remover funcionário:", error)
    return NextResponse.json(
      { error: "Erro ao remover funcionário" },
      { status: 500 }
    )
  }
}
