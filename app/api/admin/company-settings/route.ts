import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar configurações (sempre retorna a primeira ou cria uma nova)
    let settings = await prisma.companySettings.findFirst()

    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {}
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Erro ao buscar configurações:", error)
    return NextResponse.json(
      { error: "Erro ao buscar configurações" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const data = await request.json()

    // Buscar configuração existente
    let settings = await prisma.companySettings.findFirst()

    if (settings) {
      // Atualizar existente
      settings = await prisma.companySettings.update({
        where: { id: settings.id },
        data: {
          name: data.name,
          cnpj: data.cnpj,
          email: data.email,
          phone: data.phone,
          address: data.address,
          defaultCommission: data.defaultCommission ? parseFloat(data.defaultCommission) : null,
          processingDays: data.processingDays ? parseInt(data.processingDays) : null,
          showRealTimeStock: data.showRealTimeStock,
          autoApproveSellers: data.autoApproveSellers,
          notifyNewDropshippingProducts: data.notifyNewDropshippingProducts
        }
      })
    } else {
      // Criar novo
      settings = await prisma.companySettings.create({
        data: {
          name: data.name,
          cnpj: data.cnpj,
          email: data.email,
          phone: data.phone,
          address: data.address,
          defaultCommission: data.defaultCommission ? parseFloat(data.defaultCommission) : null,
          processingDays: data.processingDays ? parseInt(data.processingDays) : null,
          showRealTimeStock: data.showRealTimeStock,
          autoApproveSellers: data.autoApproveSellers,
          notifyNewDropshippingProducts: data.notifyNewDropshippingProducts
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Erro ao salvar configurações:", error)
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    )
  }
}
