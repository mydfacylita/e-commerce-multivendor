# 🔐 Auditoria de Segurança - APIs Next.js

**Data da Auditoria:** 7 de Fevereiro de 2026  
**Projeto:** e-comece (Módulo E-commerce)  
**Caminho:** `c:\xampp\htdocs\myd_adm\Modules\e-comece\app\api`  
**Total de Rotas:** 284 rotas

---

## 📊 Resumo Executivo

| Classificação | Quantidade | Descrição |
|--------------|------------|-----------|
| ✅ PÚBLICA (OK) | 35 | Webhooks, auth, dados públicos |
| 🔒 PROTEGIDA (OK) | 180+ | Já tem autenticação adequada |
| 🚨 CRÍTICA | 15 | **PRECISA DE AUTH URGENTE** |
| ⚠️ REVISAR | 25 | Pode precisar de proteção adicional |

---

## 🚨 ROTAS CRÍTICAS - AÇÃO IMEDIATA NECESSÁRIA

### `/api/debug/*` - BLOQUEAR EM PRODUÇÃO
| Rota | Status | Ação Necessária |
|------|--------|-----------------|
| `/api/debug/expedition` | 🚨 SEM AUTH | **BLOQUEAR** - Expõe pedidos e dados de expedição |
| `/api/debug/pending-orders` | 🚨 SEM AUTH | **BLOQUEAR** - Lista pedidos pendentes com dados sensíveis |

**Vulnerabilidade:** Endpoints de debug sem autenticação expõem dados sensíveis do negócio.

**Correção:** Adicionar verificação de ambiente + autenticação:
```typescript
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Não disponível' }, { status: 404 })
}
const session = await getServerSession(authOptions)
if (!session?.user || session.user.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}
```

---

### `/api/test/*` - BLOQUEAR EM PRODUÇÃO
| Rota | Status | Ação Necessária |
|------|--------|-----------------|
| `/api/test/aliexpress-sign` | 🚨 SEM AUTH | **BLOQUEAR** - Expõe lógica de assinatura AliExpress |
| `/api/test/aliexpress-sign-multi` | 🚨 SEM AUTH | **BLOQUEAR** - Expõe App Secret no código |
| `/api/test/calculate-sign` | 🚨 SEM AUTH | **BLOQUEAR** - Permite calcular assinaturas |

**Vulnerabilidade GRAVE:** Expõe credenciais de API (App Secret) no código-fonte!

**Correção URGENTE:**
1. Remover hardcoded secrets do código
2. Bloquear endpoints em produção
3. Adicionar autenticação admin

---

### `/api/upload` - UPLOAD DE ARQUIVOS SEM AUTH
| Rota | Status | Ação Necessária |
|------|--------|-----------------|
| `/api/upload` | 🚨 SEM AUTH | **ADICIONAR AUTH** - Permite upload de arquivos sem login |

**Vulnerabilidade:** Qualquer pessoa pode fazer upload de arquivos para o servidor.

**Correção:**
```typescript
const session = await getServerSession(authOptions)
if (!session?.user) {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}
```

---

### `/api/image/remove-background` - SEM AUTH
| Rota | Status | Ação Necessária |
|------|--------|-----------------|
| `/api/image/remove-background` | 🚨 SEM AUTH | **ADICIONAR AUTH** - Usa API externa que pode ter custos |

**Vulnerabilidade:** Permite uso da API remove.bg (paga) sem autenticação.

---

### `/api/admin/*` - ROTAS SEM AUTH NO GET
| Rota | Status | Ação Necessária |
|------|--------|-----------------|
| `/api/admin/categories` (GET) | 🚨 SEM AUTH | **ADICIONAR AUTH** - Lista categorias do admin |
| `/api/admin/product-types` (GET) | 🚨 SEM AUTH | **ADICIONAR AUTH** - Lista tipos de produtos |
| `/api/admin/products/[id]` (GET) | 🚨 SEM AUTH | **ADICIONAR AUTH** - Expõe dados internos de produtos |
| `/api/admin/suppliers` (GET) | 🚨 SEM AUTH | **ADICIONAR AUTH** - Lista fornecedores |
| `/api/admin/embalagens` (GET) | 🚨 SEM AUTH | **ADICIONAR AUTH** - Lista embalagens |
| `/api/admin/consistency/status` (GET) | 🚨 SEM AUTH | **ADICIONAR AUTH** - Expõe status do sistema |
| `/api/admin/consistency/check` (GET) | 🚨 SEM AUTH | **ADICIONAR AUTH** - Informações do sistema |

---

## ⚠️ ROTAS QUE PRECISAM REVISÃO

### `/api/cron/*` - VALIDAÇÃO DE SECRET
| Rota | Status Atual | Ação Recomendada |
|------|-------------|------------------|
| `/api/cron/sync-payments` | ⚠️ CRON_SECRET | OK - Mas verificar implementação |
| `/api/cron/check-drop-prices` | ⚠️ CRON_SECRET | OK - Mas verificar implementação |
| `/api/cron/sync-aliexpress-stock` | ⚠️ CRON_SECRET | OK - Mas verificar implementação |
| `/api/cron/sync-drop-orders` | ⚠️ SEM SECRET | **ADICIONAR** validação CRON_SECRET |

**Recomendação:** Verificar se todos os crons validam CRON_SECRET antes de executar.

---

### `/api/image/*` - PROXY DE IMAGENS
| Rota | Status | Risco |
|------|--------|-------|
| `/api/image/proxy` | ⚠️ SEM AUTH | Pode ser abusado como proxy aberto (SSRF) |
| `/api/image/[...path]` | ⚠️ SEM AUTH | Verificar se há restrição de paths |

**Recomendação:** Adicionar rate limiting + validação de domínios permitidos.

---

### `/api/shipping/tracking` - RASTREAMENTO
| Rota | Status | Risco |
|------|--------|-------|
| `/api/shipping/tracking` | ⚠️ SEM AUTH | Pode ser abusado para consultas em massa |

**Recomendação:** Adicionar rate limiting por IP.

---

### `/api/products/search` - BUSCA
| Rota | Status | Notas |
|------|--------|-------|
| `/api/products/search` | ⚠️ Rate Limit apenas | OK - Tem rate limiting implementado |

---

### `/api/feeds/*` - FEEDS EXTERNOS
| Rota | Status | Notas |
|------|--------|-------|
| `/api/feeds/google-shopping` | ⚠️ SEM AUTH | OK para crawlers, mas sem proteção |
| `/api/feeds/google-shopping-txt` | ⚠️ SEM AUTH | OK para crawlers, mas considerar token |

**Recomendação:** Adicionar token de validação nos feeds.

---

### `/api/webmail/*` - SISTEMA DE EMAIL
| Rota | Status | Notas |
|------|--------|-------|
| `/api/webmail/auth` | ⚠️ REVISAR | Executa `doveadm` - risco de command injection |
| `/api/webmail/send` | 🔒 Cookie auth | OK - Usa cookie de sessão |
| `/api/webmail/emails` | 🔒 Cookie auth | OK |
| `/api/webmail/session` | 🔒 Cookie auth | OK |
| `/api/webmail/logout` | 🔒 Cookie auth | OK |

---

## 🔒 ROTAS PROTEGIDAS (OK)

### `/api/admin/*` - Autenticação Admin
A maioria das rotas admin está corretamente protegida com:
```typescript
const session = await getServerSession(authOptions)
if (!session?.user || session.user.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}
```

| Área | Rotas Protegidas |
|------|------------------|
| `/api/admin/users` | ✅ |
| `/api/admin/orders/*` | ✅ (maioria) |
| `/api/admin/invoices` | ✅ |
| `/api/admin/analytics` | ✅ |
| `/api/admin/financeiro/*` | ✅ |
| `/api/admin/expedicao/*` | ✅ |
| `/api/admin/config/*` | ✅ (maioria) |
| `/api/admin/sellers/*` | ✅ |
| `/api/admin/saques/*` | ✅ |
| `/api/admin/coupons/*` | ✅ |
| `/api/admin/returns/*` | ✅ |
| `/api/admin/refunds/*` | ✅ |
| `/api/admin/fraud/*` | ✅ |
| `/api/admin/marketplaces/*` | ✅ |
| `/api/admin/integrations/*` | ✅ |
| `/api/admin/ean/*` | ✅ |
| `/api/admin/etiquetas/*` | ✅ |
| `/api/admin/plans/*` | ✅ |
| `/api/admin/subscriptions/*` | ✅ |
| `/api/admin/logs` | ✅ |

---

### `/api/user/*` - Autenticação Usuário
| Rota | Status | Método de Auth |
|------|--------|---------------|
| `/api/user/profile` | 🔒 | authenticateRequest |
| `/api/user/addresses` | 🔒 | authenticateRequest (requer API Key) |
| `/api/user/addresses/[id]` | 🔒 | getServerSession |
| `/api/user/addresses/[id]/default` | 🔒 | getServerSession |
| `/api/user/avatar` | 🔒 | JWT Secret |
| `/api/user/address` | 🔒 | JWT Secret |

---

### `/api/seller/*` - Autenticação Vendedor
| Rota | Status |
|------|--------|
| `/api/seller/account` | 🔒 |
| `/api/seller/account/transfer` | 🔒 |
| `/api/seller/account/transactions` | 🔒 |
| `/api/seller/register` | 🔒 |
| `/api/seller/subscription/*` | 🔒 |
| `/api/seller/financial` | 🔒 |
| `/api/seller/employees/*` | 🔒 |
| `/api/seller/permissions` | 🔒 |
| `/api/seller/plans/available` | 🔒 |
| `/api/seller/marketplaces/*` | 🔒 |

---

### `/api/vendedor/*` - Autenticação Vendedor
| Rota | Status |
|------|--------|
| `/api/vendedor/expedicao` | 🔒 |
| `/api/vendedor/expedicao/[id]/*` | 🔒 |
| `/api/vendedor/saques` | 🔒 |
| `/api/vendedor/balance` | 🔒 |
| `/api/vendedor/perguntas` | 🔒 |
| `/api/vendedor/ean/*` | 🔒 |

---

### `/api/orders/*` - Pedidos
| Rota | Status | Método de Auth |
|------|--------|---------------|
| `/api/orders` (POST) | 🔒 | API Key + JWT/Session |
| `/api/orders/[id]` | 🔒 | Session + JWT |
| `/api/orders/[id]/cancel` | 🔒 | |
| `/api/orders/[id]/update` | 🔒 | |
| `/api/orders/tracking` | ⚠️ | Verificar |

---

### `/api/payment/*` - Pagamentos
| Rota | Status |
|------|--------|
| `/api/payment/create` | 🔒 |
| `/api/payment/create-card` | 🔒 |
| `/api/payment/details/[id]` | 🔒 |
| `/api/payment/order-payments/[id]` | 🔒 |
| `/api/payment/webhook` | ✅ PÚBLICO (webhook) |
| `/api/payment/gateways` | ⚠️ Verificar |
| `/api/payment/installments-rules` | ⚠️ Verificar |
| `/api/payment/public-key` | ✅ PÚBLICO |

---

## ✅ ROTAS PÚBLICAS (OK - Corretas)

### `/api/auth/*` - Autenticação
| Rota | Status | Motivo |
|------|--------|--------|
| `/api/auth/[...nextauth]` | ✅ PÚBLICO | NextAuth handler |
| `/api/auth/login` | ✅ PÚBLICO | Login (valida API Key) |
| `/api/auth/register` | ✅ PÚBLICO | Registro |
| `/api/auth/forgot-password` | ✅ PÚBLICO | Recuperação senha |
| `/api/auth/reset-password` | ✅ PÚBLICO | Reset senha |
| `/api/auth/validate-reset-token` | ✅ PÚBLICO | Validação token |

---

### `/api/webhooks/*` - Webhooks Externos
| Rota | Status | Proteção |
|------|--------|----------|
| `/api/webhooks/mercadopago` | ✅ PÚBLICO | Validação HMAC |
| `/api/webhooks/mercadolivre` | ✅ PÚBLICO | Validação assinatura |
| `/api/webhooks/shopee` | ✅ PÚBLICO | Validação assinatura |
| `/api/webhooks/whatsapp` | ✅ PÚBLICO | Validação Meta |

---

### `/api/public/*` - Dados Públicos
| Rota | Status |
|------|--------|
| `/api/public/categories` | ✅ PÚBLICO |

---

### `/api/products/*` - Produtos (Leitura Pública)
| Rota | Status | Notas |
|------|--------|-------|
| `/api/products/[id]` | ✅ PÚBLICO | API Key + Rate Limit |
| `/api/products/paginated` | ✅ PÚBLICO | API Key |
| `/api/products/search` | ✅ PÚBLICO | Rate Limit |
| `/api/products/[id]/reviews` (GET) | ✅ PÚBLICO | Avaliações |
| `/api/products/[id]/reviews` (POST) | 🔒 | Requer auth |
| `/api/products/[id]/questions` (GET) | ✅ PÚBLICO | Perguntas |
| `/api/products/[id]/questions` (POST) | 🔒 | Requer auth |

---

### `/api/categories/*` - Categorias
| Rota | Status |
|------|--------|
| `/api/categories` | ✅ PÚBLICO | API Key |
| `/api/categories/[id]/products/count` | ✅ PÚBLICO | |

---

### `/api/location/*` - Localização
| Rota | Status |
|------|--------|
| `/api/location/states` | ✅ PÚBLICO |
| `/api/location/cities/[stateId]` | ✅ PÚBLICO |

---

### `/api/config/*` - Configuração Pública
| Rota | Status |
|------|--------|
| `/api/config` | ⚠️ Verificar |
| `/api/config/public` | ✅ PÚBLICO |
| `/api/config/maintenance` | ✅ PÚBLICO (middleware) |
| `/api/config/maintenance-status` | ✅ PÚBLICO |

---

### `/api/shipping/*` - Frete
| Rota | Status | Proteção |
|------|--------|----------|
| `/api/shipping/quote` | ✅ PÚBLICO | API Key |
| `/api/shipping/calculate` | ✅ PÚBLICO | API Key |
| `/api/shipping/free-shipping-info` | ✅ PÚBLICO | |
| `/api/shipping/correios` | ⚠️ Verificar | |

---

### `/api/coupons/*` - Cupons
| Rota | Status |
|------|--------|
| `/api/coupons/validate` | ✅ PÚBLICO | Validação de cupom |

---

### `/api/analytics/*` - Analytics
| Rota | Status |
|------|--------|
| `/api/analytics/track` | ⚠️ API Key | Tracking |
| `/api/analytics/track-client` | ⚠️ Verificar | |

---

### `/api/app/*` - Configuração App
| Rota | Status |
|------|--------|
| `/api/app/config` | ✅ PÚBLICO | API Key |

---

### `/api/cashback/*` - Cashback
| Rota | Status |
|------|--------|
| `/api/cashback` | 🔒 | Session |
| `/api/cashback/transactions` | 🔒 | Session |

---

### `/api/returns/*` - Devoluções
| Rota | Status |
|------|--------|
| `/api/returns/request` | 🔒 | Session |

---

### `/api/marketplaces/*` - OAuth
| Rota | Status |
|------|--------|
| `/api/marketplaces/oauth-config` | 🔒 | Session |

---

### `/api/packaging` - Embalagens
| Rota | Status |
|------|--------|
| `/api/packaging` | ✅ | API Key (todos os métodos) |

---

### `/api/invoices/*` - Notas Fiscais
| Rota | Status | Proteção |
|------|--------|----------|
| `/api/invoices/[id]/xml` | ⚠️ Token | Token do pedido |
| `/api/invoices/[id]/danfe` | ⚠️ | Verificar |

---

### `/api/whatsapp/*` - WhatsApp
| Rota | Status |
|------|--------|
| `/api/whatsapp/status` | 🔒 | Session |

---

## 📋 AÇÕES PRIORITÁRIAS

### 🔴 URGENTE (Esta semana)
1. **BLOQUEAR `/api/debug/*`** em produção
2. **BLOQUEAR `/api/test/*`** em produção
3. **REMOVER SECRETS** hardcoded do código
4. Adicionar auth em `/api/upload`
5. Adicionar auth em `/api/image/remove-background`

### 🟠 ALTA PRIORIDADE (2 semanas)
1. Adicionar auth no GET de:
   - `/api/admin/categories`
   - `/api/admin/product-types`
   - `/api/admin/products/[id]`
   - `/api/admin/suppliers`
   - `/api/admin/embalagens`
   - `/api/admin/consistency/status`
   - `/api/admin/consistency/check`

2. Validar CRON_SECRET em `/api/cron/sync-drop-orders`

### 🟡 MÉDIA PRIORIDADE (1 mês)
1. Adicionar rate limiting em:
   - `/api/image/proxy`
   - `/api/shipping/tracking`

2. Revisar proteção de webhooks (verificar validação de assinatura)

3. Adicionar tokens nos feeds Google Shopping

### 🟢 BAIXA PRIORIDADE (Backlog)
1. Revisar `/api/webmail/auth` para prevenir command injection
2. Documentar política de segurança de APIs
3. Implementar audit trail para operações sensíveis

---

## 🔧 Padrões de Autenticação Usados

### 1. Session NextAuth (Web)
```typescript
const session = await getServerSession(authOptions)
if (!session?.user) {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}
```

### 2. API Key (Apps Externos)
```typescript
const apiKey = req.headers.get('x-api-key')
const validation = await validateApiKey(apiKey)
if (!validation.valid) {
  return NextResponse.json({ error: 'API Key inválida' }, { status: 401 })
}
```

### 3. JWT Token (App Mobile)
```typescript
const authHeader = req.headers.get('authorization')
const tokenValidation = await validateUserToken(authHeader)
if (!tokenValidation.valid) {
  return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
}
```

### 4. Híbrido (Web + Mobile)
```typescript
const auth = await authenticateRequest(request, {
  requireApiKey: true,
  requireAuth: true
});
if (!auth.authenticated) {
  return auth.response;
}
```

### 5. CRON Secret
```typescript
const cronSecret = process.env.CRON_SECRET
const authHeader = req.headers.get('authorization')
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}
```

---

## 📈 Métricas de Segurança

| Métrica | Valor |
|---------|-------|
| Rotas Totais | 284 |
| Rotas Protegidas | ~85% |
| Rotas Críticas | 15 (~5%) |
| Rotas para Revisar | 25 (~9%) |

---

**Próxima Auditoria Recomendada:** Março 2026

**Responsável:** Equipe de Desenvolvimento  
**Aprovação:** Arquiteto de Segurança
