import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/config/maintenance
 * Retorna configuração de manutenção (usado pelo middleware)
 */
export async function GET() {
  try {
    // Busca configurações de manutenção do banco
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            'maintenance.enabled',
            'maintenance.message', 
            'maintenance.estimatedTime'
          ]
        }
      }
    })

    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({
      enabled: configMap['maintenance.enabled'] === 'true',
      message: configMap['maintenance.message'] || 'Estamos em manutenção. Voltamos em breve!',
      returnDate: configMap['maintenance.estimatedTime'] || null
    })
  } catch (error) {
    console.error('Erro ao buscar config de manutenção:', error)
    
    // Em caso de erro, retorna manutenção desabilitada
    return NextResponse.json({
      enabled: false,
      message: null,
      returnDate: null
    })
  }
}
