/**
 * 🔧 CONFIGURAÇÕES DO AMBIENTE - PRODUÇÃO
 */

export const environment = {
  production: true,

  // 🔧 Ambiente Mobile: 'local' para desenvolvimento, 'production' para produção
  // Quando 'local', usa http://localhost:3000 (para testes)
  MOBILE_ENV: 'local',

  // API Backend
  apiUrl: 'https://www.mydshop.com.br/api',

  // API Key para autenticação com backend  
  apiKey: 'myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6',

  // Configurações de autenticação
  auth: {
    tokenKey: 'mydshop_token',
    refreshTokenKey: 'mydshop_refresh_token',
    userKey: 'mydshop_user'
  },

  // Configurações do app
  app: {
    name: 'MYDSHOP',
    version: '1.0.0',
    defaultLanguage: 'pt-BR'
  },

  // Configurações de pagamento
  payment: {
    mercadoPagoPublicKey: '' // Adicionar chave pública do MercadoPago
  }
};
