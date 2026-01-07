// Função utilitária para obter o ID do vendedor
// Funciona tanto para donos quanto para funcionários

import { Session } from "next-auth"
import { prisma } from "./prisma"

export async function getSellerIdFromSession(session: Session | null): Promise<string | null> {
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { seller: true }
  })

  if (!user) return null

  // Se é dono de um seller, retorna o ID do seller dele
  if (user.seller) {
    return user.seller.id
  }

  // Se é funcionário, retorna o ID do seller que trabalha
  if (user.workForSellerId) {
    return user.workForSellerId
  }

  return null
}

export async function getSellerFromSession(session: Session | null) {
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { 
      seller: true,
      workForSeller: true 
    }
  })

  if (!user) return null

  // Retorna o seller (próprio ou do patrão)
  return user.seller || user.workForSeller
}

export async function getUserPermissions(session: Session | null) {
  if (!session?.user?.id) {
    console.log('❌ [getUserPermissions] Sem sessão ou user ID')
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { seller: true }
  })

  if (!user) {
    console.log('❌ [getUserPermissions] Usuário não encontrado:', session.user.id)
    return null
  }

  console.log('👤 [getUserPermissions] Usuário encontrado:', {
    id: user.id,
    email: user.email,
    role: user.role,
    hasSeller: !!user.seller,
    workForSellerId: user.workForSellerId,
    employeeRole: user.employeeRole
  })

  // Se é dono, tem todas as permissões
  if (user.seller) {
    console.log('👑 [getUserPermissions] É proprietário - permissões completas')
    return {
      isOwner: true,
      canManageProducts: true,
      canManageOrders: true,
      canViewFinancial: true,
      canManageEmployees: true,
      canManageIntegrations: true,
      canManageDropshipping: true
    }
  }

  // Se é funcionário, permissões baseadas no employeeRole
  if (user.workForSellerId) {
    const role = user.employeeRole

    console.log('👔 [getUserPermissions] É funcionário - role:', role)

    if (role === 'MANAGER') {
      return {
        isOwner: false,
        canManageProducts: true,
        canManageOrders: true,
        canViewFinancial: true,
        canManageEmployees: false,      // Gerente NÃO gerencia funcionários
        canManageIntegrations: false,   // Gerente NÃO gerencia integrações
        canManageDropshipping: true
      }
    }

    if (role === 'OPERATOR') {
      return {
        isOwner: false,
        canManageProducts: true,
        canManageOrders: true,
        canViewFinancial: false,        // Operador NÃO vê financeiro
        canManageEmployees: false,
        canManageIntegrations: false,
        canManageDropshipping: false    // Operador NÃO gerencia dropshipping
      }
    }

    if (role === 'VIEWER') {
      return {
        isOwner: false,
        canManageProducts: false,       // Visualizador só VÊ, não edita
        canManageOrders: false,         // Visualizador só VÊ, não edita
        canViewFinancial: true,         // Visualizador pode ver relatórios
        canManageEmployees: false,
        canManageIntegrations: false,
        canManageDropshipping: false
      }
    }
  }

  console.log('⚠️ [getUserPermissions] Nenhuma permissão encontrada')
  return null
}
