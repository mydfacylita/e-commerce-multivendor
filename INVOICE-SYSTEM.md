# 📄 Sistema de Nota Fiscal - MyD Shop

> **Versão:** 1.0.0  
> **Data:** Janeiro 2026  
> **Status:** Implementado seguindo [API-GOVERNANCE.md](API-GOVERNANCE.md)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Lógica de Emissão](#lógica-de-emissão)
4. [APIs Disponíveis](#apis-disponíveis)
5. [Integração com Provedores](#integração-com-provedores)
6. [Interface Admin](#interface-admin)
7. [Interface Vendedor](#interface-vendedor)
8. [Fluxo de Trabalho](#fluxo-de-trabalho)
9. [Configuração](#configuração)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema de nota fiscal do MyD Shop gerencia a emissão automatizada de NF-e (Nota Fiscal Eletrônica) para pedidos realizados na plataforma, suportando dois tipos de emissão:

### Tipos de Nota Fiscal

| Tipo | Descrição | Quando Usar |
|------|-----------|-------------|
| **ADMIN** | Nota emitida pela administração | Pedidos com produtos do admin ou dropshipping admin |
| **SELLER** | Nota emitida pelo vendedor | Pedidos com produtos de vendedores terceiros |

### Características Principais

✅ **Emissão Automatizada** - Integração com provedores (NFe.io, Bling)  
✅ **Segurança Total** - Todas as 5 camadas implementadas ([API-GOVERNANCE.md](API-GOVERNANCE.md))  
✅ **Audit Log Completo** - Rastreabilidade total de operações  
✅ **Cancelamento** - Suporte a cancelamento com justificativa  
✅ **Downloads** - PDF, XML e DANFE disponíveis  
✅ **Multi-Tenant** - Suporte a vendedores independentes  

---

## 🏗️ Arquitetura

### Modelo de Dados (Prisma)

```prisma
model Invoice {
  id                String        @id @default(cuid())
  orderId           String
  invoiceNumber     String?       @unique
  accessKey         String?       @unique
  series            String?
  type              InvoiceType   // ADMIN ou SELLER
  status            InvoiceStatus // PENDING, PROCESSING, ISSUED, CANCELLED, ERROR
  issuedBy          String?
  issuedAt          DateTime?
  cancelledAt       DateTime?
  cancelReason      String?       @db.Text
  
  // URLs dos documentos
  xmlUrl            String?
  pdfUrl            String?
  danfeUrl          String?
  
  // Dados fiscais
  cfop              String?
  naturezaOperacao  String?
  emitenteCnpj      String?
  emitenteNome      String?
  destinatarioCpf   String?
  destinatarioCnpj  String?
  destinatarioNome  String?
  
  // Valores
  valorTotal        Float
  valorProdutos     Float
  valorFrete        Float?
  valorDesconto     Float?
  valorIcms         Float?
  valorIpi          Float?
  valorPis          Float?
  valorCofins       Float?
  
  // Integração externa
  protocol          String?
  externalId        String?
  externalProvider  String?
  errorMessage      String?       @db.Text
  metadata          String?       @db.LongText
  
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  
  // Relações
  order             Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([status])
  @@index([type])
  @@index([issuedAt])
  @@map("invoice")
}

enum InvoiceStatus {
  PENDING      // Aguardando processamento
  PROCESSING   // Sendo processada na SEFAZ
  ISSUED       // Emitida com sucesso
  CANCELLED    // Cancelada
  ERROR        // Erro na emissão

  @@map("invoice_status")
}

enum InvoiceType {
  ADMIN        // Nota administrativa (produtos admin/drop admin)
  SELLER       // Nota de vendedor (produtos de terceiros)

  @@map("invoice_type")
}
```

### Estrutura de Arquivos

```
lib/
  invoice.ts              # Biblioteca de integração com provedores

app/api/
  admin/
    invoices/
      route.ts            # GET (listar), sem POST (ver issue/)
      [id]/
        route.ts          # GET (detalhes), DELETE (cancelar)
      issue/
        route.ts          # POST (emitir nota fiscal)
  
  seller/
    invoices/
      route.ts            # GET (listar notas do vendedor)
      [id]/
        route.ts          # GET (detalhes da nota)

app/
  admin/
    invoices/
      page.tsx            # Lista de notas fiscais
      issue/
        page.tsx          # Formulário de emissão
      [id]/
        page.tsx          # Detalhes da nota (TODO)
  
  vendedor/
    notas-fiscais/
      page.tsx            # Lista de notas do vendedor (TODO)
      [id]/
        page.tsx          # Detalhes da nota (TODO)
```

---

## 🔄 Lógica de Emissão

### Fluxograma de Decisão

```
┌─────────────────────────┐
│   Pedido Aprovado       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Verificar Produtos      │
│ do Pedido               │
└───────────┬─────────────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
┌─────────┐    ┌─────────┐
│Produtos │    │Produtos │
│  Admin  │    │Vendedor │
│   ou    │    │         │
│  Drop   │    │         │
└────┬────┘    └────┬────┘
     │              │
     ▼              ▼
┌─────────┐    ┌─────────┐
│  Nota   │    │  Nota   │
│  ADMIN  │    │ SELLER  │
└─────────┘    └─────────┘
```

### Regras de Negócio

#### Tipo ADMIN

Emitida quando:
- ✅ Todos os produtos são do admin (`sellerId = null`)
- ✅ Pedido contém produtos dropshipping do admin
- ✅ Pedido misto com produtos admin

#### Tipo SELLER

Emitida quando:
- ✅ Todos os produtos pertencem ao mesmo vendedor
- ✅ Vendedor está cadastrado com dados fiscais completos
- ⚠️ **Importante:** Um pedido com múltiplos vendedores gera múltiplas notas

### Validações Obrigatórias

Antes de emitir, o sistema valida:

```typescript
// Dados do destinatário
✅ CPF ou CNPJ informado
✅ Nome completo
✅ Email válido
✅ Endereço completo (CEP, rua, número, bairro, cidade, estado)

// Dados dos produtos
✅ Código SKU
✅ GTIN/EAN (quando obrigatório)
✅ NCM válido
✅ Preço > 0
✅ Quantidade > 0

// Dados fiscais
✅ CFOP válido (4 dígitos)
✅ Natureza da operação informada
✅ Dados do emitente (CNPJ, IE, endereço)
```

---

## 🔌 APIs Disponíveis

### Admin APIs

#### 1. Listar Notas Fiscais

```http
GET /api/admin/invoices
Authorization: Bearer {token}
Role: ADMIN

Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20, max: 100)
  - status: PENDING | PROCESSING | ISSUED | CANCELLED | ERROR
  - type: ADMIN | SELLER
  - startDate: ISO 8601 date
  - endDate: ISO 8601 date
  - search: string (busca por número, chave, nome, CPF)

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "clx123...",
      "invoiceNumber": "000001",
      "accessKey": "12345678901234567890123456789012345678901234",
      "status": "ISSUED",
      "type": "ADMIN",
      "valorTotal": 299.90,
      "issuedAt": "2026-01-16T10:00:00Z",
      "order": {
        "id": "clx456...",
        "buyerName": "João Silva",
        "buyerCpf": "12345678900"
      },
      "pdfUrl": "https://...",
      "xmlUrl": "https://..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### 2. Emitir Nota Fiscal

```http
POST /api/admin/invoices/issue
Authorization: Bearer {token}
Role: ADMIN

Body:
{
  "orderId": "clx789...",
  "cfop": "5102",
  "naturezaOperacao": "Venda de mercadoria",
  "emitenteCnpj": "12345678000190",
  "emitenteNome": "MyD Shop LTDA",
  "series": "1"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "clx123...",
    "status": "PENDING",
    "type": "ADMIN",
    "orderId": "clx789..."
  },
  "message": "Nota fiscal criada com sucesso. Aguardando processamento."
}

Errors:
400 - Dados inválidos
404 - Pedido não encontrado
400 - Já existe nota fiscal para este pedido
400 - CPF/CNPJ do destinatário obrigatório
```

#### 3. Detalhes de Nota Fiscal

```http
GET /api/admin/invoices/{id}
Authorization: Bearer {token}
Role: ADMIN

Response 200:
{
  "success": true,
  "data": {
    "id": "clx123...",
    "invoiceNumber": "000001",
    "accessKey": "12345...",
    "status": "ISSUED",
    "order": {
      "id": "clx456...",
      "buyerName": "João Silva",
      "items": [
        {
          "product": {
            "name": "Produto X",
            "sku": "PROD-001",
            "gtin": "7891234567890"
          },
          "quantity": 2,
          "price": 99.90
        }
      ]
    },
    "xmlUrl": "https://...",
    "pdfUrl": "https://...",
    "danfeUrl": "https://..."
  }
}
```

#### 4. Cancelar Nota Fiscal

```http
DELETE /api/admin/invoices/{id}
Authorization: Bearer {token}
Role: ADMIN

Body:
{
  "cancelReason": "Motivo do cancelamento com no mínimo 10 caracteres"
}

Response 200:
{
  "success": true,
  "data": {
    "id": "clx123...",
    "status": "CANCELLED",
    "cancelledAt": "2026-01-16T15:00:00Z"
  },
  "message": "Nota fiscal cancelada com sucesso"
}

Errors:
400 - Motivo de cancelamento obrigatório
404 - Nota fiscal não encontrada
400 - Nota já está cancelada
400 - Apenas notas emitidas podem ser canceladas
```

### Seller APIs

#### 5. Listar Notas Fiscais (Seller)

```http
GET /api/seller/invoices
Authorization: Bearer {token}
Role: SELLER

Query Parameters: (mesmos do admin)

Response: (similar ao admin, filtrando apenas notas do vendedor)
```

#### 6. Detalhes de Nota Fiscal (Seller)

```http
GET /api/seller/invoices/{id}
Authorization: Bearer {token}
Role: SELLER

Response 200:
{
  "success": true,
  "data": {
    // Mesma estrutura do admin
    // Porém filtra apenas produtos do vendedor
  }
}

Errors:
403 - Nota fiscal não pertence ao vendedor
```

---

## 🔗 Integração com Provedores

### Provedores Suportados

#### NFe.io (Implementado)

```typescript
// Configuração no .env
INVOICE_PROVIDER=nfeio
NFEIO_API_KEY=sua_api_key
NFEIO_COMPANY_ID=sua_company_id
```

**Documentação:** https://nfe.io/docs/api

**Endpoints utilizados:**
- `POST /v1/companies/{id}/nfes` - Emitir nota
- `POST /v1/companies/{id}/nfes/{id}/cancel` - Cancelar nota
- `GET /v1/companies/{id}/nfes/{id}` - Consultar status

#### Bling (Aguardando Implementação)

```typescript
// Configuração no .env
INVOICE_PROVIDER=bling
BLING_API_KEY=sua_api_key
```

**Documentação:** https://developer.bling.com.br/

### Criar Novo Provedor

Para adicionar um novo provedor, estenda a classe `InvoiceProvider`:

```typescript
// lib/invoice.ts

export class MeuProvedorProvider extends InvoiceProvider {
  name = 'MeuProvedor'
  private apiKey: string
  
  constructor() {
    super()
    this.apiKey = process.env.MEU_PROVEDOR_API_KEY || ''
  }

  async issueInvoice(data: InvoiceData): Promise<InvoiceResult> {
    try {
      // 1. Validar configuração
      if (!this.apiKey) {
        return { success: false, error: 'API Key não configurada' }
      }

      // 2. Montar payload conforme API do provedor
      const payload = { /* ... */ }

      // 3. Fazer requisição
      const response = await fetch(/* ... */)

      // 4. Atualizar banco de dados
      await prisma.invoice.update({
        where: { id: data.invoiceId },
        data: {
          status: 'PROCESSING',
          invoiceNumber: result.numero,
          externalId: result.id,
          externalProvider: this.name
        }
      })

      // 5. Retornar resultado
      return {
        success: true,
        invoiceNumber: result.numero,
        accessKey: result.chave
      }

    } catch (error: any) {
      // Registrar erro
      await prisma.invoice.update({
        where: { id: data.invoiceId },
        data: { status: 'ERROR', errorMessage: error.message }
      })

      return { success: false, error: error.message }
    }
  }

  async cancelInvoice(invoiceId: string, reason: string): Promise<InvoiceResult> {
    // Implementar cancelamento
  }

  async getInvoiceStatus(invoiceId: string): Promise<InvoiceResult> {
    // Implementar consulta de status
  }
}

// Adicionar ao factory
export function createInvoiceProvider(): InvoiceProvider {
  const provider = process.env.INVOICE_PROVIDER || 'nfeio'
  
  switch (provider.toLowerCase()) {
    case 'nfeio':
      return new NFeIOProvider()
    case 'bling':
      return new BlingProvider()
    case 'meuprovedor':
      return new MeuProvedorProvider()
    default:
      return new NFeIOProvider()
  }
}
```

### Webhook de Callback

Para receber notificações do provedor sobre mudanças de status:

```typescript
// app/api/webhooks/invoice/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    // 1. Validar assinatura HMAC
    const signature = req.headers.get('x-signature')
    const body = await req.text()
    
    const isValid = await verifySignature(body, signature)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(body)

    // 2. Atualizar status da nota
    await prisma.invoice.update({
      where: { externalId: payload.id },
      data: {
        status: mapStatus(payload.status),
        invoiceNumber: payload.numero,
        accessKey: payload.chave_acesso,
        protocol: payload.protocolo,
        xmlUrl: payload.url_xml,
        pdfUrl: payload.url_pdf
      }
    })

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function mapStatus(externalStatus: string): InvoiceStatus {
  const map: Record<string, InvoiceStatus> = {
    'pendente': 'PROCESSING',
    'autorizada': 'ISSUED',
    'cancelada': 'CANCELLED',
    'rejeitada': 'ERROR'
  }
  return map[externalStatus] || 'PROCESSING'
}
```

---

## 💻 Interface Admin

### Tela de Listagem

**Rota:** `/admin/invoices`

**Funcionalidades:**
- ✅ Lista todas as notas fiscais (admin e seller)
- ✅ Filtros por status, tipo, data, busca
- ✅ Paginação
- ✅ Download de PDF/XML/DANFE
- ✅ Cancelamento de notas emitidas
- ✅ Link para detalhes do pedido

**Screenshot/Wireframe:**

```
┌─────────────────────────────────────────────────────────────┐
│ 📄 Notas Fiscais                    [+ Emitir Nota Fiscal] │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Buscar... [Filtros ▼]                                   │
├─────────────────────────────────────────────────────────────┤
│ Número    | Pedido  | Cliente      | Tipo  | Status | Ações│
├─────────────────────────────────────────────────────────────┤
│ 000001    | #clx123 | João Silva   | ADMIN | ✓ Emitida    │
│ 12345678  |         | 123.456.789  |       |              │
│           |         |              |       | 📥 ❌ 👁️      │
├─────────────────────────────────────────────────────────────┤
│ 000002    | #clx456 | Maria Santos | SELLER| ⏳ Processando│
└─────────────────────────────────────────────────────────────┘
```

### Tela de Emissão

**Rota:** `/admin/invoices/issue`

**Funcionalidades:**
- ✅ Seleção de pedido sem nota fiscal
- ✅ Detecção automática de tipo (ADMIN/SELLER)
- ✅ Preenchimento automático de dados fiscais
- ✅ Validação de dados obrigatórios
- ✅ Preview das informações antes de emitir

---

## 👤 Interface Vendedor

### Tela de Listagem (Vendedor)

**Rota:** `/vendedor/notas-fiscais`

**Funcionalidades:**
- ✅ Lista apenas notas do vendedor
- ✅ Filtros por status e data
- ✅ Download de documentos
- ✅ Visualização de detalhes
- ❌ Sem permissão para emitir ou cancelar (apenas admin)

---

## 🔄 Fluxo de Trabalho

### Emissão de Nota Fiscal

```
1️⃣ ADMIN: Acessa /admin/invoices/issue
   ↓
2️⃣ Seleciona pedido aprovado sem nota fiscal
   ↓
3️⃣ Sistema detecta tipo automaticamente:
   - ADMIN: produtos admin/drop admin
   - SELLER: produtos de vendedor
   ↓
4️⃣ ADMIN preenche dados fiscais (CFOP, natureza, etc)
   ↓
5️⃣ Sistema valida dados obrigatórios
   ↓
6️⃣ Cria registro Invoice com status PENDING
   ↓
7️⃣ Envia para provedor (NFe.io/Bling)
   ↓
8️⃣ Provedor processa e retorna:
   - Sucesso → status = PROCESSING
   - Erro → status = ERROR
   ↓
9️⃣ Webhook/Polling atualiza status final:
   - SEFAZ aprova → status = ISSUED
   - SEFAZ rejeita → status = ERROR
   ↓
🔟 Cliente recebe email com nota fiscal
```

### Cancelamento de Nota Fiscal

```
1️⃣ ADMIN: Acessa nota fiscal emitida
   ↓
2️⃣ Clica em "Cancelar"
   ↓
3️⃣ Preenche motivo (mín 10 caracteres)
   ↓
4️⃣ Sistema valida:
   - Nota está emitida (não pending/cancelled)
   - Motivo preenchido
   ↓
5️⃣ Envia cancelamento para provedor
   ↓
6️⃣ Provedor processa cancelamento na SEFAZ
   ↓
7️⃣ Atualiza status para CANCELLED
   ↓
8️⃣ Registra Audit Log
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# .env

# Provedor de Nota Fiscal
INVOICE_PROVIDER=nfeio  # ou 'bling'

# NFe.io
NFEIO_API_KEY=your_api_key_here
NFEIO_COMPANY_ID=your_company_id_here

# Bling (futuro)
BLING_API_KEY=your_api_key_here

# Dados do Emitente (padrão)
INVOICE_EMITTER_CNPJ=12345678000190
INVOICE_EMITTER_NAME=MyD Shop LTDA
INVOICE_EMITTER_IE=123456789
INVOICE_EMITTER_ADDRESS=Rua Exemplo, 123
INVOICE_EMITTER_CITY=São Paulo
INVOICE_EMITTER_STATE=SP
INVOICE_EMITTER_ZIP=01234567
```

### Migration do Banco de Dados

```bash
# Gerar migration
npx prisma migrate dev --name add_invoice_model

# Aplicar em produção
npx prisma migrate deploy

# Gerar client
npx prisma generate
```

### Permissões de Role

Certifique-se de que os roles estão configurados corretamente:

```typescript
// lib/auth.ts

enum Role {
  USER = 'USER',      // Não acessa notas fiscais
  SELLER = 'SELLER',  // Visualiza suas notas
  ADMIN = 'ADMIN'     // Acesso completo
}
```

---

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Erro: "CPF/CNPJ do destinatário é obrigatório"

**Causa:** Pedido sem CPF/CNPJ do cliente

**Solução:**
```sql
-- Verificar pedidos sem CPF
SELECT id, buyerName, buyerCpf FROM `order` WHERE buyerCpf IS NULL OR buyerCpf = '';

-- Atualizar manualmente
UPDATE `order` SET buyerCpf = '12345678900' WHERE id = 'clx123...';
```

#### 2. Erro: "NFe.io não configurado"

**Causa:** Variáveis de ambiente não configuradas

**Solução:**
```bash
# Verificar .env
echo $NFEIO_API_KEY
echo $NFEIO_COMPANY_ID

# Adicionar se não existir
NFEIO_API_KEY=sua_api_key
NFEIO_COMPANY_ID=sua_company_id
```

#### 3. Nota fica em status PROCESSING indefinidamente

**Causa:** Webhook não configurado ou erro na SEFAZ

**Solução:**
```typescript
// Consultar status manualmente
import { consultarStatusNotaFiscal } from '@/lib/invoice'

const result = await consultarStatusNotaFiscal('invoice_id')
console.log(result)
```

#### 4. Erro ao emitir: "Já existe nota fiscal para este pedido"

**Causa:** Tentativa de emitir nota duplicada

**Solução:**
```sql
-- Verificar notas do pedido
SELECT * FROM invoice WHERE orderId = 'clx123...';

-- Se necessário, cancelar nota anterior antes de reemitir
```

#### 5. Produtos sem NCM

**Causa:** Produtos cadastrados sem código NCM obrigatório

**Solução:**
```sql
-- Listar produtos sem NCM
SELECT id, name, sku FROM product WHERE ncm IS NULL OR ncm = '';

-- Atualizar NCM genérico
UPDATE product SET ncm = '00000000' WHERE ncm IS NULL;
```

### Logs e Debug

```typescript
// Habilitar logs detalhados
// lib/invoice.ts

console.log('🔍 Emitindo nota fiscal:', {
  invoiceId,
  orderId,
  type,
  valorTotal
})

// Log de erros
await prisma.auditLog.create({
  data: {
    action: 'INVOICE_ERROR',
    resource: 'Invoice',
    resourceId: invoiceId,
    metadata: { error: error.message, stack: error.stack }
  }
})
```

### Consultar Status na SEFAZ

Para verificar uma nota fiscal diretamente na SEFAZ:

1. Acesse: https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx
2. Informe a chave de acesso (44 dígitos)
3. Verifique status e motivo de rejeição

---

## 📊 Métricas e Monitoramento

### KPIs Importantes

```sql
-- Total de notas emitidas por período
SELECT 
  DATE(issuedAt) as data,
  COUNT(*) as total,
  SUM(valorTotal) as valor_total
FROM invoice
WHERE status = 'ISSUED'
  AND issuedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(issuedAt);

-- Taxa de sucesso na emissão
SELECT 
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM invoice), 2) as percentual
FROM invoice
GROUP BY status;

-- Notas por tipo
SELECT 
  type,
  COUNT(*) as quantidade,
  SUM(valorTotal) as valor_total
FROM invoice
WHERE status = 'ISSUED'
GROUP BY type;

-- Notas com erro (para análise)
SELECT 
  id,
  orderId,
  errorMessage,
  createdAt
FROM invoice
WHERE status = 'ERROR'
ORDER BY createdAt DESC
LIMIT 20;
```

---

## 🔒 Segurança

### Implementações de Segurança

Todas as APIs seguem as **5 Camadas de Segurança** do [API-GOVERNANCE.md](API-GOVERNANCE.md):

1. ✅ **Autenticação** - `getServerSession(authOptions)`
2. ✅ **Autorização** - Verificação de role (ADMIN/SELLER)
3. ✅ **Validação de Input** - Schemas Zod completos
4. ✅ **Ownership Verification** - Sellers veem apenas suas notas
5. ✅ **Audit Logging** - Todas operações críticas registradas

### Audit Log

```sql
-- Ver histórico de emissões
SELECT * FROM auditlog 
WHERE action IN ('CREATE_INVOICE', 'CANCEL_INVOICE')
ORDER BY createdAt DESC;
```

---

## 🚀 Roadmap

### Próximas Implementações

- [ ] **Interface vendedor completa** (visualização de notas)
- [ ] **Emissão automática** após aprovação de pagamento
- [ ] **Integração com Bling**
- [ ] **NFS-e** (Nota Fiscal de Serviço Eletrônica)
- [ ] **Relatórios fiscais** (SPED, DANFE em lote)
- [ ] **Certificado digital A1** (emissão sem intermediários)
- [ ] **Email automático** ao cliente com DANFE
- [ ] **Dashboard fiscal** (impostos, faturamento)

---

## 📞 Suporte

**Dúvidas sobre notas fiscais:**
1. Verificar este documento
2. Consultar [API-GOVERNANCE.md](API-GOVERNANCE.md)
3. Verificar logs de audit
4. Contatar suporte do provedor (NFe.io/Bling)

**Contato Provedor:**
- NFe.io: suporte@nfe.io | https://nfe.io/docs
- Bling: suporte@bling.com.br | https://developer.bling.com.br

---

## 📝 Changelog

**v1.0.0 - Janeiro 2026**
- ✅ Modelo de dados implementado
- ✅ APIs admin completas
- ✅ APIs seller (listagem/visualização)
- ✅ Integração NFe.io
- ✅ Interface admin (listagem e emissão)
- ✅ Audit logging completo
- ✅ Documentação completa

---

**Documentação mantida por:** Equipe de Desenvolvimento MyD Shop  
**Última atualização:** 16/01/2026  
**Versão do sistema:** 1.0.0
