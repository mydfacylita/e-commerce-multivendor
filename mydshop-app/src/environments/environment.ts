/**
 * 🔧 CONFIGURAÇÕES DO AMBIENTE - DESENVOLVIMENTO
 * 
 * Em desenvolvimento, usamos proxy configurado em proxy.conf.json
 * que redireciona /api para http://localhost:3000
 */

export const environment = {
  production: false,
  
  // 🔧 Ambiente Mobile: 'local' para desenvolvimento, 'production' para produção
  MOBILE_ENV: 'local',
  
  // API Backend - URL relativa (proxy redireciona para localhost:3000)
  apiUrl: '/api',
  
  // 🔒 API Key para autenticação nas APIs protegidas
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
