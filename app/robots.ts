import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydshop.com.br'
  
  return {
    rules: [
      // ✅ Google: indexar tudo menos admin/checkout
      {
        userAgent: 'Googlebot',
        allow: ['/', '/produtos/', '/categorias/'],
        disallow: ['/admin/', '/api/', '/vendedor/', '/checkout/', '/pagamento/', '/perfil/', '/pedidos/', '/login', '/registro'],
      },
      // ✅ Google Shopping Bot — feed de produtos
      {
        userAgent: 'Googlebot-Image',
        allow: '/',
      },
      // ✅ Bing
      {
        userAgent: 'Bingbot',
        allow: ['/', '/produtos/', '/categorias/'],
        disallow: ['/admin/', '/api/', '/vendedor/', '/checkout/', '/pagamento/'],
      },
      // ✅ Facebook/Instagram — Open Graph para previews e catálogo
      {
        userAgent: 'facebookexternalhit',
        allow: ['/', '/produtos/', '/categorias/'],
        disallow: ['/admin/', '/api/'],
      },
      // ✅ WhatsApp — preview de links
      {
        userAgent: 'WhatsApp',
        allow: ['/', '/produtos/', '/categorias/'],
        disallow: ['/admin/'],
      },
      // ✅ Twitter/X — preview de links
      {
        userAgent: 'Twitterbot',
        allow: ['/', '/produtos/', '/categorias/'],
        disallow: ['/admin/', '/api/'],
      },
      // ✅ Comparadores de preço BR — tráfego orgânico gratuito
      {
        userAgent: 'BuscapeBot',
        allow: ['/produtos/', '/categorias/'],
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'Zoom Bot',
        allow: ['/produtos/', '/categorias/'],
        disallow: ['/admin/', '/api/'],
      },
      {
        userAgent: 'PriceSpy',
        allow: ['/produtos/', '/categorias/'],
        disallow: ['/admin/', '/api/'],
      },
      // ✅ Pinterest — geração de tráfego de descoberta
      {
        userAgent: 'Pinterest',
        allow: ['/', '/produtos/', '/categorias/'],
        disallow: ['/admin/', '/api/'],
      },
      // 🚫 Regra padrão para todos os outros bots
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/vendedor/',
          '/checkout/',
          '/pagamento/',
          '/perfil/',
          '/pedidos/',
          '/login',
          '/registro',
          '/esqueci-senha',
          '/redefinir-senha',
          '/maintenance',
          '/manutencao',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
