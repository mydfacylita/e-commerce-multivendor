/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // 🚀 BUILD CONFIG: Otimizado para produção
  trailingSlash: false,
  
  // 🚀 BUILD CONFIG: Generate build ID
  async generateBuildId() {
    return 'production-build-' + Date.now()
  },

  // Otimizações de performance
  experimental: {
    optimizeCss: true,
    instrumentationHook: true, // Habilita instrumentation.ts para crons de background
  },
  
  // Comprimir respostas
  compress: true,
  
  // 🔒 SEGURANÇA: Não gerar source maps em produção (esconde código fonte)
  productionBrowserSourceMaps: false,
  
  // 🔒 SEGURANÇA: Desabilitar indicador de X-Powered-By
  poweredByHeader: false,
  
  // 🔒 SEGURANÇA: Desabilitar overlay de erro que expõe código
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  
  // Prefetch otimizado
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },
  
  // � SEGURANÇA: Rewrites baseado em host para subdomínio admin
  async rewrites() {
    return {
      beforeFiles: [
        // Quando acessar gerencial-sys.mydshop.com.br/, redireciona para /admin
        {
          source: '/',
          has: [
            {
              type: 'host',
              value: 'gerencial-sys.mydshop.com.br',
            },
          ],
          destination: '/admin',
        },
        // Mapeia todas as rotas do subdomínio para /admin/*
        {
          source: '/:path((?!admin).*)',
          has: [
            {
              type: 'host',
              value: 'gerencial-sys.mydshop.com.br',
            },
          ],
          destination: '/admin/:path*',
        },
      ],
    }
  },
  
  // �🚀 BUILD CONFIG: Unified headers configuration
  async headers() {
    return [
      // CORS para APIs
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-api-key' },
          { key: 'Cache-Control', value: 'no-store' }, // Prevent caching of API routes
        ],
      },
      // CORS para uploads (imagens estáticas)
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Headers de segurança para todas as rotas
      {
        source: '/(.*)',
        headers: [
          // Prevenir clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevenir MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Controlar informações do referrer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desabilitar recursos desnecessários
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          // Proteção XSS (navegadores antigos)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Forçar HTTPS (apenas em produção)
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }] : []),
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.mercadopago.com https://sdk.mercadopago.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://api.mercadopago.com https://api.mercadolibre.com https://*.aliexpress.com",
              "frame-src 'self' https://www.mercadopago.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
