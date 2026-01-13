import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/config/email
 * Busca configurações de email
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

    // Buscar configurações de email
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          startsWith: 'email.'
        }
      }
    })

    const configMap: Record<string, string> = {}
    configs.forEach((c: { key: string; value: string }) => {
      const key = c.key.replace('email.', '')
      configMap[key] = c.value
    })

    return NextResponse.json({
      config: {
        smtpHost: configMap['smtpHost'] || '',
        smtpPort: parseInt(configMap['smtpPort'] || '587'),
        smtpUser: configMap['smtpUser'] || '',
        smtpPassword: configMap['smtpPassword'] || '',
        smtpSecure: configMap['smtpSecure'] === 'true',
        fromName: configMap['fromName'] || '',
        fromEmail: configMap['fromEmail'] || ''
      },
      accounts: [] // Por enquanto vazio, gerenciado via SSH
    })
  } catch (error) {
    console.error('Erro ao buscar config de email:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * POST /api/admin/config/email
 * Salva configurações de email
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
      { key: 'email.smtpHost', value: config.smtpHost || '' },
      { key: 'email.smtpPort', value: String(config.smtpPort || 587) },
      { key: 'email.smtpUser', value: config.smtpUser || '' },
      { key: 'email.smtpPassword', value: config.smtpPassword || '' },
      { key: 'email.smtpSecure', value: String(config.smtpSecure || false) },
      { key: 'email.fromName', value: config.fromName || '' },
      { key: 'email.fromEmail', value: config.fromEmail || '' }
    ]

    for (const item of keysToSave) {
      await prisma.systemConfig.upsert({
        where: { key: item.key },
        create: { 
          key: item.key, 
          value: item.value,
          category: 'email',
          label: item.key.replace('email.', ''),
          type: 'text'
        },
        update: { value: item.value }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar config de email:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
