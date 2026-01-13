import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar configurações públicas (sem autenticação)
export async function GET() {
  try {
    // Buscar todas as configurações públicas necessárias para o frontend
    const publicKeys = [
      // Geral
      'site.name',
      'site.title',
      'site.description',
      'site.email',
      'site.phone',
      'site.whatsapp',
      'site.cnpj',
      'site.address',
      // Aparência
      'appearance.zoom',
      'appearance.primaryColor',
      'appearance.secondaryColor',
      'appearance.logo',
      'appearance.favicon',
      'appearance.heroBanner',
      'appearance.heroTitle',
      'appearance.heroSubtitle',
      'appearance.heroDiscount',
      'appearance.heroBadge',
      'appearance.heroButtonText',
      'appearance.heroButtonLink',
      'appearance.banners',
      // Loading / Mascote
      'loading.mascotTheme',
      'loading.message1',
      'loading.message2',
      'loading.message3',
      'loading.backgroundColor',
      // Manutenção
      'maintenance.enabled',
      'maintenance.message',
      // E-commerce
      'ecommerce.freeShippingMin',
      'ecommerce.showStock',
      'ecommerce.pixDiscount',
      // Social Links
      'social.facebook',
      'social.twitter',
      'social.instagram',
      'social.youtube',
      'social.whatsapp',
      'social.tiktok',
    ]

    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { in: publicKeys }
      }
    })

    const configMap: Record<string, any> = {}
    configs.forEach(config => {
      try {
        // Tenta parsear JSON (para arrays e objetos)
        configMap[config.key] = JSON.parse(config.value)
      } catch {
        // Se não for JSON, usa o valor como string
        configMap[config.key] = config.value
      }
    })

    return NextResponse.json(configMap)
  } catch (error) {
    console.error('Erro ao buscar configurações públicas:', error)
    // Retorna valores padrão em caso de erro
    return NextResponse.json({
      'appearance.zoom': 100,
      'appearance.primaryColor': '#3B82F6',
      'appearance.secondaryColor': '#F97316',
      'site.name': 'MYDSHOP',
      'ecommerce.freeShippingMin': 299
    })
  }
}
