import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mydshop.com.br'
  
  return {
    rules: [
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
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/vendedor/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
