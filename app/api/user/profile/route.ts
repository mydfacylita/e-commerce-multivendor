import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth-helper'

export async function GET(request: NextRequest) {
  try {
    // 🔐 Autenticar (API Key + JWT/Session)
    const auth = await authenticateRequest(request, {
      requireApiKey: true,
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
    // 🔐 Autenticar (API Key + JWT/Session)
    const auth = await authenticateRequest(request, {
      requireApiKey: true,
      requireAuth: true
    });

    if (!auth.authenticated || !auth.userId) {
      return auth.response;
    }

    const { name } = await request.json()

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: { name },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar perfil' },
      { status: 500 }
    )
  }
}
