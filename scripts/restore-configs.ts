import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const configs = [
  { key: 'app.apiKey', value: 'sk_5df2a9c1e8b4a6f3d7e9c2b4a8d6f1e3', category: 'app', label: 'API Key' },
  { key: 'app.maintenanceMode', value: 'false', category: 'app', label: 'Modo Manutenção' },
  { key: 'app.version', value: '1.0.0', category: 'app', label: 'Versão' },
  { key: 'email.smtp.host', value: 'smtp.hostinger.com', category: 'email', label: 'SMTP Host' },
  { key: 'email.smtp.port', value: '465', category: 'email', label: 'SMTP Porta' },
  { key: 'email.smtp.secure', value: 'true', category: 'email', label: 'SMTP Seguro' },
  { key: 'email.smtp.user', value: 'contato@mycropay.com.br', category: 'email', label: 'SMTP Usuário' },
  { key: 'email.smtp.password', value: 'Mycro@2050', category: 'email', label: 'SMTP Senha' },
  { key: 'email.from.address', value: 'contato@mycropay.com.br', category: 'email', label: 'Email De' },
  { key: 'email.from.name', value: 'Mycropay', category: 'email', label: 'Nome De' },
  { key: 'ecommerce.tax.icms', value: '18', category: 'ecommerce', label: 'ICMS (%)' },
  { key: 'ecommerce.tax.pis', value: '1.65', category: 'ecommerce', label: 'PIS (%)' },
  { key: 'ecommerce.tax.cofins', value: '7.6', category: 'ecommerce', label: 'COFINS (%)' },
  { key: 'ecommerce.shipping.freeAbove', value: '200', category: 'ecommerce', label: 'Frete Grátis Acima' },
  { key: 'ecommerce.shipping.defaultMethod', value: 'correios', category: 'ecommerce', label: 'Método Frete Padrão' },
  { key: 'ecommerce.currency', value: 'BRL', category: 'ecommerce', label: 'Moeda' },
  { key: 'ecommerce.defaultLanguage', value: 'pt-BR', category: 'ecommerce', label: 'Idioma Padrão' },
  { key: 'correios.usuario', value: 'mycropay', category: 'correios', label: 'Usuário Correios' },
  { key: 'correios.senha', value: '123456', category: 'correios', label: 'Senha Correios' },
  { key: 'correios.codigoAcesso', value: '0074657178', category: 'correios', label: 'Código Acesso Correios' },
  { key: 'correios.cartaoPostagem', value: '0074657178', category: 'correios', label: 'Cartão Postagem' },
  { key: 'correios.cnpj', value: '42.080.298/0001-59', category: 'correios', label: 'CNPJ' },
  { key: 'correios.apiUrl', value: 'https://api.correios.com.br', category: 'correios', label: 'URL API Correios' },
  { key: 'correios.cepOrigem', value: '13067-470', category: 'correios', label: 'CEP Origem' },
  { key: 'aparencia.tema', value: 'light', category: 'aparencia', label: 'Tema' },
  { key: 'aparencia.corPrimaria', value: '#0070f3', category: 'aparencia', label: 'Cor Primária' },
  { key: 'aparencia.corSecundaria', value: '#7928ca', category: 'aparencia', label: 'Cor Secundária' },
  { key: 'aparencia.logo', value: '/logo.png', category: 'aparencia', label: 'Logo' },
  { key: 'aparencia.favicon', value: '/favicon.ico', category: 'aparencia', label: 'Favicon' },
  { key: 'impostos.icms.aliquota', value: '18', category: 'impostos', label: 'Alíquota ICMS' },
  { key: 'impostos.pis.aliquota', value: '1.65', category: 'impostos', label: 'Alíquota PIS' },
  { key: 'impostos.cofins.aliquota', value: '7.6', category: 'impostos', label: 'Alíquota COFINS' },
  { key: 'impostos.ipi.aliquota', value: '0', category: 'impostos', label: 'Alíquota IPI' },
  { key: 'nfe.ambiente', value: 'homologacao', category: 'nfe', label: 'Ambiente NFe' },
  { key: 'nfe.certificado', value: '', category: 'nfe', label: 'Certificado NFe' },
  { key: 'nfe.senha', value: '', category: 'nfe', label: 'Senha Certificado' },
  { key: 'nfe.serie', value: '1', category: 'nfe', label: 'Série NFe' },
  { key: 'nfe.numero', value: '1', category: 'nfe', label: 'Número NFe' },
  { key: 'mercadopago.publicKey', value: '', category: 'mercadopago', label: 'Chave Pública MP' },
  { key: 'mercadopago.accessToken', value: '', category: 'mercadopago', label: 'Access Token MP' },
  { key: 'mercadopago.webhookSecret', value: '', category: 'mercadopago', label: 'Webhook Secret MP' },
  { key: 'pix.chavePix', value: '', category: 'pagamento', label: 'Chave PIX' },
  { key: 'pix.nomeRecebedor', value: '', category: 'pagamento', label: 'Nome Recebedor PIX' },
  { key: 'pix.cidadeRecebedor', value: '', category: 'pagamento', label: 'Cidade Recebedor PIX' },
  { key: 'boleto.banco', value: '', category: 'pagamento', label: 'Banco Boleto' },
  { key: 'boleto.agencia', value: '', category: 'pagamento', label: 'Agência Boleto' },
  { key: 'boleto.conta', value: '', category: 'pagamento', label: 'Conta Boleto' },
  { key: 'boleto.carteira', value: '', category: 'pagamento', label: 'Carteira Boleto' },
  { key: 'seo.metaTitle', value: 'Mycropay - Sua Loja Online', category: 'seo', label: 'Meta Title' },
  { key: 'seo.metaDescription', value: 'A melhor loja online para suas compras', category: 'seo', label: 'Meta Description' },
  { key: 'seo.metaKeywords', value: 'loja, online, ecommerce, compras', category: 'seo', label: 'Meta Keywords' },
  { key: 'social.facebook', value: '', category: 'social', label: 'Facebook' },
  { key: 'social.instagram', value: '', category: 'social', label: 'Instagram' },
  { key: 'social.twitter', value: '', category: 'social', label: 'Twitter' },
  { key: 'social.linkedin', value: '', category: 'social', label: 'LinkedIn' },
  { key: 'social.youtube', value: '', category: 'social', label: 'YouTube' },
  { key: 'analytics.googleAnalyticsId', value: '', category: 'analytics', label: 'Google Analytics ID' },
  { key: 'analytics.facebookPixelId', value: '', category: 'analytics', label: 'Facebook Pixel ID' },
  { key: 'analytics.googleTagManagerId', value: '', category: 'analytics', label: 'Google Tag Manager ID' },
  { key: 'company.name', value: 'Mycropay LTDA', category: 'company', label: 'Nome Empresa' },
  { key: 'company.cnpj', value: '42.080.298/0001-59', category: 'company', label: 'CNPJ' },
  { key: 'company.address', value: 'Rua Exemplo, 123', category: 'company', label: 'Endereço' },
  { key: 'company.city', value: 'Campinas', category: 'company', label: 'Cidade' },
  { key: 'company.state', value: 'SP', category: 'company', label: 'Estado' },
  { key: 'company.zipcode', value: '13067-470', category: 'company', label: 'CEP' },
  { key: 'company.phone', value: '(19) 99999-9999', category: 'company', label: 'Telefone' },
  { key: 'company.email', value: 'contato@mycropay.com.br', category: 'company', label: 'Email' },
  { key: 'shipping.defaultDays', value: '7', category: 'shipping', label: 'Prazo Padrão (dias)' },
  { key: 'shipping.defaultPrice', value: '15.00', category: 'shipping', label: 'Preço Padrão' },
  { key: 'shipping.freeShippingAbove', value: '200.00', category: 'shipping', label: 'Frete Grátis Acima' },
  { key: 'order.minValue', value: '20.00', category: 'order', label: 'Valor Mínimo Pedido' },
  { key: 'order.maxValue', value: '10000.00', category: 'order', label: 'Valor Máximo Pedido' },
  { key: 'order.cancelTimeout', value: '24', category: 'order', label: 'Timeout Cancelamento (h)' },
  { key: 'product.defaultStock', value: '0', category: 'product', label: 'Estoque Padrão' },
  { key: 'product.lowStockAlert', value: '5', category: 'product', label: 'Alerta Estoque Baixo' },
  { key: 'product.outOfStockBehavior', value: 'hide', category: 'product', label: 'Comportamento Sem Estoque' },
  { key: 'affiliate.commissionPercentage', value: '10', category: 'affiliate', label: 'Comissão Afiliado (%)' },
  { key: 'affiliate.minWithdraw', value: '50.00', category: 'affiliate', label: 'Saque Mínimo Afiliado' },
  { key: 'affiliate.cookieDuration', value: '30', category: 'affiliate', label: 'Duração Cookie (dias)' },
  { key: 'security.maxLoginAttempts', value: '5', category: 'security', label: 'Máx Tentativas Login' },
  { key: 'security.lockoutDuration', value: '30', category: 'security', label: 'Duração Bloqueio (min)' },
  { key: 'security.sessionTimeout', value: '60', category: 'security', label: 'Timeout Sessão (min)' },
  { key: 'notification.orderCreated', value: 'true', category: 'notification', label: 'Notif Pedido Criado' },
  { key: 'notification.orderPaid', value: 'true', category: 'notification', label: 'Notif Pedido Pago' },
  { key: 'notification.orderShipped', value: 'true', category: 'notification', label: 'Notif Pedido Enviado' },
  { key: 'notification.orderDelivered', value: 'true', category: 'notification', label: 'Notif Pedido Entregue' },
  { key: 'notification.stockAlert', value: 'true', category: 'notification', label: 'Notif Alerta Estoque' },
  { key: 'aws.region', value: 'sa-east-1', category: 'aws', label: 'AWS Region' },
  { key: 'aws.accessKeyId', value: '', category: 'aws', label: 'AWS Access Key ID' },
  { key: 'aws.secretAccessKey', value: '', category: 'aws', label: 'AWS Secret Access Key' },
  { key: 'aws.s3.bucket', value: '', category: 'aws', label: 'AWS S3 Bucket' },
  { key: 'storage.provider', value: 'local', category: 'storage', label: 'Provedor Storage' },
  { key: 'storage.maxFileSize', value: '5242880', category: 'storage', label: 'Tamanho Máx Arquivo' },
  { key: 'storage.allowedTypes', value: 'image/jpeg,image/png,image/gif,image/webp', category: 'storage', label: 'Tipos Permitidos' },
  { key: 'cache.enabled', value: 'true', category: 'cache', label: 'Cache Ativado' },
  { key: 'cache.ttl', value: '3600', category: 'cache', label: 'Cache TTL (s)' },
  { key: 'cache.provider', value: 'redis', category: 'cache', label: 'Provedor Cache' },
  { key: 'redis.host', value: 'localhost', category: 'redis', label: 'Redis Host' },
  { key: 'redis.port', value: '6379', category: 'redis', label: 'Redis Porta' },
  { key: 'redis.password', value: '', category: 'redis', label: 'Redis Senha' },
  { key: 'queue.enabled', value: 'true', category: 'queue', label: 'Fila Ativada' },
  { key: 'queue.provider', value: 'redis', category: 'queue', label: 'Provedor Fila' },
  { key: 'queue.defaultQueue', value: 'default', category: 'queue', label: 'Fila Padrão' },
  { key: 'log.level', value: 'info', category: 'log', label: 'Nível Log' },
  { key: 'log.maxFiles', value: '7', category: 'log', label: 'Máx Arquivos Log' },
  { key: 'log.maxSize', value: '10485760', category: 'log', label: 'Tamanho Máx Log' },
  { key: 'backup.enabled', value: 'true', category: 'backup', label: 'Backup Ativado' },
  { key: 'backup.frequency', value: 'daily', category: 'backup', label: 'Frequência Backup' },
  { key: 'backup.retention', value: '30', category: 'backup', label: 'Retenção Backup (dias)' },
  { key: 'maintenance.scheduledStart', value: '', category: 'maintenance', label: 'Início Manutenção' },
  { key: 'maintenance.scheduledEnd', value: '', category: 'maintenance', label: 'Fim Manutenção' },
  { key: 'maintenance.message', value: 'Sistema em manutenção. Voltamos em breve!', category: 'maintenance', label: 'Mensagem Manutenção' },
  { key: 'api.rateLimit', value: '100', category: 'api', label: 'Rate Limit API' },
  { key: 'api.rateLimitWindow', value: '60', category: 'api', label: 'Janela Rate Limit (s)' },
  { key: 'api.timeout', value: '30', category: 'api', label: 'Timeout API (s)' },
  { key: 'webhook.retryAttempts', value: '3', category: 'webhook', label: 'Tentativas Webhook' },
  { key: 'webhook.retryDelay', value: '60', category: 'webhook', label: 'Delay Retry (s)' },
  { key: 'webhook.timeout', value: '30', category: 'webhook', label: 'Timeout Webhook (s)' },
  { key: 'integration.aliexpress.enabled', value: 'false', category: 'integration', label: 'AliExpress Ativado' },
  { key: 'integration.aliexpress.apiKey', value: '', category: 'integration', label: 'AliExpress API Key' },
  { key: 'integration.aliexpress.apiSecret', value: '', category: 'integration', label: 'AliExpress API Secret' },
  { key: 'integration.mlb.enabled', value: 'false', category: 'integration', label: 'MLB Ativado' },
  { key: 'integration.mlb.clientId', value: '', category: 'integration', label: 'MLB Client ID' },
  { key: 'integration.mlb.clientSecret', value: '', category: 'integration', label: 'MLB Client Secret' },
  { key: 'ai.provider', value: 'gemini', category: 'ai', label: 'Provedor IA' },
  { key: 'ai.gemini.apiKey', value: 'AIzaSyBUoQ_fO37w9PJy7mXMeGbq-04N98uyK1I', category: 'ai', label: 'Gemini API Key' },
  { key: 'ai.gemini.model', value: 'gemini-pro', category: 'ai', label: 'Gemini Model' },
  { key: 'ai.openai.apiKey', value: '', category: 'ai', label: 'OpenAI API Key' },
  { key: 'ai.openai.model', value: 'gpt-4', category: 'ai', label: 'OpenAI Model' },
  { key: 'feature.newsletter', value: 'true', category: 'feature', label: 'Newsletter Ativada' },
  { key: 'feature.wishlist', value: 'true', category: 'feature', label: 'Lista Desejos Ativada' },
  { key: 'feature.reviews', value: 'true', category: 'feature', label: 'Avaliações Ativadas' },
  { key: 'feature.compare', value: 'false', category: 'feature', label: 'Comparação Ativada' }
]

async function main() {
  console.log('🗑️  Limpando configurações antigas...')
  await prisma.systemConfig.deleteMany({})
  
  console.log('📥 Inserindo configurações de produção...')
  let count = 0
  
  for (const config of configs) {
    await prisma.systemConfig.create({
      data: {
        key: config.key,
        value: config.value,
        category: config.category,
        label: config.label,
        description: `Configuração de ${config.label}`,
        type: 'text'
      }
    })
    count++
    if (count % 10 === 0) {
      console.log(`   ✓ ${count} configurações inseridas...`)
    }
  }
  
  console.log(`\n✅ Sucesso! ${count} configurações restauradas de produção.`)
  console.log('\n📋 Resumo por categoria:')
  
  const grouped = configs.reduce((acc, config) => {
    acc[config.category] = (acc[config.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, qtd]) => {
      console.log(`   ${cat}: ${qtd} configurações`)
    })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erro:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
