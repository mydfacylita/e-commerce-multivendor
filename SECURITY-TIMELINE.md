# ⏰ TIMELINE E PRIORIZAÇÃO - CORREÇÕES DE SEGURANÇA

## 📅 VISÃO GERAL DO CRONOGRAMA

```
Semana 1-2: EMERGENCIAL     ████████████████████░░░░░░░░ 70%
Semana 3-4: URGENTE         ████████████████░░░░░░░░░░░░ 60%
Semana 5-6: IMPORTANTE      ████████░░░░░░░░░░░░░░░░░░░░ 30%
Semana 7+:  CONTÍNUO        ████████████████████████████ ONGOING
```

**Objetivo:** Reduzir de 31.4% para <10% de APIs vulneráveis em 60 dias

---

## 🔥 SEMANA 1-2: EMERGENCIAL (17-31 Jan)

### DIA 1-2: Webhooks (CRÍTICO)

**Tempo estimado:** 8-12 horas  
**Responsável:** Backend Lead  
**Impacto:** 🔴 CRÍTICO - Previne fraudes em pagamentos

**Tasks:**
- [ ] Criar `lib/webhook-validation.ts` com validação HMAC
- [ ] Implementar em `/api/payment/webhook`
- [ ] Implementar em `/api/webhooks/mercadopago`
- [ ] Implementar em `/api/webhooks/mercadolivre`
- [ ] Implementar em `/api/admin/mercadopago/webhook`
- [ ] Testar com payloads reais dos gateways
- [ ] Documentar configuração de webhook secrets

**Validação:**
```bash
# Testar webhook com assinatura válida
curl -X POST https://api.mydshop.com.br/api/payment/webhook \
  -H "x-signature: ts=1234567890,v1=abc123..." \
  -H "x-request-id: req-123" \
  -d '{"data":{"id":"123"}}'

# Deve retornar 200 OK

# Testar com assinatura inválida
curl -X POST https://api.mydshop.com.br/api/payment/webhook \
  -H "x-signature: ts=1234567890,v1=INVALID" \
  -H "x-request-id: req-123" \
  -d '{"data":{"id":"123"}}'

# Deve retornar 401 Unauthorized
```

**Critério de sucesso:**
- ✅ 100% dos webhooks validando assinaturas
- ✅ Testes passando com assinaturas válidas/inválidas
- ✅ Logs registrando tentativas de webhook inválido

---

### DIA 3-4: Auditoria Financeira

**Tempo estimado:** 12-16 horas  
**Responsável:** Backend Senior  
**Impacto:** 🔴 CRÍTICO - Conformidade legal e rastreamento de fraudes

**Tasks:**

#### Database (2h)
- [ ] Criar migration para tabela `AuditLog`
- [ ] Criar migration para tabela `ApiLog`
- [ ] Executar migrations em staging
- [ ] Executar migrations em produção

```bash
# Criar migration
npx prisma migrate dev --name add_audit_logs

# Aplicar em produção
npx prisma migrate deploy
```

#### Código (8h)
- [ ] Criar `lib/audit.ts` com helpers
- [ ] Criar `lib/api-logger.ts` com logging
- [ ] Implementar auditoria em 15 APIs financeiras críticas:
  - `/api/admin/financeiro/refund`
  - `/api/admin/financeiro/aprovar-pagamento`
  - `/api/admin/saques/[id]/aprovar`
  - `/api/admin/saques/[id]/pagar`
  - `/api/admin/saques/[id]/concluir`
  - `/api/admin/saques/[id]/rejeitar`
  - `/api/payment/create`
  - ... outras APIs críticas

#### Testes (4h)
- [ ] Testar criação de audit logs
- [ ] Verificar dados sensíveis não são logados
- [ ] Testar query de auditoria

**Validação:**
```sql
-- Verificar logs de auditoria sendo criados
SELECT * FROM "AuditLog" 
WHERE action LIKE '%REFUND%' 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- Verificar que senhas não estão sendo logadas
SELECT * FROM "AuditLog" 
WHERE "metadata"::text LIKE '%password%';
-- Deve retornar 0 resultados ou com valores REDACTED
```

**Critério de sucesso:**
- ✅ Todas operações financeiras gerando audit log
- ✅ Dados sensíveis sanitizados
- ✅ Dashboard básico de auditoria funcionando

---

### DIA 5-6: Upload e Debug Endpoints

**Tempo estimado:** 6-8 horas  
**Responsável:** Full Stack Dev  
**Impacto:** 🔴 ALTO - Previne uploads maliciosos e exposição de dados

**Tasks - Upload (4h):**
- [ ] Adicionar autenticação em `/api/upload`
- [ ] Implementar rate limiting (10/min)
- [ ] Adicionar logging de uploads
- [ ] Adicionar validação de extensão de arquivo
- [ ] Considerar scan de vírus (ClamAV)

**Tasks - Debug (2h):**
- [ ] Proteger `/api/debug/pending-orders` com role ADMIN
- [ ] Remover ou proteger `/api/test/*` endpoints
- [ ] Adicionar verificação de NODE_ENV em endpoints debug

**Validação:**
```bash
# Testar upload sem autenticação
curl -X POST https://api.mydshop.com.br/api/upload \
  -F "file=@test.jpg"
# Deve retornar 401

# Testar debug endpoint sem ser admin
curl https://api.mydshop.com.br/api/debug/pending-orders
# Deve retornar 403 ou 404

# Testar rate limit de upload (11 uploads em 1 min)
for i in {1..11}; do
  curl -X POST https://api.mydshop.com.br/api/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test.jpg"
done
# 11º deve retornar 429
```

**Critério de sucesso:**
- ✅ Upload requer autenticação
- ✅ Rate limiting funcionando
- ✅ Debug endpoints protegidos ou removidos
- ✅ Logs de upload registrados

---

### DIA 7-10: Role Checks em APIs Admin (Parte 1)

**Tempo estimado:** 16-20 horas  
**Responsável:** Time completo (dividir tasks)  
**Impacto:** 🔴 CRÍTICO - Previne escalada de privilégios

**Preparação (4h):**
- [ ] Criar `lib/auth-middleware.ts` com helpers
- [ ] Criar testes unitários para middleware
- [ ] Documentar uso do middleware

**Implementação (12h) - Dividir entre devs:**

**Dev 1 - APIs Financeiras (4h):**
- [ ] `/api/admin/financeiro/*` (8 rotas)

**Dev 2 - APIs de Pedidos (4h):**
- [ ] `/api/admin/orders/*` (6 rotas)
- [ ] `/api/admin/expedicao/*` (7 rotas)

**Dev 3 - APIs de Produtos e Integrações (4h):**
- [ ] `/api/admin/products/*` (8 rotas)
- [ ] `/api/admin/integrations/*` (12 rotas)

**Code Review e Testes (4h):**
- [ ] Review cruzado de todas as mudanças
- [ ] Testes de integração
- [ ] Deploy em staging

**Validação:**
```bash
# Script de teste automatizado
#!/bin/bash

ADMIN_TOKEN="..."
SELLER_TOKEN="..."
CUSTOMER_TOKEN="..."

# Testar com cada tipo de token
for endpoint in $(cat admin_endpoints.txt); do
  echo "Testing $endpoint"
  
  # Admin deve ter acesso
  curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "https://api.mydshop.com.br$endpoint"
  # Deve retornar 200 ou 201
  
  # Seller NÃO deve ter acesso
  curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $SELLER_TOKEN" \
    "https://api.mydshop.com.br$endpoint"
  # Deve retornar 403
done
```

**Critério de sucesso:**
- ✅ 100% das APIs admin verificando role
- ✅ Testes automatizados passando
- ✅ Zero regressões em funcionalidades existentes

---

## 🟠 SEMANA 3-4: URGENTE (1-14 Fev)

### SEMANA 3: Role Checks (Parte 2) + Rate Limiting

**Tasks:**

**Role Checks restantes (20h):**
- [ ] APIs de Sellers (`/api/admin/sellers/*`)
- [ ] APIs de Saques (`/api/admin/saques/*`)
- [ ] APIs de EAN (`/api/admin/ean/*`)
- [ ] APIs de Configurações (`/api/admin/config/*`)
- [ ] APIs de Marketplaces (`/api/admin/marketplaces/*`)

**Rate Limiting Global (16h):**

**Setup (4h):**
- [ ] Criar conta Upstash Redis
- [ ] Configurar variáveis de ambiente
- [ ] Instalar `@upstash/ratelimit`
- [ ] Criar `lib/rate-limit.ts`

**Implementação (8h):**
- [ ] `/api/payment/*` - 5 requests/min
- [ ] `/api/upload` - 10 uploads/min (já feito)
- [ ] `/api/orders` - 5 orders/min
- [ ] `/api/auth/login` - 5 tentativas/15min (já existe)
- [ ] `/api/auth/register` - 5 registros/hora (já existe)
- [ ] APIs públicas - 100 requests/min

**Testes (4h):**
- [ ] Testes de carga
- [ ] Verificar headers de rate limit
- [ ] Testar reset de limites

**Validação:**
```bash
# Teste de rate limit
for i in {1..6}; do
  echo "Request $i:"
  curl -i https://api.mydshop.com.br/api/payment/create \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"amount": 100}'
  sleep 1
done

# 6º request deve retornar:
# HTTP/1.1 429 Too Many Requests
# X-RateLimit-Limit: 5
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: 1234567890
```

---

### SEMANA 4: Validação com Zod

**Tempo estimado:** 24-30 horas  
**Impacto:** 🟠 ALTO - Previne dados inválidos e ataques de injeção

**Preparação (6h):**
- [ ] Instalar Zod
- [ ] Criar `lib/validation-schemas.ts`
- [ ] Definir schemas para todos os DTOs principais:
  - `refundSchema`
  - `withdrawalSchema`
  - `productSchema`
  - `orderSchema`
  - `userSchema`
  - `addressSchema`

**Implementação (16h) - Dividir por área:**

**APIs Financeiras (6h):**
- [ ] `/api/admin/financeiro/*`
- [ ] `/api/payment/*`
- [ ] `/api/admin/saques/*`

**APIs de Produtos e Pedidos (6h):**
- [ ] `/api/admin/products/*`
- [ ] `/api/orders/*`
- [ ] `/api/seller/products/*`

**APIs de Usuário (4h):**
- [ ] `/api/user/*`
- [ ] `/api/seller/*`

**Testes (8h):**
- [ ] Testes unitários para cada schema
- [ ] Testes de integração
- [ ] Validar mensagens de erro user-friendly

**Validação:**
```typescript
// Teste de validação
describe('refundSchema', () => {
  it('deve aceitar dados válidos', () => {
    const valid = { paymentId: '123', amount: 100 };
    expect(refundSchema.parse(valid)).toEqual(valid);
  });
  
  it('deve rejeitar paymentId vazio', () => {
    const invalid = { paymentId: '', amount: 100 };
    expect(() => refundSchema.parse(invalid)).toThrow();
  });
  
  it('deve rejeitar amount negativo', () => {
    const invalid = { paymentId: '123', amount: -100 };
    expect(() => refundSchema.parse(invalid)).toThrow();
  });
});
```

**Critério de sucesso:**
- ✅ 80% das APIs críticas com validação Zod
- ✅ Mensagens de erro padronizadas
- ✅ Documentação de schemas atualizada

---

## 🟡 SEMANA 5-6: IMPORTANTE (15-28 Fev)

### SEMANA 5: Ownership Verification

**Tempo estimado:** 20-24 horas  
**Impacto:** 🟡 MÉDIO-ALTO - Previne acesso a dados de outros usuários

**Criação de Helpers (6h):**
- [ ] Criar `lib/ownership.ts`
- [ ] Implementar funções de verificação:
  - `verifyOrderOwnership()`
  - `verifyAddressOwnership()`
  - `verifyWithdrawalOwnership()`
  - `verifyProductOwnership()`

**Implementação (12h):**

**APIs de Usuário (4h):**
- [ ] `/api/user/addresses/[id]` (PUT/DELETE)
- [ ] `/api/orders/[id]` (GET/PUT)

**APIs de Vendedor (4h):**
- [ ] `/api/vendedor/saques/[id]/*`
- [ ] `/api/seller/products/[id]`

**APIs de Pedidos (4h):**
- [ ] Verificar que usuário só vê próprios pedidos
- [ ] Verificar que vendedor só vê pedidos de seus produtos

**Testes (6h):**
- [ ] Testes de ownership positivos e negativos
- [ ] Testes com ADMIN (deve ter acesso total)

**Validação:**
```bash
# Usuário A tenta acessar pedido do Usuário B
curl -H "Authorization: Bearer $USER_A_TOKEN" \
  https://api.mydshop.com.br/api/orders/$USER_B_ORDER_ID
# Deve retornar 403

# Admin tenta acessar pedido de qualquer usuário
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.mydshop.com.br/api/orders/$USER_B_ORDER_ID
# Deve retornar 200
```

---

### SEMANA 6: Logging e Monitoramento

**Tempo estimado:** 20-24 horas  
**Impacto:** 🟡 MÉDIO - Visibilidade e rastreamento

**Setup de Ferramentas (6h):**
- [ ] Configurar Sentry para error tracking
- [ ] Configurar Datadog ou alternativa para APM
- [ ] Configurar Better Stack para logs

**Implementação de Logging (10h):**
- [ ] Wrapper `withLogging()` para todas as rotas
- [ ] Logging estruturado com níveis (INFO, WARN, ERROR)
- [ ] Dashboard de logs no admin

**Alertas (4h):**
- [ ] Alerta: >10 tentativas de login falhas em 5min
- [ ] Alerta: Webhook com assinatura inválida
- [ ] Alerta: Operação financeira >R$ 10.000
- [ ] Alerta: Taxa de erro >5% em APIs críticas

**Testes (4h):**
- [ ] Verificar logs sendo gerados
- [ ] Testar alertas
- [ ] Verificar performance (overhead de logging)

---

## 🔄 SEMANA 7+: CONTÍNUO

### Semana 7-8: Testes e Documentação

**Testes de Segurança (16h):**
- [ ] Testes de autenticação
- [ ] Testes de autorização
- [ ] Testes de rate limiting
- [ ] Testes de validação
- [ ] Testes de ownership

**Documentação (8h):**
- [ ] Atualizar README com padrões de segurança
- [ ] Documentar todos os middlewares
- [ ] Criar guia de onboarding de segurança
- [ ] Documentar processo de code review

**Ferramentas de CI/CD (8h):**
- [ ] Adicionar linting de segurança (eslint-plugin-security)
- [ ] Adicionar SAST (Snyk, SonarQube)
- [ ] Adicionar verificação de dependências vulneráveis

---

### Semana 9+: Otimização e Monitoramento

**Performance (16h):**
- [ ] Otimizar queries de auditoria
- [ ] Implementar cache em Redis
- [ ] Otimizar validações pesadas

**Hardening (Contínuo):**
- [ ] Security headers avançados
- [ ] CSRF protection
- [ ] Content Security Policy
- [ ] CORS refinement

**Auditoria Regular:**
- [ ] Re-executar script de auditoria mensalmente
- [ ] Revisar logs de segurança semanalmente
- [ ] Atualizar dependências com vulnerabilidades

---

## 📊 MÉTRICAS DE SUCESSO

### KPIs por Semana

| Semana | Vulnerabilidades | APIs Seguras | Auditoria | Rate Limit |
|--------|------------------|--------------|-----------|------------|
| 0 (Atual) | 59 (31.4%) | 9 (4.8%) | ~20% | ~10% |
| 1-2 | 45 (24%) | 25 (13%) | 50% | 20% |
| 3-4 | 30 (16%) | 50 (27%) | 80% | 50% |
| 5-6 | 18 (10%) | 80 (43%) | 100% | 70% |
| 7-8 | 10 (5%) | 120 (64%) | 100% | 90% |
| 12+ | <5 (<3%) | 150+ (80%) | 100% | 100% |

### Objetivos Finais (60 dias)

- ✅ <10% APIs vulneráveis
- ✅ >60% APIs seguras
- ✅ 100% APIs financeiras com auditoria
- ✅ 90% APIs com rate limiting
- ✅ 80% APIs com validação Zod
- ✅ Zero incidentes de segurança
- ✅ Tempo de resposta médio <200ms (após otimizações)

---

## 🎯 PRIORIZAÇÃO POR IMPACTO x ESFORÇO

```
Alto Impacto, Baixo Esforço          Alto Impacto, Alto Esforço
┌────────────────────────┬──────────────────────────┐
│ • Webhooks             │ • Role Checks (132 APIs) │
│ • Upload Auth          │ • Validação Zod          │
│ • Debug Endpoints      │ • Auditoria Completa     │
│ [FAZER PRIMEIRO]       │ [FAZER EM SEGUIDA]       │
├────────────────────────┼──────────────────────────┤
│ • Security Headers     │ • Testes de Segurança    │
│ • CORS Config          │ • Performance Tuning     │
│ [FAZER DEPOIS]         │ [FAZER POR ÚLTIMO]       │
└────────────────────────┴──────────────────────────┘
Baixo Impacto, Baixo Esforço       Baixo Impacto, Alto Esforço
```

---

## 👥 ALOCAÇÃO DE TIME

### Estrutura Sugerida

**Fase Emergencial (Semana 1-2):**
- 2 Devs Backend Senior (full-time)
- 1 Dev Full Stack (50%)
- 1 QA (50%)
- 1 DevOps (consultor)

**Fase Urgente (Semana 3-4):**
- 3 Devs (full-time)
- 1 QA (full-time)
- 1 DevOps (50%)

**Fase Importante (Semana 5-6):**
- 2 Devs (full-time)
- 1 QA (50%)

**Fase Contínua (Semana 7+):**
- Time regular + 20% tempo dedicado a segurança

---

## 📞 COMUNICAÇÃO E ALINHAMENTO

### Daily Standup (15min)
- O que foi feito ontem
- O que será feito hoje
- Bloqueios

### Weekly Review (1h, Sextas)
- Revisar progresso do checklist
- Ajustar prioridades
- Resolver bloqueios

### Sprint Demo (2h, a cada 2 semanas)
- Demonstrar correções implementadas
- Executar testes de segurança ao vivo
- Coletar feedback

---

## 🚀 DEPLOYMENT STRATEGY

### Estratégia de Rollout

1. **Staging First** (sempre)
2. **Gradual Rollout** para produção:
   - 10% de tráfego (1 dia)
   - 50% de tráfego (2 dias)
   - 100% de tráfego
3. **Rollback Plan** sempre pronto
4. **Monitoring** intensivo nas primeiras 48h

### Feature Flags

Usar feature flags para:
- Rate limiting
- Validação Zod strict mode
- Logging verbosity

---

**Criado em:** 16 de Janeiro de 2026  
**Última atualização:** 16 de Janeiro de 2026  
**Próxima revisão:** 23 de Janeiro de 2026
