/**
 * 🎨 API DE CONFIGURAÇÕES DO APP - ADMIN
 * 
 * Gerencia as configurações de aparência do aplicativo móvel.
 * Requer autenticação de administrador.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Lista de chaves permitidas para o app
const APP_CONFIG_KEYS = [
  // Marca
  'app.name',
  'app.slogan',
  'app.logo',
  'app.logoLight',
  'app.logoDark',
  'app.icon',
  'app.splashScreen',
  
  // Banner Carrossel
  'app.banners',
  
  // Cores
  'app.primaryColor',
  'app.secondaryColor',
  'app.accentColor',
  'app.backgroundColor',
  'app.textColor',
  'app.successColor',
  'app.warningColor',
  'app.dangerColor',
  
  // Textos
  'app.loginTitle',
  'app.loginSubtitle',
  'app.registerTitle',
  'app.registerSubtitle',
  'app.homeWelcome',
  
  // Funcionalidades
  'app.enablePushNotifications',
  'app.enableBiometricLogin',
  'app.enableDarkMode',
  'app.enableGuestCheckout',
  'app.maintenanceMode',
  'app.maintenanceMessage',
  'app.maintenanceReturnDate',
  
  // Suporte
  'app.termsUrl',
  'app.privacyUrl',
  'app.supportEmail',
  'app.supportPhone',
  'app.supportWhatsapp',
  
  // Conexão/API
  'app.apiUrl',
  'app.apiUrlDev',
  'app.apiUrlProd',
]

// GET - Buscar configurações do app
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar todas as configurações do app
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { in: APP_CONFIG_KEYS }
      }
    })

    // Converter para objeto
    const configMap: Record<string, any> = {}
    for (const config of configs) {
      try {
        configMap[config.key] = JSON.parse(config.value)
      } catch {
        configMap[config.key] = config.value
      }
    }

    return NextResponse.json(configMap)

  } catch (error) {
    console.error('Erro ao buscar configurações do app:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    )
  }
}

// POST - Salvar configurações do app
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const data = await req.json()

    // Validar e salvar cada configuração
    const updates = []
    for (const [key, value] of Object.entries(data)) {
      // Verificar se a chave é permitida
      if (!APP_CONFIG_KEYS.includes(key)) {
        continue
      }

      // Converter valor para string
      const stringValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value)

      // Upsert da configuração
      updates.push(
        prisma.systemConfig.upsert({
          where: { key },
          update: { 
            value: stringValue,
            updatedAt: new Date()
          },
          create: {
            key,
            value: stringValue,
            category: 'app',
            label: key.replace('app.', '').replace(/([A-Z])/g, ' $1').trim(),
            type: key.includes('Color') ? 'color' : 
                  key.includes('enable') || key.includes('Mode') ? 'boolean' : 
                  key.includes('logo') || key.includes('icon') || key.includes('Screen') ? 'image' : 'text',
            description: `Configuração do app: ${key}`,
          }
        })
      )
    }

    // Executar todas as atualizações
    await prisma.$transaction(updates)

    // Log da ação
    console.log(`[ADMIN] Configurações do app atualizadas por ${session.user?.email}`)

    return NextResponse.json({ success: true, message: 'Configurações salvas com sucesso' })

  } catch (error) {
    console.error('Erro ao salvar configurações do app:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configurações' },
      { status: 500 }
    )
  }
}
