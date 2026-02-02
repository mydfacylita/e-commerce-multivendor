# Estrutura de Variantes e SKUs do Produto

> **Última atualização:** 01/02/2026
> **Propósito:** Documentar os campos `selectedSkus` e `variants` para evitar análises repetidas

---

## 📊 Visão Geral

O sistema usa **duas estruturas principais** para gerenciar variantes de produtos importados do AliExpress:

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `selectedSkus` | `JSON Array` | SKUs selecionados pelo vendedor com **preços customizados** |
| `variants` | `JSON Object` | Dados **brutos da API** do AliExpress com todas as variantes |

---

## 1️⃣ selectedSkus (Array de SKUs Personalizados)

### Descrição
Array contendo os SKUs que o vendedor **escolheu vender**, com preços e margens customizados.

### Estrutura

```typescript
interface SelectedSku {
  skuId: string;        // ID único do SKU no AliExpress (ex: "12000052705135601")
  enabled: boolean;     // Se o SKU está ativo para venda
  customStock: number;  // Estoque personalizado (pode ser diferente do real)
  customPrice: number;  // Preço de VENDA (já com margem aplicada) - R$ 197.77
  margin: number;       // Margem de lucro em % (ex: 20)
  costPrice: number;    // Preço de CUSTO do AliExpress - R$ 158.30
  stock: number;        // Estoque REAL do AliExpress
  available: boolean;   // Se está disponível no fornecedor
}
```

### Exemplo Real

```json
{
  "skuId": "12000052705135601",
  "enabled": true,
  "customStock": 697,
  "customPrice": 197.77,    // ← PREÇO QUE O CLIENTE PAGA
  "margin": 20,             // ← 20% de margem
  "costPrice": 158.30,      // ← PREÇO NO ALIEXPRESS
  "stock": 697,
  "available": true
}
```

### Fórmulas

```
customPrice = costPrice * (1 + margin/100)
customPrice = 158.30 * 1.20 = 189.96 (arredondado para 197.77)

Lucro = customPrice - costPrice
Lucro = 197.77 - 158.30 = R$ 39.47
```

### Campos Importantes

| Campo | O que representa | Usado para |
|-------|------------------|------------|
| `skuId` | Identificador único AliExpress | Fazer match com `variants.skus[]` |
| `customPrice` | Preço final de venda | Exibir no site, calcular carrinho |
| `costPrice` | Preço de custo | Calcular margem, atualizar na sync |
| `margin` | Percentual de lucro | Recalcular preço quando custo muda |
| `stock` | Estoque real | Sincronizado automaticamente |
| `customStock` | Estoque customizado | Pode ser editado manualmente |

---

## 2️⃣ variants (Dados da API AliExpress)

### Descrição
Objeto contendo **todos os dados brutos** do produto no AliExpress, incluindo propriedades, SKUs e metadados.

### Estrutura Completa

```typescript
interface Variants {
  version: string;              // Versão do schema
  source: string;               // Origem ("aliexpress")
  sourceProductId: string;      // ID do produto no AliExpress
  lastUpdated: string;          // ISO timestamp da última atualização
  properties: Property[];       // Tipos de variação (cor, tamanho, etc)
  skus: Sku[];                  // Lista de todas as combinações de SKU
  metadata: Metadata;           // Informações agregadas
}

interface Property {
  id: string;                   // ID da propriedade (ex: "14" = cor)
  name: string;                 // Nome legível (ex: "cor")
  type: "color" | "style";      // Tipo de variação
  options: PropertyOption[];    // Opções disponíveis
}

interface PropertyOption {
  id: string;                   // ID da opção (ex: "175")
  value: string;                // Valor traduzido (ex: "verde")
  label: string;                // Label original (ex: "R36S Azul")
  image: string | null;         // URL da imagem (se cor)
}

interface Sku {
  skuId: string;                // ID único do SKU
  skuAttr: string;              // Atributos combinados (chave de variação)
  price: number;                // Preço ATUAL no AliExpress (BRL)
  originalPrice: number;        // Preço original (sem desconto)
  stock: number;                // Estoque disponível
  available: boolean;           // Se pode ser comprado
  image: string;                // Imagem da variante
  properties: SkuProperty[];    // Detalhes das propriedades
}

interface SkuProperty {
  propertyId: string;           // Ex: "14"
  propertyName: string;         // Ex: "cor"
  optionId: string;             // Ex: "175"
  optionValue: string;          // Ex: "verde"
  optionLabel: string;          // Ex: "R36S Azul"
}

interface Metadata {
  currency: string;             // "BRL"
  minPrice: number;             // Menor preço entre SKUs
  maxPrice: number;             // Maior preço entre SKUs
  totalStock: number;           // Soma de todos os estoques
  hasImages: boolean;           // Se tem imagens de variantes
}
```

### Exemplo Real

```json
{
  "version": "1.0",
  "source": "aliexpress",
  "sourceProductId": "1005010526478274",
  "lastUpdated": "2026-02-01T23:29:56.853Z",
  
  "properties": [
    {
      "id": "14",
      "name": "cor",
      "type": "color",
      "options": [
        { "id": "175", "value": "R36S Azul", "label": "R36S Azul", "image": "https://..." },
        { "id": "29", "value": "R36MAX Branco", "label": "R36MAX Branco", "image": "https://..." }
      ]
    },
    {
      "id": "200000828",
      "name": "pacote",
      "type": "style",
      "options": [
        { "id": "201589808", "value": "128GB22000game", "label": "128GB22000game", "image": null },
        { "id": "201589807", "value": "64GB18000game", "label": "64GB18000game", "image": null }
      ]
    }
  ],
  
  "skus": [
    {
      "skuId": "12000052705135601",
      "skuAttr": "14:175#R36S Blue;200000828:201589808#128GB22000game",
      "price": 158.30,           // ← PREÇO DE CUSTO ATUALIZADO
      "originalPrice": 325.18,
      "stock": 697,
      "available": true,
      "image": "https://ae01.alicdn.com/kf/...",
      "properties": [
        { "propertyId": "14", "propertyName": "cor", "optionId": "175", "optionValue": "verde", "optionLabel": "R36S Azul" },
        { "propertyId": "200000828", "propertyName": "Pacote", "optionId": "201589808", "optionValue": "Pacote 2", "optionLabel": "128GB22000game" }
      ]
    }
  ],
  
  "metadata": {
    "currency": "BRL",
    "minPrice": 127.86,
    "maxPrice": 205.99,
    "totalStock": 13950,
    "hasImages": true
  }
}
```

---

## 🔗 Relacionamento entre as Estruturas

```
┌─────────────────────────────────────────────────────────────────┐
│                         VARIANTS (API)                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ skus[].skuId: "12000052705135601"                       │   │
│  │ skus[].price: 158.30  ← PREÇO DE CUSTO (atualizado)     │   │
│  │ skus[].stock: 697     ← ESTOQUE REAL                    │   │
│  └────────────────────────────┬────────────────────────────┘   │
│                               │                                 │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                         MATCH BY skuId
                                │
┌───────────────────────────────┼─────────────────────────────────┐
│                               ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ selectedSkus[].skuId: "12000052705135601"               │   │
│  │ selectedSkus[].costPrice: 158.30  ← ATUALIZADO NA SYNC  │   │
│  │ selectedSkus[].customPrice: 197.77 ← PREÇO DE VENDA     │   │
│  │ selectedSkus[].margin: 20         ← MARGEM CONFIGURADA  │   │
│  │ selectedSkus[].stock: 697         ← SINCRONIZADO        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                      SELECTEDSKUS (Vendedor)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Como a Sincronização Funciona

```javascript
// Pseudo-código da sincronização
for (const selectedSku of selectedSkus) {
  // Busca o SKU correspondente nos variants
  const apiSku = variants.skus.find(s => s.skuId === selectedSku.skuId);
  
  if (apiSku) {
    // Atualiza preço de custo
    selectedSku.costPrice = apiSku.price;
    
    // Atualiza estoque
    selectedSku.stock = apiSku.stock;
    
    // Recalcula preço de venda mantendo a margem
    selectedSku.customPrice = apiSku.price * (1 + selectedSku.margin / 100);
  }
}
```

---

## 📝 Campos Chave para Referência Rápida

### Quando preciso do PREÇO DE VENDA (cliente paga):
```javascript
selectedSkus[].customPrice  // R$ 197.77
```

### Quando preciso do PREÇO DE CUSTO (AliExpress cobra):
```javascript
selectedSkus[].costPrice    // R$ 158.30
// OU
variants.skus[].price       // R$ 158.30 (fonte original)
```

### Quando preciso do ESTOQUE:
```javascript
selectedSkus[].stock        // 697 (sincronizado)
// OU
variants.skus[].stock       // 697 (fonte original)
```

### Quando preciso da MARGEM:
```javascript
selectedSkus[].margin       // 20 (%)
```

### Quando preciso do ID do SKU para fazer match:
```javascript
selectedSkus[].skuId === variants.skus[].skuId  // "12000052705135601"
```

### Quando preciso das PROPRIEDADES (cor, tamanho):
```javascript
variants.skus[].properties  // Array com detalhes das variações
variants.skus[].skuAttr     // String compacta: "14:175#R36S Blue;200000828:201589808"
```

---

## ⚠️ Armadilhas Comuns

### 1. Não confundir `price` com `customPrice`
```
❌ ERRADO: Usar variants.skus[].price para cobrar do cliente
✅ CERTO:  Usar selectedSkus[].customPrice para cobrar do cliente
```

### 2. Não confundir `stock` com `customStock`
```
stock       → Estoque REAL do AliExpress (sincronizado automaticamente)
customStock → Estoque CUSTOMIZADO pelo vendedor (editável manualmente)
```

### 3. O `skuId` é STRING, não NUMBER
```javascript
// Sempre compare como string
selectedSkus[].skuId === "12000052705135601"  // ✅
selectedSkus[].skuId === 12000052705135601    // ❌ Pode falhar
```

### 4. O campo `skuAttr` é composto
```
"14:175#R36S Blue;200000828:201589808#128GB22000game"
   │  │     │              │         │
   │  │     │              │         └── Valor da opção 2
   │  │     │              └── ID da propriedade 2 (pacote)
   │  │     └── Valor da opção 1
   │  └── ID da opção 1
   └── ID da propriedade 1 (cor)
```

---

## 🔄 Fluxo de Atualização

```
┌─────────────────────────────────────────────────────────────────┐
│                     CRON DE SINCRONIZAÇÃO                       │
│                  /api/cron/sync-aliexpress-stock                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Busca produtos com supplierSku (AliExpress)                 │
│  2. Chama API do AliExpress para cada produto                   │
│  3. Extrai skus[] da resposta                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Para cada selectedSku do produto:                           │
│     a. Encontra apiSku correspondente (by skuId)                │
│     b. Atualiza costPrice = apiSku.price                        │
│     c. Atualiza stock = apiSku.stock                            │
│     d. Recalcula customPrice = costPrice * (1 + margin/100)     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Salva no banco de dados:                                    │
│     - selectedSkus (atualizado)                                 │
│     - variants.skus[] (atualizado com novos preços)             │
│     - metadata.totalStock (recalculado)                         │
│     - lastSyncAt (timestamp)                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📌 Tabela de Campos Resumida

| Campo | Estrutura | Tipo | Descrição |
|-------|-----------|------|-----------|
| `skuId` | Ambos | string | ID único do SKU no AliExpress |
| `price` | variants.skus[] | number | Preço de custo atual |
| `originalPrice` | variants.skus[] | number | Preço cheio (sem desconto) |
| `costPrice` | selectedSkus[] | number | Cópia do price para cálculos |
| `customPrice` | selectedSkus[] | number | Preço final de venda |
| `margin` | selectedSkus[] | number | Margem de lucro (%) |
| `stock` | Ambos | number | Estoque real disponível |
| `customStock` | selectedSkus[] | number | Estoque personalizado |
| `enabled` | selectedSkus[] | boolean | SKU ativo para venda |
| `available` | Ambos | boolean | Disponível no fornecedor |
| `skuAttr` | variants.skus[] | string | Combinação de atributos |
| `properties` | variants.skus[] | array | Detalhes das variações |
| `image` | variants.skus[] | string | URL da imagem da variante |

---

## 🗄️ Onde Ficam no Banco de Dados

Tabela: `product`

| Coluna | Tipo | Contém |
|--------|------|--------|
| `selectedSkus` | JSON | Array de SKUs personalizados |
| `variants` | JSON | Objeto completo de variantes |
| `supplierSku` | VARCHAR | ID do produto no AliExpress |
| `lastSyncAt` | DATETIME | Última sincronização |

```sql
-- Consultar SKUs de um produto
SELECT 
  id,
  name,
  JSON_EXTRACT(selectedSkus, '$[0].customPrice') as primeiro_preco_venda,
  JSON_EXTRACT(selectedSkus, '$[0].costPrice') as primeiro_preco_custo,
  JSON_EXTRACT(variants, '$.metadata.totalStock') as estoque_total
FROM product 
WHERE supplierSku = '1005010526478274';
```

---

## ✅ Checklist de Debugging

Quando algo não funciona na sincronização:

- [ ] O `skuId` está sendo comparado como STRING?
- [ ] O `variants.skus[]` tem dados atualizados?
- [ ] O `selectedSkus[]` contém o mesmo `skuId`?
- [ ] A margem está correta para recalcular o preço?
- [ ] O `costPrice` foi atualizado junto com o `customPrice`?
- [ ] O `lastSyncAt` foi atualizado?

---

*Documento criado para referência rápida. Sempre consulte antes de analisar problemas de preços/estoque.*
