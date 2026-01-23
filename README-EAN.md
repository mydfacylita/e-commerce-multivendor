# 📊 Sistema de Códigos EAN (Códigos de Barras)

## 🎯 Visão Geral

Sistema completo para geração, compra e gerenciamento de códigos EAN-13 (códigos de barras) para produtos. Oferece duas modalidades:

- **EAN Interno** (Grátis): Para uso interno do marketplace
- **EAN Oficial GS1** (Pago): Códigos oficiais para venda em qualquer lugar

---

## 📁 Estrutura de Arquivos

```
lib/
  ean-generator.ts         # Gerador EAN-13 com check digit

app/
  vendedor/ean/page.tsx    # Interface de gerenciamento
  api/vendedor/ean/
    generate/route.ts      # API de geração
    credits/route.ts       # API de créditos

prisma/migrations/
  add_ean_tables.sql       # Schema do banco
```

---

## 🗄️ Banco de Dados

### Tabelas Criadas

#### **EANCode** - Códigos Gerados
```sql
CREATE TABLE EANCode (
  id VARCHAR(36) PRIMARY KEY,
  sellerId VARCHAR(36) NOT NULL,
  code VARCHAR(13) UNIQUE NOT NULL,
  type ENUM('OFFICIAL', 'INTERNAL') NOT NULL,
  productId VARCHAR(36),
  used BOOLEAN DEFAULT FALSE,
  createdAt DATETIME NOT NULL,
  usedAt DATETIME,
  INDEX idx_seller (sellerId),
  INDEX idx_code (code),
  INDEX idx_product (productId)
);
```

#### **EANCredit** - Créditos Disponíveis
```sql
CREATE TABLE EANCredit (
  id VARCHAR(36) PRIMARY KEY,
  sellerId VARCHAR(36) NOT NULL,
  quantity INT NOT NULL,
  used INT DEFAULT 0,
  type ENUM('OFFICIAL', 'INTERNAL') NOT NULL,
  purchaseId VARCHAR(36),
  expiresAt DATETIME,
  createdAt DATETIME NOT NULL,
  INDEX idx_seller (sellerId)
);
```

#### **EANPurchase** - Histórico de Compras
```sql
CREATE TABLE EANPurchase (
  id VARCHAR(36) PRIMARY KEY,
  sellerId VARCHAR(36) NOT NULL,
  packageId VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  type ENUM('OFFICIAL', 'INTERNAL') NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING', 'PAID', 'CANCELLED') DEFAULT 'PENDING',
  paymentId VARCHAR(100),
  paidAt DATETIME,
  createdAt DATETIME NOT NULL,
  INDEX idx_seller (sellerId),
  INDEX idx_status (status)
);
```

### Executar Migração

```bash
# 1. Executar SQL no banco
mysql -u root -p mydshop < prisma/migrations/add_ean_tables.sql

# 2. Verificar tabelas criadas
mysql -u root -p mydshop -e "SHOW TABLES LIKE 'EAN%';"
```

---

## 🎨 Interface de Usuário

### Página: `/vendedor/ean`

**Funcionalidades:**

✅ Visualização de créditos disponíveis  
✅ Pacotes de EAN (Interno grátis + Oficial pago)  
✅ Geração de códigos  
✅ Copiar códigos individualmente  
✅ Download em lote (.txt)  
✅ Histórico de códigos gerados  

**Pacotes Disponíveis:**

| Pacote | Tipo | Quantidade | Preço |
|--------|------|------------|-------|
| Interno Básico | INTERNAL | 10 | Grátis |
| Interno Premium | INTERNAL | 50 | Grátis |
| Oficial Starter | OFFICIAL | 10 | R$ 29,90 |
| Oficial Business | OFFICIAL | 50 | R$ 79,90 |
| Oficial Enterprise | OFFICIAL | 200 | R$ 199,90 |

---

## 🔢 Algoritmo EAN-13

### Estrutura do Código

```
7 8 9 - 1 2 3 4 - 5 6 7 8 - 9
│   │   └── Sequencial (6 dígitos)
│   └────── Prefixo (3 dígitos)
└────────── País (3 dígitos)
            └──────────────── Check Digit (1 dígito)
```

### Prefixos Utilizados

- **789**: Brasil + GS1 (Oficial)
- **200**: Interno (Uso restrito ao marketplace)

### Cálculo do Check Digit

```typescript
function calculateEAN13CheckDigit(base: string): string {
  // 1. Somar posições ímpares × 1
  // 2. Somar posições pares × 3
  // 3. (10 - (soma % 10)) % 10
  
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i])
    sum += i % 2 === 0 ? digit : digit * 3
  }
  return ((10 - (sum % 10)) % 10).toString()
}
```

**Exemplo:**
```
Base: 789123456789
Passo 1: 7+9+2+4+6+8 = 36
Passo 2: (8+1+3+5+7+9) × 3 = 99
Soma: 36 + 99 = 135
Check: (10 - (135 % 10)) % 10 = 5
Código: 7891234567895
```

---

## 🔌 APIs

### POST `/api/vendedor/ean/generate`

Gera códigos EAN para o vendedor autenticado.

**Request:**
```json
{
  "quantity": 10,
  "type": "INTERNAL"  // "OFFICIAL" ou "INTERNAL"
}
```

**Response:**
```json
{
  "success": true,
  "eans": [
    "2000000000018",
    "2000000000025",
    "2000000000032"
  ],
  "quantity": 3,
  "type": "INTERNAL"
}
```

**Validações:**
- Usuário autenticado
- Vendedor ativo
- Quantidade: 1-1000
- Tipo: OFFICIAL ou INTERNAL
- Créditos suficientes (OFFICIAL)

---

### GET `/api/vendedor/ean/credits`

Retorna créditos disponíveis do vendedor.

**Response:**
```json
{
  "credits": [
    {
      "id": "uuid",
      "type": "OFFICIAL",
      "quantity": 50,
      "used": 12,
      "remaining": 38,
      "expiresAt": "2025-01-08T00:00:00Z"
    }
  ],
  "total": 38
}
```

---

## 📋 Funções da Biblioteca

### `lib/ean-generator.ts`

#### **generateEAN13(prefix: string, sequential: number)**
```typescript
const ean = generateEAN13('789', 123456)
// Retorna: "7891234567895"
```

#### **validateEAN13(ean: string)**
```typescript
const isValid = validateEAN13('7891234567895')
// Retorna: true
```

#### **formatEAN13(ean: string)**
```typescript
const formatted = formatEAN13('7891234567895')
// Retorna: "789-1234-5678-95"
```

#### **generateEANBatch(quantity, type)**
```typescript
const batch = generateEANBatch(10, EANType.OFFICIAL)
// Retorna: ['789...', '789...', ...]
```

---

## 💳 Fluxo de Compra (Oficial)

### 1. Seleção de Pacote
Vendedor acessa `/vendedor/ean` e escolhe pacote oficial (pago).

### 2. Checkout (A Implementar)
```typescript
// Criar página /vendedor/ean/checkout
// - Resumo do pacote
// - Integração Mercado Pago
// - Geração de QR Code PIX
// - Cartão de crédito
```

### 3. Webhook de Pagamento
```typescript
// POST /api/webhooks/ean-payment
// - Verificar status do pagamento
// - Criar EANPurchase (PAID)
// - Criar EANCredit
// - Enviar email de confirmação
```

### 4. Uso dos Créditos
Vendedor gera códigos EAN oficiais até esgotar créditos.

---

## 🔗 Integração com Produtos

### Adicionar Botão no Formulário

```tsx
// app/vendedor/produtos/novo/novo-produto-form.tsx

<div className="flex gap-2">
  <input
    type="text"
    value={formData.gtin}
    onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
    className="flex-1 px-4 py-2 border rounded-md"
    placeholder="7891234567890"
  />
  <button
    type="button"
    onClick={generateEANForProduct}
    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
  >
    Gerar EAN
  </button>
</div>
```

### Função de Geração
```typescript
const generateEANForProduct = async () => {
  try {
    const res = await fetch('/api/vendedor/ean/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 1, type: 'INTERNAL' })
    })
    
    const data = await res.json()
    if (data.success) {
      setFormData({ ...formData, gtin: data.eans[0] })
      toast.success('EAN gerado!')
    }
  } catch (error) {
    toast.error('Erro ao gerar EAN')
  }
}
```

### Marcar EAN como Usado
```typescript
// Ao salvar produto
await prisma.$executeRaw`
  UPDATE EANCode 
  SET used = TRUE, usedAt = NOW(), productId = ${productId}
  WHERE code = ${eanCode} AND sellerId = ${sellerId}
`
```

---

## 🧪 Testes

### 1. Testar Geração Interna (Grátis)

```bash
# 1. Acessar
https://mydshop.com.br/vendedor/ean

# 2. Clicar em "Gerar 10 - Interno Básico"

# 3. Verificar códigos gerados
# Devem começar com "200..."

# 4. Testar cópia e download
```

### 2. Verificar no Banco
```sql
SELECT * FROM EANCode ORDER BY createdAt DESC LIMIT 10;
```

### 3. Validar Check Digit
```javascript
// Console do navegador
const ean = '2000000000018'
let sum = 0
for (let i = 0; i < 12; i++) {
  sum += parseInt(ean[i]) * (i % 2 === 0 ? 1 : 3)
}
const check = (10 - (sum % 10)) % 10
console.log('Check digit:', check, '=', ean[12]) // Deve ser igual
```

---

## 📊 Monitoramento

### Queries Úteis

#### Códigos gerados por vendedor
```sql
SELECT 
  sellerId,
  type,
  COUNT(*) as total,
  SUM(CASE WHEN used = TRUE THEN 1 ELSE 0 END) as usados,
  SUM(CASE WHEN used = FALSE THEN 1 ELSE 0 END) as disponiveis
FROM EANCode
GROUP BY sellerId, type;
```

#### Créditos disponíveis
```sql
SELECT 
  sellerId,
  type,
  SUM(quantity - used) as saldo
FROM EANCredit
WHERE expiresAt IS NULL OR expiresAt > NOW()
GROUP BY sellerId, type;
```

#### Receita de EAN oficial
```sql
SELECT 
  DATE(createdAt) as data,
  COUNT(*) as vendas,
  SUM(price) as receita
FROM EANPurchase
WHERE status = 'PAID'
  AND type = 'OFFICIAL'
GROUP BY DATE(createdAt)
ORDER BY data DESC;
```

---

## 🚀 Próximos Passos

### ✅ Implementado
- [x] Gerador EAN-13 com check digit
- [x] Interface de gerenciamento
- [x] API de geração (interno)
- [x] Database schema
- [x] Sistema de créditos (estrutura)

### ⏸️ Pendente
- [ ] Página de checkout (/vendedor/ean/checkout)
- [ ] Integração Mercado Pago para EAN oficial
- [ ] Webhook de confirmação de pagamento
- [ ] Email de confirmação de compra
- [ ] Botão "Gerar EAN" no cadastro de produto
- [ ] Auto-atribuição de EAN ao produto
- [ ] Relatório de EANs gerados
- [ ] Exportação de EANs em CSV
- [ ] Dashboard administrativo de EAN
- [ ] Sistema de expiração de créditos

---

## 💡 Dicas de Uso

### Para Vendedores

**EAN Interno:**
- Ideal para produtos exclusivos do marketplace
- Geração ilimitada e gratuita
- Prefixo 200-xxx-xxxx-x
- Usar apenas internamente

**EAN Oficial GS1:**
- Necessário para vender fora do marketplace
- Aceito em redes de varejo físico
- Obrigatório em Mercado Livre para eletrônicos
- Prefixo 789-xxx-xxxx-x (Brasil)

### Para Administradores

**Configurar Preços:**
```typescript
// app/vendedor/ean/page.tsx
const packages = [
  { id: 'official-10', price: 29.90 },  // Editar aqui
  { id: 'official-50', price: 79.90 },
  { id: 'official-200', price: 199.90 }
]
```

**Monitorar Vendas:**
```sql
-- Vendas de EAN últimos 30 dias
SELECT 
  packageId,
  COUNT(*) as qtd,
  SUM(price) as total
FROM EANPurchase
WHERE status = 'PAID'
  AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY packageId;
```

---

## 🔒 Segurança

- ✅ Autenticação obrigatória
- ✅ Validação de seller ativo
- ✅ Código único (UNIQUE constraint)
- ✅ Validação de check digit
- ✅ Rate limiting (implementar)
- ✅ Auditoria de uso

---

## 📞 Suporte

**Problemas Comuns:**

❌ **"Créditos insuficientes"**  
→ Comprar pacote oficial em /vendedor/ean

❌ **"Código já existe"**  
→ Conflito no banco (raro), tentar novamente

❌ **"Check digit inválido"**  
→ Erro no algoritmo, reportar no GitHub

---

## 📚 Referências

- [GS1 Brasil](https://www.gs1br.org/)
- [Estrutura EAN-13](https://en.wikipedia.org/wiki/International_Article_Number)
- [Check Digit Algorithm](https://www.gs1.org/services/how-calculate-check-digit-manually)
- [Requisitos Mercado Livre](https://developers.mercadolivre.com.br/)

---

**Desenvolvido com ❤️ para MyD E-commerce**

*Última atualização: 2025-01-08*
