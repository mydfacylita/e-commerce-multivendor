# 📋 Governança de APIs - MyD Shop

> **Objetivo:** Evitar proliferação descontrolada de endpoints e garantir segurança, manutenibilidade e consistência no desenvolvimento de APIs.

## 🚫 REGRA DE OURO

**ANTES DE CRIAR UMA NOVA API, PERGUNTE:**
1. ✅ Já existe uma API que faz isso?
2. ✅ Posso estender uma API existente?
3. ✅ Esta funcionalidade realmente precisa de um endpoint dedicado?
4. ✅ Revisei o [API-CATALOG.md](API-CATALOG.md)?

---

## 📊 SITUAÇÃO ATUAL DO SISTEMA

**Estatísticas (Janeiro 2026):**
- 📌 **188 APIs catalogadas** no sistema
- 🔴 **59 APIs vulneráveis** (31.4%)
- 🟡 **120 APIs parcialmente seguras** (63.8%)
- 🟢 **9 APIs seguras** (4.8%)
- 💰 **Risco estimado:** R$ 10M - R$ 50M+

**Problemas Identificados:**
- ❌ Endpoints duplicados com funcionalidades similares
- ❌ APIs criadas sem planejamento de segurança
- ❌ Falta de padronização na nomenclatura
- ❌ Ausência de validação e logging em endpoints críticos
- ❌ Webhooks sem validação de assinatura
- ❌ Debug endpoints expostos em produção

---

## 🎯 PRINCÍPIOS DE DESIGN

### 1. **Unificação > Proliferação**

**❌ EVITE:**
```typescript
// 5 endpoints fazendo operações similares
/api/products/create
/api/products/update
/api/products/delete
/api/products/activate
/api/products/deactivate
```

**✅ PREFIRA:**
```typescript
// 1 endpoint RESTful cobrindo todos os casos
POST   /api/products      // Criar
GET    /api/products/:id  // Ler
PUT    /api/products/:id  // Atualizar
DELETE /api/products/:id  // Deletar
PATCH  /api/products/:id  // Atualizar parcial (activate/deactivate)
```

### 2. **Segurança First**

Toda nova API DEVE implementar as **5 Camadas de Segurança**:

```typescript
// ✅ TEMPLATE OBRIGATÓRIO
export async function POST(req: Request) {
  // 1️⃣ AUTENTICAÇÃO
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 2️⃣ AUTORIZAÇÃO (Role)
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // 3️⃣ VALIDAÇÃO DE INPUT
  const body = await req.json()
  const schema = z.object({
    name: z.string().min(1).max(200),
    price: z.number().positive()
  })
  const validated = schema.safeParse(body)
  if (!validated.success) {
    return NextResponse.json({ 
      error: 'Dados inválidos', 
      details: validated.error.errors 
    }, { status: 400 })
  }

  // 4️⃣ OWNERSHIP (quando aplicável)
  const resource = await prisma.product.findUnique({
    where: { id: resourceId }
  })
  if (resource.sellerId !== session.user.id) {
    return NextResponse.json({ error: 'Recurso não pertence ao usuário' }, { status: 403 })
  }

  try {
    // 5️⃣ LOGGING DE OPERAÇÕES CRÍTICAS
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_PRODUCT',
        resource: 'Product',
        resourceId: newProduct.id,
        metadata: { name: validated.data.name },
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      }
    })

    // Lógica de negócio...
    
  } catch (error) {
    // Logging de erro
    console.error('Erro ao criar produto:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

---

## 📝 CHECKLIST PRÉ-CRIAÇÃO

### ✅ ANTES DE CRIAR QUALQUER API

- [ ] **Pesquisei no [API-CATALOG.md](API-CATALOG.md)** se já existe endpoint similar
- [ ] **Li o [SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md)** para entender vulnerabilidades comuns
- [ ] **Defini claramente** o propósito único deste endpoint
- [ ] **Avaliei** se posso usar PATCH/PUT em endpoint existente ao invés de criar novo
- [ ] **Documentei** a justificativa para criação (adicionar no API-CATALOG.md)

### 🔒 CHECKLIST DE SEGURANÇA OBRIGATÓRIO

- [ ] ✅ **Autenticação** com `getServerSession(authOptions)`
- [ ] ✅ **Autorização** com verificação de role (ADMIN/SELLER/USER)
- [ ] ✅ **Validação de Input** com Zod ou Joi (nunca confie no cliente)
- [ ] ✅ **Ownership Verification** (usuário só acessa seus próprios dados)
- [ ] ✅ **Rate Limiting** (endpoints críticos: 10 req/min, normais: 60 req/min)
- [ ] ✅ **Audit Logging** (operações financeiras, admin, modificações)
- [ ] ✅ **SQL Injection Protection** (usar Prisma ou queries parametrizadas)
- [ ] ✅ **XSS Protection** (sanitizar output HTML)
- [ ] ✅ **CORS** configurado corretamente (não usar `*` em produção)
- [ ] ✅ **Error Handling** adequado (nunca vazar stack traces)

### 📊 CHECKLIST DE QUALIDADE

- [ ] 📝 Documentação criada/atualizada no API-CATALOG.md
- [ ] 🧪 Testes unitários escritos
- [ ] 🎯 Endpoint retorna códigos HTTP corretos (200, 201, 400, 401, 403, 404, 500)
- [ ] 📏 Respeita convenções RESTful
- [ ] 🔍 Code review aprovado por outro desenvolvedor
- [ ] 🚀 Testado em ambiente de staging antes de produção

---

## 🏗️ ESTRUTURA PADRONIZADA

### Nomenclatura de Rotas

```bash
# ✅ CORRETO - RESTful, descritivo, consistente
/api/admin/products              # Lista/cria produtos (admin)
/api/admin/products/[id]         # CRUD específico
/api/seller/orders               # Pedidos do vendedor
/api/webhooks/mercadolivre       # Webhook específico

# ❌ INCORRETO - Verbos na URL, inconsistente
/api/admin/createProduct
/api/admin/getProductById
/api/sellers/listOrders
/api/ml-webhook
```

### Estrutura de Pastas

```
app/api/
├── admin/                    # Rotas que exigem role ADMIN
│   ├── products/
│   ├── orders/
│   └── users/
├── seller/                   # Rotas que exigem role SELLER
│   ├── products/
│   └── orders/
├── user/                     # Rotas autenticadas (qualquer usuário)
│   ├── profile/
│   └── addresses/
├── public/                   # Rotas públicas (sem autenticação)
│   ├── products/
│   └── categories/
└── webhooks/                 # Webhooks externos
    ├── mercadolivre/
    ├── aliexpress/
    └── pagseguro/
```

### Response Padronizado

```typescript
// ✅ SUCESSO
{
  "success": true,
  "data": { /* payload */ },
  "message": "Operação concluída com sucesso" // opcional
}

// ✅ ERRO
{
  "success": false,
  "error": "Mensagem amigável para o usuário",
  "code": "INVALID_INPUT", // código de erro padronizado
  "details": [ /* detalhes técnicos opcionais */ ]
}

// ✅ LISTA PAGINADA
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 🚨 CASOS DE USO: QUANDO CRIAR VS QUANDO NÃO CRIAR

### ✅ QUANDO CRIAR NOVA API

1. **Funcionalidade completamente nova** sem endpoint similar
   ```typescript
   // Ex: Sistema novo de cupons de desconto
   POST /api/admin/coupons
   ```

2. **Webhook de integração externa** (MercadoLivre, AliExpress, etc)
   ```typescript
   // Ex: Receber notificações do PagSeguro
   POST /api/webhooks/pagseguro
   ```

3. **Operação complexa** que não se encaixa em CRUD simples
   ```typescript
   // Ex: Processar pedido dropshipping com múltiplas etapas
   POST /api/orders/process-dropshipping
   ```

### ❌ QUANDO NÃO CRIAR (USE EXISTENTE)

1. **Operação CRUD padrão** → Use endpoints RESTful existentes
   ```typescript
   // ❌ NÃO CRIE: /api/products/activate
   // ✅ USE: PATCH /api/products/:id com body { active: true }
   ```

2. **Variação de filtro/busca** → Use query params
   ```typescript
   // ❌ NÃO CRIE: /api/products/active
   // ✅ USE: GET /api/products?active=true
   ```

3. **Debug/teste** → Remova antes de produção
   ```typescript
   // ❌ NUNCA EM PRODUÇÃO: /api/test/calculate-sign
   // ✅ Use ferramentas de debug locais (Postman, Thunder Client)
   ```

4. **Operação que pode ser feita no frontend**
   ```typescript
   // ❌ NÃO CRIE: /api/calculate-total-price
   // ✅ Calcule no frontend ou agregue em endpoint existente
   ```

---

## 🔐 CATEGORIAS DE SEGURANÇA

### 🟢 NÍVEL 1: APIs Públicas (Sem Autenticação)

**Exemplos:** Listagem de produtos, categorias, busca pública

```typescript
// Regras:
// - Sem dados sensíveis
// - Rate limiting: 60 req/min por IP
// - Cache agressivo (CDN)
// - Validação de input obrigatória

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  
  // Rate limiting (implementar com upstash/redis)
  const rateLimit = await checkRateLimit(req, 'public', 60)
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  
  // Cache control
  const response = NextResponse.json({ data: products })
  response.headers.set('Cache-Control', 'public, s-maxage=300')
  return response
}
```

### 🟡 NÍVEL 2: APIs Autenticadas (User/Seller)

**Exemplos:** Perfil do usuário, carrinho, pedidos

```typescript
// Regras:
// - Autenticação obrigatória
// - Ownership verification
// - Rate limiting: 30 req/min por usuário
// - Logging de operações importantes

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  
  // Ownership: usuário só vê seus dados
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id }
  })
  
  return NextResponse.json({ data: orders })
}
```

### 🔴 NÍVEL 3: APIs Administrativas

**Exemplos:** Gerenciamento de usuários, relatórios financeiros, configurações

```typescript
// Regras:
// - Autenticação + role ADMIN obrigatório
// - Audit logging de TODAS as operações
// - Rate limiting: 20 req/min por admin
// - Two-factor authentication (recomendado)
// - IP whitelist (produção)

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    await logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS', req)
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  
  // Audit log obrigatório
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'DELETE_USER',
      resource: 'User',
      resourceId: userId,
      ip: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent')
    }
  })
  
  // Operação admin...
}
```

### ⚠️ NÍVEL 4: APIs Financeiras

**Exemplos:** Pagamentos, comissões, saques, créditos

```typescript
// Regras:
// - Todas as regras do NÍVEL 3 +
// - Idempotência obrigatória (evitar duplicação)
// - Validação dupla de valores
// - Transações atômicas (Prisma transactions)
// - Alertas automáticos para valores suspeitos
// - Backup/snapshot antes de operações críticas

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  
  const body = await req.json()
  
  // Idempotência: prevenir duplo processamento
  const idempotencyKey = req.headers.get('idempotency-key')
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'Idempotency-Key required' }, { status: 400 })
  }
  
  const existing = await prisma.transaction.findUnique({
    where: { idempotencyKey }
  })
  if (existing) {
    return NextResponse.json({ data: existing }) // Retornar resultado anterior
  }
  
  // Validação de valores
  const schema = z.object({
    amount: z.number().positive().max(1000000), // limite de segurança
    sellerId: z.string().cuid()
  })
  
  try {
    // Transação atômica
    const result = await prisma.$transaction(async (tx) => {
      // Operação financeira...
      
      // Audit log dentro da transação
      await tx.auditLog.create({
        data: { /* ... */ }
      })
      
      return result
    })
    
    // Alerta para valores altos
    if (body.amount > 50000) {
      await sendAdminAlert('HIGH_VALUE_TRANSACTION', body)
    }
    
    return NextResponse.json({ data: result })
    
  } catch (error) {
    await logFinancialError(error, body, session.user.id)
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
  }
}
```

### 🌐 NÍVEL 5: Webhooks

**Exemplos:** Notificações do MercadoLivre, AliExpress, PagSeguro

```typescript
// Regras:
// - Validação de assinatura HMAC obrigatória
// - Idempotência (webhooks podem ser reenviados)
// - Processamento assíncrono (não bloquear resposta)
// - Retry logic para falhas
// - Logging completo de payload recebido

export async function POST(req: Request) {
  // 1. Validar assinatura HMAC
  const signature = req.headers.get('x-signature')
  const body = await req.text()
  
  const isValid = await verifyWebhookSignature(body, signature, process.env.WEBHOOK_SECRET!)
  if (!isValid) {
    await logSecurityEvent('INVALID_WEBHOOK_SIGNATURE', { body, signature })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
  
  const payload = JSON.parse(body)
  
  // 2. Idempotência
  const webhookId = payload.id
  const existing = await prisma.webhookEvent.findUnique({
    where: { externalId: webhookId }
  })
  if (existing) {
    return NextResponse.json({ received: true }) // Já processado
  }
  
  // 3. Salvar evento
  await prisma.webhookEvent.create({
    data: {
      externalId: webhookId,
      source: 'MERCADOLIVRE',
      payload: payload,
      status: 'PENDING'
    }
  })
  
  // 4. Processar assíncronamente (background job)
  processWebhookAsync(payload).catch(console.error)
  
  // 5. Responder imediatamente
  return NextResponse.json({ received: true })
}
```

---

## 📚 TEMPLATES PRONTOS

### Template: API CRUD Completa

```typescript
// app/api/admin/resources/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const resourceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  active: z.boolean().default(true)
})

// LIST
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({ skip, take: limit }),
    prisma.resource.count()
  ])

  return NextResponse.json({
    data: resources,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
}

// CREATE
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const validated = resourceSchema.safeParse(body)
  
  if (!validated.success) {
    return NextResponse.json({
      error: 'Dados inválidos',
      details: validated.error.errors
    }, { status: 400 })
  }

  const resource = await prisma.resource.create({
    data: validated.data
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'CREATE_RESOURCE',
      resource: 'Resource',
      resourceId: resource.id,
      metadata: validated.data
    }
  })

  return NextResponse.json({ data: resource }, { status: 201 })
}
```

```typescript
// app/api/admin/resources/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET ONE
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const resource = await prisma.resource.findUnique({
    where: { id: params.id }
  })

  if (!resource) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ data: resource })
}

// UPDATE
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const validated = resourceSchema.safeParse(body)
  
  if (!validated.success) {
    return NextResponse.json({
      error: 'Dados inválidos',
      details: validated.error.errors
    }, { status: 400 })
  }

  const resource = await prisma.resource.update({
    where: { id: params.id },
    data: validated.data
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'UPDATE_RESOURCE',
      resource: 'Resource',
      resourceId: resource.id,
      metadata: validated.data
    }
  })

  return NextResponse.json({ data: resource })
}

// DELETE
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await prisma.resource.delete({
    where: { id: params.id }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'DELETE_RESOURCE',
      resource: 'Resource',
      resourceId: params.id
    }
  })

  return NextResponse.json({ success: true })
}
```

---

## 🔍 PROCESSO DE REVIEW

### Antes de Fazer Commit

```bash
# 1. Auto-review checklist
✅ Endpoint não duplica funcionalidade existente
✅ Todas as 5 camadas de segurança implementadas
✅ Validação de input com Zod
✅ Error handling adequado
✅ Documentação atualizada no API-CATALOG.md
✅ Sem dados sensíveis em logs
✅ Sem endpoints de debug/test

# 2. Testes locais
npm run test:api  # rodar testes unitários
npm run lint      # verificar code style

# 3. Code review
git add .
git commit -m "feat(api): adicionar endpoint X com validação completa"
# Solicitar review de outro dev antes de merge
```

### Checklist do Reviewer

```markdown
- [ ] Endpoint realmente necessário? (não existe alternativa)
- [ ] Autenticação implementada corretamente
- [ ] Autorização (role check) apropriada para sensibilidade dos dados
- [ ] Validação de input completa com schema Zod
- [ ] Ownership verification quando aplicável
- [ ] Logging de operações críticas
- [ ] Error handling não vaza informações sensíveis
- [ ] Testes unitários escritos e passando
- [ ] Documentação atualizada
- [ ] Sem hardcoded secrets/credentials
```

---

## 📖 REFERÊNCIAS OBRIGATÓRIAS

Antes de criar qualquer API, consulte:

1. **[API-CATALOG.md](API-CATALOG.md)** - Catálogo completo das 188 APIs existentes
2. **[SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md)** - Análise detalhada de vulnerabilidades
3. **[IMPLEMENTATION-GUIDE.md](IMPLEMENTATION-GUIDE.md)** - Exemplos de código seguro
4. **[SECURITY-CHECKLIST.md](SECURITY-CHECKLIST.md)** - 62 itens de verificação de segurança
5. **[EXECUTIVE-SUMMARY.md](EXECUTIVE-SUMMARY.md)** - Top 10 vulnerabilidades do sistema

---

## 🚀 MIGRAÇÃO DE APIs EXISTENTES

Para APIs antigas que não seguem este padrão:

### Prioridade 1: APIs Vulneráveis (59 endpoints)

Consulte [REMEDIATION-TIMELINE.md](REMEDIATION-TIMELINE.md) para cronograma de correção.

**Semanas 1-2 (Emergencial):**
- Webhooks sem validação HMAC
- APIs financeiras sem audit log
- Upload sem autenticação

**Semanas 3-4 (Urgente):**
- Admin APIs sem role check
- Rate limiting em auth/payment

**Semanas 5-6 (Importante):**
- Ownership verification faltante
- Logging completo

---

## 💡 EXEMPLOS PRÁTICOS

### ❌ EXEMPLO RUIM

```typescript
// app/api/products/create-product.ts
export async function POST(req: Request) {
  const body = await req.json()
  
  // SEM validação, SEM autenticação, SEM logging
  const product = await prisma.product.create({
    data: body // ⚠️ SQL injection risk
  })
  
  return NextResponse.json(product)
}
```

**Problemas:**
- Sem autenticação
- Sem validação de input
- Sem logging
- Nome de rota não-RESTful
- Vulnerável a SQL injection

### ✅ EXEMPLO BOM

```typescript
// app/api/admin/products/route.ts
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  sellerId: z.string().cuid()
})

export async function POST(req: Request) {
  // 1. Autenticação
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // 2. Validação
  const body = await req.json()
  const validated = productSchema.safeParse(body)
  
  if (!validated.success) {
    return NextResponse.json({
      error: 'Dados inválidos',
      details: validated.error.errors
    }, { status: 400 })
  }

  // 3. Lógica de negócio (Prisma já previne SQL injection)
  const product = await prisma.product.create({
    data: validated.data
  })

  // 4. Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'CREATE_PRODUCT',
      resource: 'Product',
      resourceId: product.id,
      metadata: validated.data
    }
  })

  return NextResponse.json({ data: product }, { status: 201 })
}
```

---

## 🎓 TREINAMENTO

### Para Novos Desenvolvedores

1. **Dia 1:** Ler este documento completo
2. **Dia 2:** Revisar [API-CATALOG.md](API-CATALOG.md) - entender arquitetura atual
3. **Dia 3:** Estudar [SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md) - aprender com erros
4. **Dia 4:** Implementar API de teste seguindo templates deste documento
5. **Dia 5:** Code review com dev senior

### Recursos de Aprendizado

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Zod Validation](https://zod.dev/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

## 📞 DÚVIDAS E SUPORTE

**Antes de criar uma nova API, discuta com:**
1. Tech Lead (arquitetura e necessidade)
2. Security Team (validação de segurança)
3. Peer Developer (code review)

**Canais:**
- Slack: #api-governance
- Code Review: GitHub Pull Requests
- Documentação: Atualizar este arquivo conforme padrões evoluem

---

## 📊 MÉTRICAS DE SUCESSO

### KPIs de Governança

- 🎯 **Meta:** Reduzir de 188 para ~50 APIs consolidadas (73% redução)
- 🔒 **Meta:** 100% de APIs com as 5 camadas de segurança implementadas
- 📉 **Meta:** 0 endpoints de debug em produção
- ✅ **Meta:** 100% de code coverage em testes de API
- 📝 **Meta:** 100% de APIs documentadas no API-CATALOG.md

### Monitoramento

```typescript
// Adicionar ao CI/CD pipeline
{
  "total_apis": 188,
  "secure_apis": 9,
  "vulnerable_apis": 59,
  "apis_with_auth": 150,
  "apis_with_validation": 120,
  "apis_with_logging": 45,
  "apis_with_rate_limiting": 0,
  "apis_with_tests": 30
}
```

---

## 🔄 VERSIONAMENTO DESTE DOCUMENTO

**Versão:** 1.0.0  
**Data:** Janeiro 2026  
**Autor:** Equipe de Desenvolvimento MyD Shop  
**Próxima Revisão:** Abril 2026 (trimestral)

**Histórico de Mudanças:**
- v1.0.0 (16/01/2026): Criação inicial após auditoria de segurança identificar 188 APIs com 59 vulneráveis

---

## ✅ CONCLUSÃO

**Lembre-se:**

> "A melhor API é aquela que não precisa ser criada porque já existe uma que faz o trabalho."

**Antes de qualquer commit:**
1. ✅ Revisei o API-CATALOG.md
2. ✅ Implementei as 5 camadas de segurança
3. ✅ Validei com outro desenvolvedor
4. ✅ Escrevi testes
5. ✅ Atualizei documentação

**Quando em dúvida, PERGUNTE. Criar uma API segura desde o início economiza semanas de correção posterior.**

---

**🚨 IMPORTANTE:** Este documento é OBRIGATÓRIO para todos os desenvolvedores. Violações podem resultar em:
- Code review rejeitado
- Rollback do deployment
- Vulnerabilidades de segurança que custam R$ milhões ao negócio

**💰 Custo de não seguir:** R$ 10M - R$ 50M em riscos (veja [EXECUTIVE-SUMMARY.md](EXECUTIVE-SUMMARY.md))
