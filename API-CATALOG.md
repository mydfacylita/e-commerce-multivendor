# 📋 CATÁLOGO DE APIs - E-COMMERCE MYDSHOP

## 🔐 AUTENTICAÇÃO & USUÁRIOS

### Auth APIs
- `POST /api/auth/[...nextauth]` - NextAuth handler principal
- `POST /api/auth/register` - Registro de novos usuários
- `POST /api/auth/login` - Login de usuários
  - ⚠️ **VULNERÁVEL**: Verificar rate limiting e proteção contra brute force

### User APIs
- `GET/PUT /api/user/profile` - Perfil do usuário logado
- `GET /api/user/addresses` - Listar endereços
- `POST /api/user/address` - Criar endereço
- `PUT/DELETE /api/user/addresses/[id]` - Atualizar/deletar endereço específico
  - ⚠️ **VULNERÁVEL**: Verificar se usuário só pode modificar seus próprios endereços

---

## 🛍️ PRODUTOS & CATÁLOGO

### Products APIs (Público)
- `GET /api/products/[id]` - Detalhes de produto específico
- `GET /api/products/search` - Buscar produtos
- `GET /api/products/related` - Produtos relacionados
- `GET /api/products/paginated` - Listagem paginada
- `GET /api/products/weights` - Pesos dos produtos para frete

### Product Reviews APIs
- `GET /api/products/[id]/reviews` - Listar avaliações do produto
  - Query params: `sortBy` (recent, helpful, rating-high, rating-low), `page`, `limit`
  - Retorna: reviews, stats (média, distribuição, total)
- `POST /api/products/[id]/reviews` - Criar avaliação (autenticado)
  - Body: `{ rating, title?, comment?, pros?, cons?, images? }`
  - Verifica se usuário comprou o produto (isVerified)
  - ✅ **SEGURO**: Verificação de compra + autenticação
- `POST /api/products/[id]/reviews/[reviewId]/helpful` - Votar útil/não útil
  - Body: `{ isHelpful: boolean }`
  - Toggle: votar novamente remove o voto

### Product Questions APIs
- `GET /api/products/[id]/questions` - Listar perguntas do produto
  - Query params: `answered` (true/false), `page`, `limit`
  - Retorna: questions, stats (total, respondidas, aguardando)
- `POST /api/products/[id]/questions` - Fazer pergunta (autenticado)
  - Body: `{ question: string }`
  - Rate limit: 10 perguntas/dia por usuário
  - ✅ **SEGURO**: Rate limiting + autenticação
- `POST /api/products/[id]/questions/[questionId]/answer` - Responder (vendedor/admin)
  - Body: `{ answer: string }`
  - Verifica: proprietário do produto, admin ou funcionário
  - ✅ **SEGURO**: Verificação de permissões

### Categories APIs
- `GET /api/categories` - Listar categorias
  - ✅ **SEGURO**: Endpoint público read-only

---

## 🛒 PEDIDOS & CHECKOUT

### Orders APIs (Cliente)
- `GET /api/orders` - Listar pedidos do usuário
- `GET /api/orders/[id]` - Detalhes de pedido específico
- `PUT /api/orders/[id]/update` - Atualizar pedido
  - ⚠️ **VULNERÁVEL**: Verificar permissões - usuário deve ver apenas seus pedidos

---

## 💳 PAGAMENTOS

### Payment APIs
- `POST /api/payment/create` - Criar pagamento
- `GET /api/payment/public-key` - Chave pública do gateway
- `GET /api/payment/gateways` - Gateways disponíveis
- `GET /api/payment/installments-rules` - Regras de parcelamento
- `POST /api/payment/check-pending` - Verificar pagamentos pendentes
- `GET /api/payment/check-status/[orderId]` - Status do pagamento
- `GET /api/payment/details/[paymentId]` - Detalhes do pagamento
- `GET /api/payment/order-payments/[orderId]` - Pagamentos de um pedido
- `POST /api/payment/webhook` - Webhook de notificações
  - ⚠️ **CRÍTICO**: Webhook deve validar assinaturas/tokens de segurança

---

## 🚚 FRETE & LOGÍSTICA

### Shipping APIs
- `POST /api/shipping/calculate` - Calcular frete
- `POST /api/shipping/quote` - Cotação de frete
- `POST /api/shipping/correios` - Calcular frete Correios
- `GET /api/shipping/tracking` - Rastreamento de envio
  - ✅ **RELATIVAMENTE SEGURO**: APIs de cálculo, verificar validação de inputs

### Packaging APIs
- `GET /api/packaging` - Listar embalagens disponíveis

---

## 👤 VENDEDOR (SELLER)

### Seller Management
- `POST /api/seller/register` - Registro de vendedor
- `GET /api/seller/financial` - Dados financeiros do vendedor
- `GET /api/seller/permissions` - Permissões do vendedor
- `GET /api/vendedor/balance` - Saldo do vendedor
  - ⚠️ **VULNERÁVEL**: Verificar autorização - vendedor só vê próprios dados

### Seller Employees
- `GET/POST /api/seller/employees` - Gerenciar funcionários
- `PUT /api/seller/employees/update-role` - Atualizar cargo
  - ⚠️ **VULNERÁVEL**: Verificar hierarquia de permissões

### Seller Subscription
- `GET /api/seller/subscription` - Dados da assinatura
- `POST /api/seller/subscription/subscribe` - Criar assinatura
- `POST /api/seller/subscription/confirm-payment` - Confirmar pagamento
- `POST /api/seller/subscription/cancel` - Cancelar assinatura
- `GET /api/seller/plans/available` - Planos disponíveis

### Seller Withdrawals (Saques)
- `GET /api/vendedor/saques` - Listar saques
- `POST /api/vendedor/saques/[id]/cancelar` - Cancelar saque
  - ⚠️ **VULNERÁVEL**: Verificar se vendedor só cancela próprios saques

### Seller EAN Management
- `GET /api/vendedor/ean/packages` - Pacotes EAN disponíveis
- `POST /api/vendedor/ean/request` - Solicitar códigos EAN
- `POST /api/vendedor/ean/generate` - Gerar códigos EAN
- `GET /api/vendedor/ean/credits` - Créditos EAN do vendedor
- `GET /api/vendedor/ean/my-codes` - Códigos EAN do vendedor
  - ⚠️ **VULNERÁVEL**: Verificar isolamento de dados entre vendedores

### Seller Marketplace Integration
- `GET/POST /api/seller/marketplaces/mercadolivre/credentials` - Credenciais ML
- `GET /api/seller/marketplaces/mercadolivre/status` - Status da integração ML

---

## 🔧 ADMIN - PRODUTOS

### Admin Products
- `GET/POST /api/admin/products` - Listar/criar produtos
- `GET/PUT/DELETE /api/admin/products/[id]` - Gerenciar produto específico
- `POST /api/admin/products/[id]/toggle-active` - Ativar/desativar
- `POST /api/admin/products/sync-aliexpress` - Sincronizar AliExpress
- `POST /api/admin/products/[id]/dropshipping` - Config dropshipping
  - 🔴 **CRÍTICO**: Verificar role ADMIN em todas as rotas

### Admin Product Publishing
- `POST /api/admin/products/[id]/publish` - Publicar em marketplace
- `POST /api/admin/products/[id]/sync-listing` - Sincronizar listagem
- `POST /api/admin/products/[id]/pause-listing` - Pausar listagem
- `POST /api/admin/products/[id]/delete-listing` - Deletar listagem
  - 🔴 **CRÍTICO**: Operações sensíveis, exigem autenticação forte

---

## 🔧 ADMIN - PEDIDOS

### Admin Orders
- `GET /api/admin/orders/dropshipping` - Pedidos dropshipping
- `POST /api/admin/orders/send-to-supplier` - Enviar para fornecedor
- `POST /api/admin/orders/reset-supplier-status` - Resetar status fornecedor
- `POST /api/admin/orders/fetch-ml-orders` - Buscar pedidos ML
- `POST /api/admin/orders/auto-fetch` - Busca automática
- `GET /api/admin/orders/aliexpress-status` - Status pedidos AliExpress
- `GET /api/admin/orders/[id]/label` - Etiqueta de envio
  - 🔴 **CRÍTICO**: Acesso a todos os pedidos, validação essencial

### Admin Order Processing (Expedição)
- `GET /api/admin/expedicao` - Pedidos para expedição
- `POST /api/admin/expedicao/[id]/separar` - Separar pedido
- `POST /api/admin/expedicao/[id]/embalar` - Embalar pedido
- `POST /api/admin/expedicao/[id]/etiqueta` - Gerar etiqueta
- `POST /api/admin/expedicao/[id]/despachar` - Despachar pedido
- `GET /api/admin/expedicao/guia-separacao` - Guia de separação
- `GET /api/admin/expedicao/guia-coleta` - Guia de coleta

---

## 🔧 ADMIN - FINANCEIRO

### Admin Financial
- `GET /api/admin/financeiro/stats` - Estatísticas financeiras
- `GET /api/admin/financeiro/relatorio` - Relatório financeiro
- `GET /api/admin/financeiro/pagamentos-pendentes` - Pagamentos pendentes
- `GET /api/admin/financeiro/duplicados` - Pagamentos duplicados
- `POST /api/admin/financeiro/aprovar-pagamento` - Aprovar pagamento
- `POST /api/admin/financeiro/sync-payments` - Sincronizar pagamentos
  - 🔴 **CRÍTICO**: Dados financeiros sensíveis

### Admin Refunds
- `GET /api/admin/financeiro/refunds` - Listar reembolsos
- `POST /api/admin/financeiro/refund` - Processar reembolso
- `GET /api/admin/financeiro/orders-for-refund` - Pedidos para reembolso
  - 🔴 **CRÍTICO**: Movimentação de dinheiro, logging obrigatório

---

## 🔧 ADMIN - VENDEDORES & SAQUES

### Admin Sellers
- `GET/PUT /api/admin/sellers/[id]` - Gerenciar vendedor
  - 🔴 **CRÍTICO**: Acesso a dados de todos vendedores

### Admin Withdrawals
- `GET /api/admin/saques` - Listar todos os saques
- `POST /api/admin/saques/[id]/aprovar` - Aprovar saque
- `POST /api/admin/saques/[id]/rejeitar` - Rejeitar saque
- `POST /api/admin/saques/[id]/pagar` - Marcar como pago
- `POST /api/admin/saques/[id]/concluir` - Concluir saque
  - 🔴 **CRÍTICO**: Movimentação financeira, auditoria obrigatória

---

## 🔧 ADMIN - EAN CODES

### Admin EAN Management
- `GET /api/admin/ean/purchases` - Solicitações de EAN
- `GET /api/admin/ean/packages` - Pacotes EAN
- `POST /api/admin/ean/packages` - Criar pacote
- `PUT/DELETE /api/admin/ean/packages/[id]` - Gerenciar pacote
- `POST /api/admin/ean/generate` - Gerar códigos para vendedor
- `POST /api/admin/ean/generate-for-admin` - Gerar códigos para admin
- `POST /api/admin/ean/cancel` - Cancelar solicitação
- `GET /api/admin/ean/my-codes` - Códigos EAN do admin
- `GET /api/admin/ean/products-without-ean` - Produtos sem EAN
  - 🔴 **CRÍTICO**: Geração de códigos únicos, prevenir duplicação

---

## 🔧 ADMIN - CONFIGURAÇÕES

### Admin Config
- `GET/POST /api/admin/config` - Configurações gerais
- `GET/POST /api/admin/config/app` - Config do app
- `GET/POST /api/admin/config/email` - Config de email
- `POST /api/admin/config/email/test` - Testar email
- `GET/POST /api/admin/config/correios` - Config Correios
- `GET/POST /api/admin/company-settings` - Dados da empresa
  - 🔴 **CRÍTICO**: Configurações sensíveis (credenciais, tokens)

### Admin Maintenance
- `GET/POST /api/config/maintenance` - Modo manutenção
- `GET /api/config/maintenance-status` - Status manutenção
- `GET /api/config/public` - Configurações públicas
  - ⚠️ **ATENÇÃO**: Verificar o que é exposto publicamente

---

## 🔧 ADMIN - INTEGRAÇÕES

### AliExpress Integration
- `GET /api/admin/integrations/aliexpress/status` - Status integração
- `POST /api/admin/integrations/aliexpress/configure` - Configurar
- `GET /api/admin/integrations/aliexpress/oauth/authorize` - OAuth
- `GET /api/admin/integrations/aliexpress/oauth/callback` - Callback OAuth
- `POST /api/admin/integrations/aliexpress/search` - Buscar produtos
- `POST /api/admin/integrations/aliexpress/search-products` - Buscar produtos v2
- `POST /api/admin/integrations/aliexpress/import-products` - Importar
- `POST /api/admin/integrations/aliexpress/import-selected` - Importar selecionados
- `POST /api/admin/integrations/aliexpress/import-selected-products` - Importar v2
- `POST /api/admin/integrations/aliexpress/freight-query` - Consultar frete
- `GET /api/admin/integrations/aliexpress/test-product` - Testar produto
- `GET /api/admin/integrations/aliexpress/test-wholesale` - Testar atacado
  - 🔴 **CRÍTICO**: OAuth tokens e credenciais sensíveis

### Mercado Livre Integration
- `GET /api/admin/marketplaces/mercadolivre/status` - Status
- `POST /api/admin/marketplaces/mercadolivre/auth` - Autenticar
- `GET/POST /api/admin/marketplaces/mercadolivre/credentials` - Credenciais
- `GET /api/admin/marketplaces/mercadolivre/list-products` - Listar produtos
  - 🔴 **CRÍTICO**: Tokens OAuth, refresh tokens

### Shopee Integration
- `GET /api/admin/marketplaces/shopee/auth` - Status auth
- `GET /api/admin/marketplaces/shopee/auth/authorize` - Autorizar
- `GET /api/admin/marketplaces/shopee/auth/callback` - Callback
- `GET /api/admin/marketplaces/shopee/products` - Produtos
- `GET /api/admin/marketplaces/shopee/orders` - Pedidos
  - 🔴 **CRÍTICO**: Credenciais e tokens

### TikTok Shop Integration
- `GET /api/admin/marketplaces/tiktokshop/auth` - Auth
- `GET /api/admin/marketplaces/tiktokshop/auth/authorize` - Autorizar
- `GET /api/admin/marketplaces/tiktokshop/callback` - Callback
- `POST /api/admin/marketplaces/tiktokshop/auth/refresh` - Refresh token
- `GET /api/admin/marketplaces/tiktokshop/stats` - Estatísticas

### Marketplace Sync
- `POST /api/admin/marketplaces/sync-all` - Sincronizar todos
  - 🔴 **CRÍTICO**: Operação pesada, rate limiting necessário

### WhatsApp Integration
- `GET/POST /api/admin/integrations/whatsapp/config` - Configurar
- `POST /api/admin/integrations/whatsapp/test` - Testar
- `GET /api/whatsapp/status` - Status
  - ⚠️ **ATENÇÃO**: Credenciais API WhatsApp

---

## 🔧 ADMIN - OUTROS

### Admin Categories
- `GET/POST /api/admin/categories` - Gerenciar categorias
- `PUT/DELETE /api/admin/categories/[id]` - Categoria específica

### Admin Plans
- `GET/POST /api/admin/plans` - Planos de assinatura
- `GET/PUT/DELETE /api/admin/plans/[id]` - Plano específico
- `POST /api/admin/plans/[id]/toggle-status` - Ativar/desativar
- `POST /api/admin/plans/notify` - Notificar sobre planos
- `GET /api/admin/planos` - Listar planos (rota duplicada?)

### Admin Subscriptions
- `GET /api/admin/subscriptions` - Listar assinaturas
- `POST /api/admin/subscriptions/[id]/status` - Alterar status

### Admin Product Types
- `GET/POST /api/admin/product-types` - Tipos de produto
- `GET/PUT/DELETE /api/admin/product-types/[id]` - Tipo específico

### Admin Packaging (Embalagens)
- `GET/POST /api/admin/embalagens` - Gerenciar embalagens
- `PUT/DELETE /api/admin/embalagens/[id]` - Embalagem específica

### Admin Suppliers
- `GET/POST /api/admin/suppliers` - Gerenciar fornecedores
- `GET/PUT/DELETE /api/admin/suppliers/[id]` - Fornecedor específico

### Admin Shipping Rules
- `GET/POST /api/admin/shipping-rules` - Regras de frete
- `GET/PUT/DELETE /api/admin/shipping-rules/[id]` - Regra específica

### Admin Analytics
- `GET /api/admin/analytics` - Analytics gerais
- `GET /api/admin/analytics/vendas` - Analytics de vendas
- `GET /api/admin/company-stats` - Estatísticas da empresa
- `GET /api/admin/performance/metrics` - Métricas de performance

### Admin Fraud Detection
- `GET /api/admin/fraud/suspicious` - Transações suspeitas
- `GET /api/admin/fraud/[id]/details` - Detalhes de fraude
- `POST /api/admin/fraud/[id]/review` - Revisar caso
  - 🔴 **CRÍTICO**: Sistema antifraude, dados sensíveis

### Admin Consistency Check
- `GET /api/admin/consistency/status` - Status consistência
- `POST /api/admin/consistency/check` - Verificar consistência
- `GET /api/admin/consistency/health` - Saúde do sistema
  - ⚠️ **ATENÇÃO**: Pode expor informações sobre arquitetura

### Admin Logs
- `GET /api/admin/logs` - Logs do sistema
  - 🔴 **CRÍTICO**: Pode conter informações sensíveis

### Admin Email
- `GET/POST /api/admin/email` - Configurar email
- `POST /api/admin/email/send` - Enviar email
  - ⚠️ **VULNERÁVEL**: Prevenir uso como relay de spam

### Admin Payment Gateway
- `GET/POST /api/admin/gateway/nubank` - Gateway Nubank
- `GET/POST /api/admin/payment/mercadopago` - Gateway MercadoPago
- `POST /api/admin/payment/mercadopago/test` - Testar MercadoPago
  - 🔴 **CRÍTICO**: Credenciais de pagamento

### Admin Maps
- `GET /api/admin/pedidos/mapa` - Mapa de pedidos

---

## 🔔 WEBHOOKS

### Payment Webhooks
- `POST /api/webhooks/mercadopago` - Webhook MercadoPago
- `POST /api/admin/mercadopago/webhook` - Webhook MercadoPago Admin
  - 🔴 **CRÍTICO**: Validar assinaturas HMAC

### Marketplace Webhooks
- `POST /api/webhooks/mercadolivre` - Webhook Mercado Livre
- `POST /api/webhooks/shopee` - Webhook Shopee
  - 🔴 **CRÍTICO**: Validar tokens de autenticação

---

## 📧 WEBMAIL

### Webmail APIs
- `POST /api/webmail/auth` - Autenticar webmail
- `GET /api/webmail/session` - Sessão atual
- `POST /api/webmail/logout` - Logout
- `GET /api/webmail/emails` - Listar emails
- `POST /api/webmail/send` - Enviar email
  - ⚠️ **VULNERÁVEL**: Verificar autenticação e prevenir spam

---

## 📊 ANALYTICS & TRACKING

### Analytics APIs
- `POST /api/analytics/track` - Rastrear evento (server-side)
- `POST /api/analytics/track-client` - Rastrear evento (client-side)
  - ⚠️ **ATENÇÃO**: Validar dados, prevenir injeção de dados falsos

---

## 🔄 CRON & AUTOMATED TASKS

### Cron Jobs
- `GET /api/cron/sync-payments` - Sincronizar pagamentos
- `GET /api/cron/check-drop-prices` - Verificar preços dropshipping
  - ⚠️ **VULNERÁVEL**: Proteger com token/secret, não expor publicamente

---

## 🧪 DEBUG & TEST

### Debug & Test APIs
- `GET /api/debug/pending-orders` - Debug pedidos pendentes
- `POST /api/test/calculate-sign` - Testar cálculo de assinatura
- `POST /api/test/aliexpress-sign` - Testar assinatura AliExpress
- `POST /api/test/aliexpress-sign-multi` - Testar multi-assinatura
  - 🔴 **CRÍTICO**: REMOVER EM PRODUÇÃO

---

## 🔍 APP PUBLIC

### App Config
- `GET /api/app/config` - Configurações do app
  - ⚠️ **ATENÇÃO**: Não expor dados sensíveis

---

## 📁 FILE UPLOAD

### Upload API
- `POST /api/upload` - Upload de arquivos
  - 🔴 **CRÍTICO**: 
    - Validar tipo de arquivo
    - Limitar tamanho
    - Scan de vírus
    - Prevenir path traversal
    - Verificar autenticação

---

## 🚨 RESUMO DE VULNERABILIDADES CRÍTICAS

### 🔴 CRÍTICO (Ação Imediata)
1. **Todas as rotas /api/admin/\*\*** - Verificar autenticação ADMIN em cada rota
2. **Upload de arquivos** - Validação completa necessária
3. **Webhooks** - Validar assinaturas/tokens de todas as notificações
4. **APIs de pagamento** - Rate limiting, logging, validação forte
5. **Debug/Test endpoints** - REMOVER ou proteger com IP whitelist
6. **Geração de códigos EAN** - Prevenir duplicação e race conditions
7. **Credenciais OAuth** - Criptografar no banco, não logar

### ⚠️ ALTA PRIORIDADE
1. **APIs de vendedor** - Isolamento de dados entre vendedores
2. **Endereços de usuário** - Verificar ownership antes de modificar
3. **Pedidos** - Usuário só vê próprios pedidos
4. **Cron jobs** - Proteger com tokens secretos
5. **Rate limiting** - Implementar em auth, payment, upload

### ℹ️ MÉDIA PRIORIDADE
1. **Logging** - Implementar auditoria em operações financeiras
2. **Input validation** - Validar todos os inputs de usuário
3. **CORS** - Configurar corretamente para ambiente de produção
4. **Webmail** - Adicionar CAPTCHA em envio de emails

---

## ✅ RECOMENDAÇÕES GERAIS

### Segurança
- [ ] Implementar middleware de autenticação global
- [ ] Rate limiting em todas as rotas públicas
- [ ] Logging de operações sensíveis (financeiro, admin)
- [ ] Validação de input com biblioteca (zod, yup)
- [ ] CSRF protection
- [ ] Content Security Policy headers
- [ ] HTTPS obrigatório
- [ ] Secrets em variáveis de ambiente, nunca no código

### Performance
- [ ] Caching de rotas GET públicas
- [ ] Paginação em todas as listagens
- [ ] Índices no banco de dados
- [ ] CDN para arquivos estáticos

### Monitoramento
- [ ] APM (Application Performance Monitoring)
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring
- [ ] Alert system para operações críticas

---

**Total de APIs catalogadas: 188**
**APIs críticas identificadas: ~50**
**APIs com vulnerabilidades potenciais: ~35**
