/**
 * 📱 API DE CONFIGURAÇÕES DO APP MOBILE
 * 
 * Retorna configurações de aparência e marca para o aplicativo móvel.
 * Endpoint público - apenas dados de branding (cores, banners, textos).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// CORS é tratado pelo middleware global - não adicionar headers duplicados

// OPTIONS - Preflight para CORS (tratado pelo middleware)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

/**
 * Resolve URL de imagem para URL completa
 * Se a URL começa com /, adiciona o baseUrl do servidor
 */
function resolveImageUrl(url: string | null | undefined, baseUrl: string): string | null {
  if (!url) return null;
  
  // Já é URL completa
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // URL relativa - adicionar base
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  
  return url;
}

// GET - Buscar configurações do app (endpoint público - apenas dados de branding)
export async function GET(request: NextRequest) {
  try {
    // Endpoint público: retorna apenas configurações de aparência (sem dados sensíveis)
    // API Key opcional para backward compatibility

    // Obter baseUrl do servidor a partir do request
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;
    
    // Chaves de configuração específicas para o app
    const appKeys = [
      // Marca / Identidade
      'app.name',
      'app.slogan',
      'app.logo',
      'app.logoLight',      // Logo para fundos escuros
      'app.logoDark',       // Logo para fundos claros
      'app.icon',           // Ícone do app
      'app.splashScreen',   // Imagem da splash screen
      
      // Banner Carrossel
      'app.banners',
      
      // Cores do tema
      'app.primaryColor',
      'app.secondaryColor',
      'app.accentColor',
      'app.backgroundColor',
      'app.textColor',
      'app.successColor',
      'app.warningColor',
      'app.dangerColor',
      
      // Textos personalizados
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
      
      // Links
      'app.termsUrl',
      'app.privacyUrl',
      'app.supportEmail',
      'app.supportPhone',
      'app.supportWhatsapp',
      
      // Conexão/API
      'app.apiUrl',
      'app.apiUrlDev',
      'app.apiUrlProd',
      
      // Configurações de e-commerce (herdar do site)
      'ecommerce.freeShippingMin',
      'ecommerce.pixDiscount',
      'ecommerce.boletoDiscount',
      
      // Também buscar configs do site como fallback
      'site.name',
      'appearance.primaryColor',
      'appearance.secondaryColor',
      'appearance.logo',
    ]

    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { in: appKeys }
      }
    })

    // Criar mapa de configurações
    const configMap: Record<string, any> = {}
    for (const config of configs) {
      // Parsear JSON se necessário
      try {
        configMap[config.key] = JSON.parse(config.value)
      } catch {
        configMap[config.key] = config.value
      }
    }

    // Montar resposta estruturada com valores padrão
    const appConfig = {
      // Identidade da marca
      brand: {
        name: configMap['app.name'] || configMap['site.name'] || 'MYDSHOP',
        slogan: configMap['app.slogan'] || 'Sua loja na palma da mão',
        logo: resolveImageUrl(configMap['app.logo'] || configMap['appearance.logo'], baseUrl),
        logoLight: resolveImageUrl(configMap['app.logoLight'], baseUrl),
        logoDark: resolveImageUrl(configMap['app.logoDark'], baseUrl),
        icon: resolveImageUrl(configMap['app.icon'], baseUrl),
        splashScreen: resolveImageUrl(configMap['app.splashScreen'], baseUrl),
      },
      
      // Tema de cores
      theme: {
        primary: configMap['app.primaryColor'] || configMap['appearance.primaryColor'] || '#f97316',
        secondary: configMap['app.secondaryColor'] || configMap['appearance.secondaryColor'] || '#2563eb',
        accent: configMap['app.accentColor'] || '#8b5cf6',
        background: configMap['app.backgroundColor'] || '#ffffff',
        text: configMap['app.textColor'] || '#1f2937',
        success: configMap['app.successColor'] || '#16a34a',
        warning: configMap['app.warningColor'] || '#eab308',
        danger: configMap['app.dangerColor'] || '#ef4444',
      },
      
      // Textos customizados
      texts: {
        loginTitle: configMap['app.loginTitle'] || 'Bem-vindo de volta!',
        loginSubtitle: configMap['app.loginSubtitle'] || 'Faça login para continuar',
        registerTitle: configMap['app.registerTitle'] || 'Crie sua conta',
        registerSubtitle: configMap['app.registerSubtitle'] || 'É rápido e gratuito',
        homeWelcome: configMap['app.homeWelcome'] || 'Olá! O que você procura hoje?',
      },
      
      // Funcionalidades habilitadas
      features: {
        pushNotifications: configMap['app.enablePushNotifications'] ?? true,
        biometricLogin: configMap['app.enableBiometricLogin'] ?? true,
        darkMode: configMap['app.enableDarkMode'] ?? true,
        guestCheckout: configMap['app.enableGuestCheckout'] ?? false,
      },
      
      // Estado do app
      status: {
        maintenance: configMap['app.maintenanceMode'] ?? false,
        maintenanceMessage: configMap['app.maintenanceMessage'] || 'Estamos em manutenção. Voltamos em breve!',
      },
      
      // Links de suporte
      support: {
        termsUrl: configMap['app.termsUrl'] || '/termos',
        privacyUrl: configMap['app.privacyUrl'] || '/privacidade',
        email: configMap['app.supportEmail'] || null,
        phone: configMap['app.supportPhone'] || null,
        whatsapp: configMap['app.supportWhatsapp'] || null,
      },
      
      // Banners do carrossel
      banners: Array.isArray(configMap['app.banners']) ? configMap['app.banners']
        .filter((banner: any) => banner.active)
        .sort((a: any, b: any) => a.order - b.order)
        .map((banner: any) => ({
          ...banner,
          image: banner.image ? resolveImageUrl(banner.image, baseUrl) : null
        })) : [
        {
          id: '1',
          title: 'Super Ofertas',
          subtitle: 'Até 50% OFF em produtos selecionados',
          icon: '🔥',
          gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
          buttonText: 'Ver Ofertas',
          buttonLink: '/ofertas',
          active: true,
          order: 1,
          image: null
        },
        {
          id: '2',
          title: 'Frete Grátis',
          subtitle: `Em compras acima de R$ ${configMap['ecommerce.freeShippingMin'] || 99}`,
          icon: '🚚',
          gradient: 'linear-gradient(135deg, #16a34a, #15803d)',
          buttonText: 'Aproveitar',
          buttonLink: '/frete-gratis',
          active: true,
          order: 2,
          image: null
        },
        {
          id: '3',
          title: 'Novidades',
          subtitle: 'Confira os produtos recém-chegados',
          icon: '✨',
          gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          buttonText: 'Explorar',
          buttonLink: '/novidades',
          active: true,
          order: 3,
          image: null
        },
        {
          id: '4',
          title: 'PIX Desconto',
          subtitle: '5% OFF no pagamento via PIX',
          icon: '💳',
          gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          buttonText: 'Usar PIX',
          buttonLink: '/pix',
          active: true,
          order: 4,
          image: null
        }
      ],
      
      // Configurações de e-commerce
      ecommerce: {
        freeShippingMin: configMap['ecommerce.freeShippingMin'] !== undefined ? parseFloat(configMap['ecommerce.freeShippingMin']) : 0,
        pixDiscount: configMap['ecommerce.pixDiscount'] !== undefined ? parseFloat(configMap['ecommerce.pixDiscount']) : 0,
        boletoDiscount: configMap['ecommerce.boletoDiscount'] !== undefined ? parseFloat(configMap['ecommerce.boletoDiscount']) : 0,
      },
      
      // Versão da configuração (para cache)
      version: Date.now(),
    }

    return NextResponse.json(appConfig, {
      headers: {
        // Sem cache - admin precisa ver mudanças imediatamente
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    })

  } catch (error) {
    console.error('Erro ao buscar configurações do app:', error)
    
    // Retornar configurações padrão em caso de erro
    return NextResponse.json({
      brand: {
        name: 'MYDSHOP',
        slogan: 'Sua loja na palma da mão',
        logo: null,
        logoLight: null,
        logoDark: null,
        icon: null,
        splashScreen: null,
      },
      theme: {
        primary: '#f97316',
        secondary: '#2563eb',
        accent: '#8b5cf6',
        background: '#ffffff',
        text: '#1f2937',
        success: '#16a34a',
        warning: '#eab308',
        danger: '#ef4444',
      },
      texts: {
        loginTitle: 'Bem-vindo de volta!',
        loginSubtitle: 'Faça login para continuar',
        registerTitle: 'Crie sua conta',
        registerSubtitle: 'É rápido e gratuito',
        homeWelcome: 'Olá! O que você procura hoje?',
      },
      features: {
        pushNotifications: true,
        biometricLogin: true,
        darkMode: true,
        guestCheckout: false,
      },
      status: {
        maintenance: false,
        maintenanceMessage: '',
      },
      support: {
        termsUrl: '/termos',
        privacyUrl: '/privacidade',
        email: null,
        phone: null,
        whatsapp: null,
      },
      banners: [
        {
          id: '1',
          title: 'Super Ofertas',
          subtitle: 'Até 50% OFF em produtos selecionados',
          icon: '🔥',
          gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
          buttonText: 'Ver Ofertas',
          buttonLink: '/ofertas',
          active: true,
          order: 1,
          image: null
        },
        {
          id: '2',
          title: 'Frete Grátis',
          subtitle: 'Em compras acima de R$ 99',
          icon: '🚚',
          gradient: 'linear-gradient(135deg, #16a34a, #15803d)',
          buttonText: 'Aproveitar',
          buttonLink: '/frete-gratis',
          active: true,
          order: 2,
          image: null
        }
      ],
      ecommerce: {
        freeShippingMin: 0,
        pixDiscount: 0,
        boletoDiscount: 0,
      },
      version: Date.now(),
    })
  }
}
