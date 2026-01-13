# 🔒 Melhorias de Segurança Implementadas

## Resumo das Vulnerabilidades Corrigidas

Este documento descreve as melhorias de segurança implementadas para proteger o sistema contra ataques comuns de injeção, XSS, e outras vulnerabilidades.

---

## ✅ Implementações Realizadas

### 1. **Biblioteca de Validação Centralizada** (`lib/validation.ts`)

#### Proteção contra XSS (Cross-Site Scripting)
- ✅ `sanitizeHtml()` - Remove TODAS as tags HTML e scripts
- ✅ `sanitizeRichText()` - Permite apenas tags HTML seguras (p, br, strong, em, etc)
- ✅ Usa biblioteca `isomorphic-dompurify` para sanitização robusta
- ✅ Previne injeção de JavaScript através de inputs

#### Proteção contra SQL Injection
- ✅ `sanitizeSqlString()` - Remove caracteres perigosos (;, ', ", <, >, etc)
- ✅ Prisma ORM já protege contra SQL injection por usar prepared statements
- ✅ Validação rigorosa de UUIDs antes de queries
- ✅ Nunca concatena strings diretamente em queries

#### Validação de Tipos e Formatos
- ✅ `isValidEmail()` - Regex robusta para emails
- ✅ `isValidCPF()` - Valida dígitos verificadores
- ✅ `isValidCNPJ()` - Valida dígitos verificadores
- ✅ `isValidPhone()` - Formato brasileiro
- ✅ `isValidCEP()` - Formato brasileiro
- ✅ `isValidUUID()` - Formato UUID v4
- ✅ `isValidSlug()` - URL-friendly validation
- ✅ `isValidPositiveNumber()` - Números decimais positivos
- ✅ `isValidPositiveInteger()` - Inteiros positivos

#### Validação de Tamanhos
- ✅ `isValidLength()` - Valida min/max de strings
- ✅ `isValidFileSize()` - Limita tamanho de arquivos
- ✅ `isValidImageMime()` - Apenas tipos MIME seguros
- ✅ `isValidImageExtension()` - Apenas extensões permitidas

#### Validação de Permissões (Server-Side)
- ✅ `isAdmin()` - Verifica role no banco de dados
- ✅ `isActiveSeller()` - Verifica status ACTIVE
- ✅ `hasActivePlan()` - Verifica plano ativo
- ✅ `canAccessResource()` - Valida ownership de recursos

#### Rate Limiting
- ✅ `checkRateLimit()` - Limita requisições por usuário/IP
- ✅ Implementação em memória (para prod: usar Redis)
- ✅ Headers HTTP padrão (X-RateLimit-*)
- ✅ Limpeza automática de entradas expiradas

---

### 2. **Validação de Produtos** (`lib/validation.ts`)

#### Regras de Validação
```typescript
PRODUCT_VALIDATION_RULES = {
  name: { min: 3, max: 200 },
  description: { min: 10, max: 5000 },
  price: { min: 0.01, max: 999999.99 },
  stock: { min: 0, max: 999999 },
  sku: { min: 3, max: 50 },
  images: { min: 1, max: 10, maxSizeMB: 5 }
}
```

#### Função `validateProductData()`
- ✅ Valida TODOS os campos obrigatórios
- ✅ Verifica tipos (string, number, array)
- ✅ Valida ranges de valores
- ✅ Retorna lista de erros detalhada
- ✅ Previne dados malformados

---

### 3. **Middleware de APIs** (`lib/api-middleware.ts`)

#### Autenticação e Autorização
- ✅ `requireAuth()` - Valida sessão ativa
- ✅ `requireAdmin()` - Apenas administradores
- ✅ `requireSeller()` - Apenas vendedores
- ✅ Verificação de role no banco de dados (não apenas JWT)

#### Helper Combinado
```typescript
validateRequest(request, {
  requireAdmin: true,
  rateLimit: { maxRequests: 10, windowMs: 60000 }
})
```

#### Wrapper HOF `withAuth()`
```typescript
export const POST = withAuth(
  async (request, { session }) => {
    // Código da rota já com sessão validada
  },
  { requireAdmin: true, rateLimit: { ... } }
)
```

#### Logs de Segurança
- ✅ `logSecurityEvent()` - Registra tentativas suspeitas
- ✅ Tipos: unauthorized_access, forbidden_access, rate_limit_exceeded, etc
- ✅ Inclui: userId, IP, path, timestamp
- ✅ Preparado para integração com Sentry/Datadog

---

### 4. **APIs de Produtos Refatoradas** (`app/api/seller/products/route.ts`)

#### POST - Criar Produto
**Validações Implementadas:**
1. ✅ Autenticação obrigatória
2. ✅ Rate limiting (10 produtos/minuto)
3. ✅ Verificação de permissões (`canManageProducts`)
4. ✅ Valida seller ACTIVE
5. ✅ Valida plano ativo
6. ✅ Sanitização de TODOS os inputs
7. ✅ Validação completa de dados (`validateProductData()`)
8. ✅ Verifica categoria existente
9. ✅ Valida preço comparativo > preço venda
10. ✅ Geração segura de slug único (máx 1000 tentativas)
11. ✅ Parsing seguro de JSON com try/catch

**Antes (Vulnerável):**
```typescript
const data = await request.json();
const { name, description, price } = data;
if (!name || !description || !price) {
  return NextResponse.json({ error: 'Faltando dados' }, { status: 400 });
}
```

**Depois (Seguro):**
```typescript
// Parsing seguro
let data;
try {
  data = await request.json();
} catch (error) {
  return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
}

// Sanitização
const sanitized = {
  name: sanitizeHtml(data.name || ''),
  description: sanitizeRichText(data.description || ''),
  price: Number(data.price),
  // ...
};

// Validação completa
const validation = validateProductData(sanitized);
if (!validation.valid) {
  return NextResponse.json(
    validationErrorResponse(validation.errors),
    { status: 400 }
  );
}
```

#### GET - Listar Produtos
**Validações Implementadas:**
1. ✅ Autenticação obrigatória
2. ✅ Rate limiting (60 listagens/minuto)
3. ✅ Verificação de permissões
4. ✅ Paginação segura (max 100 por página)
5. ✅ Sanitização de parâmetros de query
6. ✅ Retorna apenas produtos do seller logado

**Melhorias:**
- Antes: Retornava TODOS os produtos sem limite
- Depois: Paginação com limite de 100 itens

#### PUT - Atualizar Produto
**Validações Implementadas:**
1. ✅ Autenticação obrigatória
2. ✅ Rate limiting (30 atualizações/minuto)
3. ✅ Verificação de permissões
4. ✅ Validação de UUID do produto
5. ✅ **Verificação de ownership** (produto pertence ao seller?)
6. ✅ Sanitização campo por campo
7. ✅ Validação individual de cada campo atualizado
8. ✅ Verifica categoria existe (se fornecida)
9. ✅ Valida tipos e ranges

**Antes (CRÍTICO):**
```typescript
const { productId, ...updateData } = data;
await prisma.product.update({
  where: { id: productId },
  data: updateData  // ❌ ACEITA QUALQUER CAMPO!
});
```

**Depois (Seguro):**
```typescript
// Verifica ownership
if (existingProduct.sellerId !== seller.id) {
  return NextResponse.json(forbiddenResponse(), { status: 403 });
}

// Sanitiza cada campo individualmente
const sanitizedUpdate: any = {};
if (updateFields.name !== undefined) {
  sanitizedUpdate.name = sanitizeHtml(updateFields.name);
  if (sanitizedUpdate.name.length < 3 || sanitizedUpdate.name.length > 200) {
    return NextResponse.json({ error: 'Nome inválido' }, { status: 400 });
  }
}
// ... validação de cada campo
```

#### DELETE - Deletar Produto
**Validações Implementadas:**
1. ✅ Autenticação obrigatória
2. ✅ Rate limiting (20 exclusões/minuto)
3. ✅ Verificação de permissões
4. ✅ Validação de UUID
5. ✅ **Verificação de ownership**
6. ✅ **Validação de integridade** (não permite deletar com pedidos)
7. ✅ **Verifica listagens em marketplaces**

**Antes (Perigoso):**
```typescript
await prisma.product.delete({ where: { id: productId } });
```

**Depois (Seguro):**
```typescript
// Não permite deletar produto com pedidos
if (product.orderItems && product.orderItems.length > 0) {
  return NextResponse.json({
    error: 'Não é possível deletar produto com pedidos'
  }, { status: 400 });
}

// Avisa sobre listagens em marketplaces
if (product.marketplaceListings && product.marketplaceListings.length > 0) {
  return NextResponse.json({
    error: 'Remova as publicações antes de deletar'
  }, { status: 400 });
}
```

---

### 5. **Rotas de Admin Protegidas**

#### Exemplo: `app/api/admin/products/[id]/publish/route.ts`

**Antes:**
```typescript
export async function POST(request, { params }) {
  const { marketplace } = await request.json();
  // ❌ SEM validação de admin
  // ❌ SEM rate limiting
  // ❌ SEM sanitização
}
```

**Depois:**
```typescript
export const POST = withAuth(
  async (request, { session }) => {
    // ✅ Admin validado automaticamente
    // ✅ Rate limiting aplicado
    // ✅ Session garantida válida
    
    // Validação de UUID
    if (!isValidUUID(productId)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }
    
    // Sanitização
    const marketplace = sanitizeHtml(data.marketplace || '');
    
    // Whitelist de marketplaces
    if (!['mercadolivre', 'shopee'].includes(marketplace)) {
      return NextResponse.json({ message: 'Marketplace inválido' }, { status: 400 });
    }
  },
  { 
    requireAdmin: true,
    rateLimit: { maxRequests: 20, windowMs: 60000 }
  }
)
```

---

## 🔐 Proteções Específicas Implementadas

### Contra XSS (Cross-Site Scripting)
- ✅ Sanitização de HTML em TODOS os inputs de texto
- ✅ DOMPurify para remover scripts maliciosos
- ✅ Whitelist de tags HTML permitidas em rich text
- ✅ Escape automático de caracteres especiais

### Contra SQL Injection
- ✅ Uso exclusivo de Prisma ORM (prepared statements)
- ✅ Validação de UUIDs antes de queries
- ✅ NUNCA concatena strings em queries
- ✅ Sanitização adicional de strings SQL-like

### Contra Mass Assignment
- ✅ Sanitização campo por campo no PUT
- ✅ NUNCA passa objeto completo para Prisma
- ✅ Whitelist explícita de campos permitidos
- ✅ Validação individual de cada campo

### Contra IDOR (Insecure Direct Object Reference)
- ✅ Verificação de ownership em TODAS as rotas
- ✅ `canAccessResource()` para validar posse
- ✅ Seller só acessa seus próprios recursos
- ✅ Admin tem acesso total (com log)

### Contra Path Traversal
- ✅ `sanitizeFilename()` remove `..`, `/`, `\\`
- ✅ Validação de extensões permitidas
- ✅ Validação de tipos MIME
- ✅ Limite de tamanho de arquivo

### Contra Brute Force
- ✅ Rate limiting por usuário/IP
- ✅ Limites diferentes por tipo de operação
- ✅ Headers HTTP padrão para informar limite
- ✅ Logs de tentativas excessivas

### Contra Privilege Escalation
- ✅ Verificação de role no banco (não apenas JWT)
- ✅ `requireAdmin()` valida no servidor
- ✅ `requireSeller()` valida status ACTIVE
- ✅ Nunca confia em dados do cliente

---

## 📊 Configurações de Rate Limiting

| Operação | Limite | Janela |
|----------|--------|--------|
| Criar produto | 10 requisições | 1 minuto |
| Listar produtos | 60 requisições | 1 minuto |
| Atualizar produto | 30 requisições | 1 minuto |
| Deletar produto | 20 requisições | 1 minuto |
| Publicar no ML | 20 requisições | 1 minuto |

---

## 🚀 Próximos Passos (TODO)

### 1. Validar Uploads de Arquivos
- [ ] Criar função `validateFileUpload()`
- [ ] Verificar magic numbers (não apenas extensão)
- [ ] Implementar scan de vírus (ClamAV)
- [ ] Limitar tamanho total por usuário

### 2. CSRF Protection
- [ ] Implementar tokens CSRF em formulários críticos
- [ ] Validar tokens no servidor
- [ ] Usar SameSite cookies
- [ ] Double Submit Cookie pattern

### 3. Melhorar Rate Limiting
- [ ] Migrar de memória para Redis
- [ ] Implementar rate limiting por IP
- [ ] Adicionar backoff exponencial
- [ ] Configurar diferentes limites por endpoint

### 4. Auditoria e Logs
- [ ] Integrar com Sentry para erros
- [ ] Dashboard de eventos de segurança
- [ ] Alertas automáticos para atividades suspeitas
- [ ] Relatórios de tentativas de ataque

### 5. Outras Melhorias
- [ ] Implementar 2FA (Two-Factor Authentication)
- [ ] CAPTCHA em endpoints sensíveis
- [ ] Honeypot fields em formulários
- [ ] WAF (Web Application Firewall)
- [ ] Content Security Policy headers
- [ ] HTTPS obrigatório em produção

---

## 📝 Exemplos de Uso

### Usar validações em nova API

```typescript
import { 
  sanitizeHtml, 
  validateProductData,
  isValidUUID 
} from '@/lib/validation';

export async function POST(request: NextRequest) {
  const data = await request.json();
  
  // Sanitizar
  const clean = {
    name: sanitizeHtml(data.name),
    price: Number(data.price)
  };
  
  // Validar
  const validation = validateProductData(clean);
  if (!validation.valid) {
    return NextResponse.json({
      errors: validation.errors
    }, { status: 400 });
  }
  
  // Usar dados limpos
  await prisma.product.create({ data: clean });
}
```

### Proteger rota de admin

```typescript
import { withAuth } from '@/lib/api-middleware';

export const DELETE = withAuth(
  async (request, { session }) => {
    // session.user.role === 'ADMIN' garantido
    await deleteResource();
    return NextResponse.json({ success: true });
  },
  { 
    requireAdmin: true,
    rateLimit: { maxRequests: 10, windowMs: 60000 }
  }
);
```

---

## ⚠️ Avisos Importantes

1. **Rate Limiting em Produção**: A implementação atual usa memória. Para produção, migrar para Redis.

2. **Logs de Segurança**: Atualmente apenas `console.warn`. Integrar com serviço de monitoramento.

3. **HTTPS Obrigatório**: Em produção, SEMPRE usar HTTPS para prevenir MITM attacks.

4. **Backup Regular**: Manter backups do banco de dados para recuperação de desastres.

5. **Atualizar Dependências**: Rodar `npm audit` regularmente e atualizar pacotes vulneráveis.

---

## ✅ Checklist de Segurança

- [x] Validação de inputs server-side
- [x] Sanitização de HTML/XSS
- [x] Proteção contra SQL Injection
- [x] Verificação de permissões
- [x] Verificação de ownership
- [x] Rate limiting básico
- [x] Validação de UUIDs
- [x] Validação de tipos
- [x] Logs de segurança básicos
- [ ] CSRF tokens
- [ ] Upload de arquivos seguro
- [ ] 2FA
- [ ] Rate limiting em Redis
- [ ] WAF
- [ ] Monitoramento em tempo real

---

**Data de Implementação**: Janeiro 2026  
**Versão**: 1.0  
**Status**: ✅ Implementação Básica Completa
