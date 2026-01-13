import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth-helper'

/**
 * GET /api/user/addresses
 * 🔐 Requer API Key + Token do usuário
 * Retorna todos os endereços do usuário logado
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, {
      requireApiKey: true,
      requireAuth: true
    });
    
    if (!auth.authenticated || !auth.userId) {
      return auth.response;
    }

    const addresses = await prisma.address.findMany({
      where: { userId: auth.userId },
      orderBy: [
        { isDefault: 'desc' }, // Padrão primeiro
        { createdAt: 'desc' }  // Mais recente depois
      ]
    })

    return NextResponse.json(addresses)
  } catch (error) {
    console.error('Erro ao buscar endereços:', error)
    return NextResponse.json({ error: 'Erro ao buscar endereços' }, { status: 500 })
  }
}

/**
 * POST /api/user/addresses
 * 🔐 Requer API Key + Token do usuário
 * Cria um novo endereço para o usuário
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, {
      requireApiKey: true,
      requireAuth: true
    });
    
    if (!auth.authenticated || !auth.userId) {
      return auth.response;
    }

    const data = await request.json()
    
    const {
      label,
      recipientName,
      street,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
      phone,
      cpf,
      isDefault
    } = data

    // Validações básicas
    if (!street || !city || !state || !zipCode) {
      return NextResponse.json({ 
        error: 'Preencha os campos obrigatórios: endereço, cidade, estado e CEP' 
      }, { status: 400 })
    }

    // Se este endereço for o padrão, remover padrão dos outros
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: auth.userId, isDefault: true },
        data: { isDefault: false }
      })
    }

    // Se for o primeiro endereço, torná-lo padrão automaticamente
    const existingCount = await prisma.address.count({
      where: { userId: auth.userId }
    })
    const shouldBeDefault = isDefault || existingCount === 0

    const address = await prisma.address.create({
      data: {
        userId: auth.userId,
        label: label || null,
        recipientName: recipientName || auth.user?.name || null,
        street,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city,
        state,
        zipCode: zipCode.replace(/\D/g, ''), // Só números
        phone: phone?.replace(/\D/g, '') || null,
        cpf: cpf?.replace(/\D/g, '') || null,
        isDefault: shouldBeDefault
      }
    })

    console.log(`✅ Novo endereço criado para usuário ${auth.userId}:`, address.id)

    return NextResponse.json(address, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar endereço:', error)
    return NextResponse.json({ error: 'Erro ao criar endereço' }, { status: 500 })
  }
}
