import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CONFIG_FIELDS = [
  {
    key:         'shopify.apiKey',
    label:       'API Key (Client ID)',
    description: 'Chave pública do app no Shopify Partners',
    type:        'text',
    category:    'shopify',
  },
  {
    key:         'shopify.apiSecret',
    label:       'API Secret (Client Secret)',
    description: 'Chave secreta do app — nunca exposta publicamente',
    type:        'password',
    category:    'shopify',
  },
  {
    key:         'shopify.scopes',
    label:       'Escopos OAuth',
    description: 'Lista de permissões separadas por vírgula',
    type:        'text',
    category:    'shopify',
  },
]

/**
 * GET /api/admin/shopify/config
 * Retorna configurações do app Shopify (apiSecret mascarado)
 */
export async function GET() {
  try {
    const rows = await prisma.systemConfig.findMany({
      where: { category: 'shopify' },
    })

    const config: Record<string, any> = {}
    for (const field of CONFIG_FIELDS) {
      const row = rows.find((r: { key: string; value: string }) => r.key === field.key)
      config[field.key] = {
        key:         field.key,
        label:       field.label,
        description: field.description,
        type:        field.type,
        // Mascarar apiSecret na resposta
        value: field.type === 'password' && row?.value
          ? row.value.slice(0, 4) + '•'.repeat(20)
          : (row?.value || ''),
        configured: !!row?.value,
      }
    }

    return NextResponse.json(config)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/admin/shopify/config
 * Body: { 'shopify.apiKey': '...', 'shopify.apiSecret': '...', 'shopify.scopes': '...' }
 * Salva / atualiza as credenciais no SystemConfig
 */
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const results: string[] = []

  for (const field of CONFIG_FIELDS) {
    const newValue = body[field.key]

    // Ignorar campos não enviados ou senha mascarada (•••)
    if (newValue === undefined || newValue === null) continue
    if (field.type === 'password' && String(newValue).includes('•')) continue
    if (typeof newValue === 'string' && newValue.trim() === '') continue

    await prisma.systemConfig.upsert({
      where:  { key: field.key },
      update: {
        value:       String(newValue).trim(),
        label:       field.label,
        description: field.description,
        type:        field.type,
        category:    field.category,
      },
      create: {
        key:         field.key,
        value:       String(newValue).trim(),
        label:       field.label,
        description: field.description || '',
        type:        field.type,
        category:    field.category,
      },
    })

    results.push(field.key)
  }

  return NextResponse.json({ saved: results, message: 'Configurações salvas com sucesso' })
}
