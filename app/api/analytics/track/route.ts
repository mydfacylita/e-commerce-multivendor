import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

export async function POST(req: NextRequest) {
  try {
    // Validar API Key do banco de dados
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key não fornecida. Use o header x-api-key' }, { status: 401 })
    }

    // Buscar API Key do SystemConfig
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'app.apiKey' }
    })

    if (!config || config.value !== apiKey) {
      return NextResponse.json({ error: 'API key inválida' }, { status: 401 })
    }

    const body = await req.json()
    const { name, data, description } = body

    // Validação básica
    if (!name || !data) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: name, data' 
      }, { status: 400 })
    }

    // Tipos de eventos aceitos
    const validEventTypes = [
      'page_view',
      'visitor',
      'click',
      'form_submit',
      'purchase',
      'add_to_cart',
      'search',
      'custom'
    ]

    if (!validEventTypes.includes(name)) {
      return NextResponse.json({ 
        error: `Tipo de evento inválido. Aceitos: ${validEventTypes.join(', ')}` 
      }, { status: 400 })
    }

    // Salvar no banco usando raw query (evita problemas com Prisma)
    await prisma.$executeRaw`
      INSERT INTO analytics_table (id, name, description, data, createdAt, updatedAt)
      VALUES (
        ${nanoid()},
        ${name},
        ${description || null},
        ${JSON.stringify(data)},
        NOW(),
        NOW()
      )
    `

    return NextResponse.json({ 
      success: true,
      message: 'Evento registrado com sucesso' 
    })

  } catch (error) {
    console.error('Erro ao registrar analytics:', error)
    return NextResponse.json({ 
      error: 'Erro ao processar requisição' 
    }, { status: 500 })
  }
}

// GET para documentação da API
export async function GET() {
  return NextResponse.json({
    message: 'API de Analytics - Use POST para enviar eventos',
    authentication: 'Envie a API key no header: X-API-Key ou Authorization: Bearer {key}',
    endpoints: {
      track: 'POST /api/analytics/track'
    },
    eventTypes: [
      'page_view - Visualização de página',
      'visitor - Novo visitante',
      'click - Clique em elemento',
      'form_submit - Envio de formulário',
      'purchase - Compra realizada',
      'add_to_cart - Produto adicionado ao carrinho',
      'search - Busca realizada',
      'custom - Evento customizado'
    ],
    example: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'sua_api_key_aqui'
      },
      body: {
        name: 'page_view',
        description: 'Usuário visitou a home',
        data: {
          page: '/',
          url: 'https://exemplo.com/',
          visitorId: 'uuid-do-visitante',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          referrer: 'https://google.com'
        }
      }
    }
  })
}
