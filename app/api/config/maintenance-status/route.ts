import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/config/maintenance-status
 * Retorna apenas se está em manutenção (rota ultra-rápida para o middleware)
 */
export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'maintenance.enabled' },
      select: { value: true }
    })

    return NextResponse.json({
      enabled: config?.value === 'true'
    })
  } catch (error) {
    console.error('[maintenance-status] Erro:', error)
    return NextResponse.json({ enabled: false })
  }
}

// Configuração para evitar cache
export const dynamic = 'force-dynamic'
export const revalidate = 0
