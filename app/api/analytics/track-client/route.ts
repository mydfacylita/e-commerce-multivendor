import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// API interna (sem necessidade de API key do cliente)
// Usa a API key do servidor internamente
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, data } = body

    // Validação básica
    if (!name || !data) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: name, data' 
      }, { status: 400 })
    }

    // Capturar IP real do cliente (server-side, não pode ser falsificado pelo client-js)
    const ip =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      '0.0.0.0'

    // Verificar se IP está na blocklist — descartar silenciosamente
    try {
      const blockConfig = await prisma.systemConfig.findUnique({ where: { key: 'security.ipBlocklist' } })
      if (blockConfig?.value) {
        const blocked: string[] = JSON.parse(blockConfig.value)
        if (blocked.includes(ip)) {
          return NextResponse.json({ success: true, message: 'ok' }) // silencioso
        }
      }
    } catch { /* não bloquear evento se DB falhar */ }

    // Injetar IP nos dados antes de salvar
    const enrichedData = { ...data, ip, serverTimestamp: new Date().toISOString() }

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

    // Salvar no banco
    await prisma.$executeRaw`
      INSERT INTO analytics_table (id, name, description, data, createdAt, updatedAt)
      VALUES (
        ${nanoid()},
        ${name},
        ${null},
        ${JSON.stringify(enrichedData)},
        NOW(),
        NOW()
      )
    `

    return NextResponse.json({ 
      success: true, 
      message: 'Evento registrado com sucesso' 
    })

  } catch (error) {
    console.error('Erro ao registrar evento:', error)
    return NextResponse.json({ 
      error: 'Erro interno' 
    }, { status: 500 })
  }
}
