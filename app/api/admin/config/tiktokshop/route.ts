import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { invalidateTikTokConfigCache } from '@/lib/tiktokshop'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/admin/config/tiktokshop
 * Busca configurações do TikTok Shop
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar configurações
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { startsWith: 'tiktokshop.' }
      }
    })

    const configMap: Record<string, string> = {}
    configs.forEach((c: { key: string; value: string }) => {
      configMap[c.key.replace('tiktokshop.', '')] = c.value
    })

    return NextResponse.json({
      config: {
        api_base: configMap['api_base'] || 'https://open-api.tiktokglobalshop.com',
        auth_url: configMap['auth_url'] || 'https://services.tiktokshop.com/open/authorize',
      }
    })
  } catch (error) {
    console.error('Erro ao buscar config TikTok Shop:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * POST /api/admin/config/tiktokshop
 * Salva configurações do TikTok Shop
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { config } = await request.json()

    if (!config) {
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 400 })
    }

    // Salvar cada configuração
    const keysToSave = [
      { key: 'tiktokshop.api_base', value: config.api_base || 'https://open-api.tiktokglobalshop.com', label: 'TikTok Shop API Base URL' },
      { key: 'tiktokshop.auth_url', value: config.auth_url || 'https://services.tiktokshop.com/open/authorize', label: 'TikTok Shop Auth URL' },
    ]

    for (const item of keysToSave) {
      await prisma.systemConfig.upsert({
        where: { key: item.key },
        create: { 
          key: item.key, 
          value: item.value,
          category: 'tiktokshop',
          label: item.label,
          type: 'text'
        },
        update: { value: item.value }
      })
    }

    // Invalidar cache
    invalidateTikTokConfigCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar config TikTok Shop:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
