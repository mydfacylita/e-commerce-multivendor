import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'
}

// PATCH - Admin atualiza status ou filterConfig de qualquer app
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !isAdmin(session)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const body = await request.json()
    const { filterConfig, status } = body

    const updated = await prisma.developerApp.update({
      where: { id: params.id },
      data: {
        ...(filterConfig !== undefined && {
          filterConfig: typeof filterConfig === 'string' ? filterConfig : JSON.stringify(filterConfig)
        }),
        ...(status !== undefined && { status }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[admin/developer-apps PATCH]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
