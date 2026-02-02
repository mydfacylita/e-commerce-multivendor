import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth-helper'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    // 🔐 Autenticar (API Key para apps / Session para web)
    const auth = await authenticateRequest(request, {
      requireApiKey: false, // API Key opcional - aceita session web
      requireAuth: true
    });

    if (!auth.authenticated || !auth.userId) {
      return auth.response;
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        image: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar perfil' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 🔐 Autenticar (API Key para apps / Session para web)
    const auth = await authenticateRequest(request, {
      requireApiKey: false, // API Key opcional - aceita session web
      requireAuth: true
    });

    if (!auth.authenticated || !auth.userId) {
      return auth.response;
    }

    const { name, phone, image, cpf } = await request.json()

    console.log('Atualizando perfil:', { name, phone, cpf })

    // Montar objeto de atualização apenas com campos enviados
    const updateData: { name?: string; phone?: string; image?: string; cpf?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (image !== undefined) updateData.image = image;
    if (cpf !== undefined) updateData.cpf = cpf;

    console.log('Update data:', updateData)

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        image: true,
        role: true,
      },
    })

    console.log('Perfil atualizado:', user)

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar perfil' },
      { status: 500 }
    )
  }
}
