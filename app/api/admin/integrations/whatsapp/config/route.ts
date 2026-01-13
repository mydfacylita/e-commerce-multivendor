import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/integrations/whatsapp/config
 * Buscar configuração do WhatsApp
 */
export async function GET() {
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

    // Buscar todas as configurações do WhatsApp
    const configs = await prisma.companySettings.findMany({
      where: { key: { startsWith: 'whatsapp.' } }
    })

    const configMap: Record<string, string> = {}
    configs.forEach(c => {
      const key = c.key.replace('whatsapp.', '')
      configMap[key] = c.value
    })

    // Ocultar parte do token por segurança
    if (configMap.apiKey) {
      configMap.apiKey = configMap.apiKey.substring(0, 20) + '...' + configMap.apiKey.slice(-10)
    }

    return NextResponse.json({ config: configMap })
  } catch (error) {
    console.error('Erro ao buscar config WhatsApp:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * POST /api/admin/integrations/whatsapp/config
 * Salvar configuração do WhatsApp
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

    const body = await request.json()
    const { provider, phoneNumberId, apiKey, apiUrl, instanceId, isActive } = body

    // Validar campos obrigatórios baseado no provedor
    if (provider === 'cloud' && !phoneNumberId) {
      return NextResponse.json({ error: 'Phone Number ID é obrigatório para Cloud API' }, { status: 400 })
    }

    if ((provider === 'evolution' || provider === 'zapi') && !instanceId) {
      return NextResponse.json({ error: 'Instance ID é obrigatório' }, { status: 400 })
    }

    // Buscar token existente para manter se não foi alterado
    const existingApiKey = await prisma.companySettings.findFirst({
      where: { key: 'whatsapp.apiKey' }
    })

    let finalApiKey = apiKey
    if (existingApiKey && apiKey && apiKey.includes('...')) {
      // Token não foi alterado, manter o original
      finalApiKey = existingApiKey.value
    }

    // Upsert cada configuração
    const configsToSave = [
      { key: 'whatsapp.provider', value: isActive ? provider : 'disabled' },
      { key: 'whatsapp.phoneNumberId', value: phoneNumberId || '' },
      { key: 'whatsapp.apiKey', value: finalApiKey || '' },
      { key: 'whatsapp.apiUrl', value: apiUrl || '' },
      { key: 'whatsapp.instanceId', value: instanceId || '' },
    ]

    for (const config of configsToSave) {
      await prisma.companySettings.upsert({
        where: { key: config.key },
        update: { value: config.value },
        create: { key: config.key, value: config.value }
      })
    }

    console.log('✅ Configuração WhatsApp salva:', { provider, isActive })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar config WhatsApp:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
