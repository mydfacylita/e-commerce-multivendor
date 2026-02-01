import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Buscar configuração
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const config = await prisma.systemConfig.findFirst({
      where: { key: 'ai_config' }
    })

    if (!config?.value) {
      return NextResponse.json({ 
        config: {
          provider: 'gemini',
          apiKey: '',
          model: '',
          enabled: true
        }
      })
    }

    try {
      const parsedConfig = JSON.parse(config.value)
      // Mascarar a API key para exibição
      return NextResponse.json({ 
        config: {
          ...parsedConfig,
          apiKey: parsedConfig.apiKey ? '••••••••' + parsedConfig.apiKey.slice(-4) : ''
        },
        hasApiKey: !!parsedConfig.apiKey
      })
    } catch {
      return NextResponse.json({ 
        config: {
          provider: 'gemini',
          apiKey: '',
          model: '',
          enabled: true
        }
      })
    }

  } catch (error) {
    console.error('Erro ao buscar configuração de IA:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Salvar configuração
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, apiKey, model, enabled } = body

    // Se a API key começa com bullets, significa que não foi alterada
    // Nesse caso, mantemos a chave existente
    let finalApiKey = apiKey
    
    if (apiKey?.startsWith('••••')) {
      const existingConfig = await prisma.systemConfig.findFirst({
        where: { key: 'ai_config' }
      })
      
      if (existingConfig?.value) {
        try {
          const parsed = JSON.parse(existingConfig.value)
          finalApiKey = parsed.apiKey
        } catch {
          // ignore
        }
      }
    }

    // Validar API key
    if (!finalApiKey) {
      return NextResponse.json({ error: 'Chave da API é obrigatória' }, { status: 400 })
    }

    // Validar formato básico
    if (provider === 'gemini' && !finalApiKey.startsWith('AIza')) {
      return NextResponse.json({ error: 'Chave do Gemini inválida (deve começar com AIza)' }, { status: 400 })
    }

    if (provider === 'openai' && !finalApiKey.startsWith('sk-')) {
      return NextResponse.json({ error: 'Chave da OpenAI inválida (deve começar com sk-)' }, { status: 400 })
    }

    const configData = {
      provider,
      apiKey: finalApiKey,
      model: model || '',
      enabled: enabled !== false
    }

    // Upsert na configuração
    await prisma.systemConfig.upsert({
      where: { key: 'ai_config' },
      create: {
        key: 'ai_config',
        value: JSON.stringify(configData),
        category: 'ai',
        label: 'Configuração de IA',
        description: 'Configuração da API de Inteligência Artificial',
        type: 'json'
      },
      update: {
        value: JSON.stringify(configData)
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao salvar configuração de IA:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
