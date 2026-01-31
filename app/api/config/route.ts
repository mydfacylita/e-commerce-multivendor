import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * API pública para buscar configurações do sistema
 * Usada pelo frontend para obter configurações de impostos, etc.
 * 
 * Parâmetros:
 * - prefix: Filtrar configurações por prefixo da key (ex: tax.)
 * - keys: Lista de keys específicas separadas por vírgula
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get('prefix')
    const keys = searchParams.get('keys')?.split(',').filter(Boolean)

    const where: any = {}
    
    if (prefix) {
      where.key = { startsWith: prefix }
    }
    
    if (keys && keys.length > 0) {
      where.key = { in: keys }
    }

    // Se não tiver filtro, não retornar nada (segurança)
    if (!prefix && (!keys || keys.length === 0)) {
      return NextResponse.json({ 
        error: 'Parâmetro prefix ou keys é obrigatório' 
      }, { status: 400 })
    }

    const configs = await prisma.systemConfig.findMany({
      where,
      select: {
        key: true,
        value: true,
      }
    })

    // Converter para objeto
    const configMap: Record<string, any> = {}
    configs.forEach(config => {
      try {
        configMap[config.key] = JSON.parse(config.value)
      } catch {
        configMap[config.key] = config.value
      }
    })

    return NextResponse.json({ 
      configs: configMap,
      count: configs.length
    })
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
