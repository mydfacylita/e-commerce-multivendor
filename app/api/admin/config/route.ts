import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Buscar todas as configurações
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const prefix = searchParams.get('prefix') // Novo: filtrar por prefixo da key

    const where: any = {}
    
    if (category) {
      where.category = category
    }
    
    if (prefix) {
      where.key = { startsWith: prefix }
    }

    const configs = await prisma.systemConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    })

    // Converter para objeto para fácil acesso
    const configMap: Record<string, any> = {}
    configs.forEach(config => {
      try {
        configMap[config.key] = JSON.parse(config.value)
      } catch {
        configMap[config.key] = config.value
      }
    })

    return NextResponse.json({ configs: configMap, configList: configs })
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Salvar/atualizar configurações
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { configs } = body // Array de { key, value, category, label, description, type }

    const results = []

    for (const config of configs) {
      const { key, value, category, label, description, type } = config
      
      // Converter valor para string JSON se necessário
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value)

      const result = await prisma.systemConfig.upsert({
        where: { key },
        update: { 
          value: valueStr,
          updatedAt: new Date()
        },
        create: {
          key,
          value: valueStr,
          category: category || 'geral',
          label: label || key,
          description: description || null,
          type: type || 'text'
        }
      })

      results.push(result)
    }

    return NextResponse.json({ 
      success: true, 
      message: `${results.length} configurações salvas`,
      results 
    })
  } catch (error) {
    console.error('Erro ao salvar configurações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Remover configuração
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: 'Key é obrigatório' }, { status: 400 })
    }

    await prisma.systemConfig.delete({
      where: { key }
    })

    return NextResponse.json({ success: true, message: 'Configuração removida' })
  } catch (error) {
    console.error('Erro ao remover configuração:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
