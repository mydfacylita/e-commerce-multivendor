# Sistema de Pedidos Híbridos

## 📦 Visão Geral

O sistema agora suporta **pedidos híbridos**, permitindo que um único pedido contenha tanto produtos de **estoque próprio** quanto produtos de **dropshipping**. Isso oferece máxima flexibilidade para vendedores que operam em ambos os modelos.

## 🏗️ Estrutura

### ItemType (Enum)

Cada item do pedido possui um tipo que define sua origem:

- **STOCK**: Produto do estoque próprio do vendedor
- **DROPSHIPPING**: Produto de dropshipping (fornecedor externo)

### Campos do OrderItem

```typescript
{
  itemType: 'DROPSHIPPING' | 'STOCK',
  sellerId: string,                  // ID do vendedor
  commissionAmount: number,          // Valor da comissão
  commissionRate: number,            // Taxa de comissão (%)
  sellerRevenue: number,             // Receita do vendedor
  supplierOrderId?: string,          // ID no fornecedor (AliExpress, etc)
  supplierStatus?: string,           // Status no fornecedor
  supplierCost?: number,             // Custo pago ao fornecedor
  trackingCode?: string,             // Rastreio específico do item
}
```

## 💰 Cálculo de Comissões

### Produto de Estoque Próprio (STOCK)

**Fórmula:**
```
Total do Item = Preço × Quantidade
Comissão da Plataforma = Total × (Taxa de Comissão do Vendedor / 100)
Receita do Vendedor = Total - Comissão da Plataforma
```

**Exemplo:**
- Produto: R$ 100,00
- Quantidade: 2
- Taxa de Comissão: 10%

```
Total = R$ 100 × 2 = R$ 200
Comissão = R$ 200 × 0,10 = R$ 20
Receita Vendedor = R$ 200 - R$ 20 = R$ 180
```

### Produto de Dropshipping (DROPSHIPPING)

**Fórmula:**
```
Total do Item = Preço × Quantidade
Comissão do Vendedor = Total × (Taxa de Comissão do Produto / 100)
Receita do Vendedor = Comissão do Vendedor
```

**Exemplo:**
- Produto: R$ 150,00
- Quantidade: 1
- Taxa de Comissão: 15%
- Custo do Fornecedor: R$ 80,00

```
Total = R$ 150 × 1 = R$ 150
Comissão Vendedor = R$ 150 × 0,15 = R$ 22,50
Receita Vendedor = R$ 22,50
```

**Nota:** O custo do fornecedor (R$ 80) é pago pela plataforma ou pelo vendedor do produto original.

## 🔄 Fluxo de Pedido Híbrido

### 1. Cliente Adiciona Itens ao Carrinho

```typescript
// Carrinho pode conter ambos os tipos
carrinho = [
  { productId: 'prod1', tipo: 'STOCK' },      // Estoque próprio
  { productId: 'prod2', tipo: 'DROPSHIPPING' }, // Dropshipping
]
```

### 2. Checkout e Criação do Pedido

```typescript
// API: POST /api/orders
// O sistema automaticamente identifica o tipo de cada item
order = {
  items: [
    {
      productId: 'prod1',
      itemType: 'STOCK',          // ← Detectado automaticamente
      commissionRate: 10,          // Taxa do vendedor
      sellerRevenue: 180,          // Recebe após deduzir comissão
    },
    {
      productId: 'prod2',
      itemType: 'DROPSHIPPING',    // ← Detectado automaticamente
      commissionRate: 15,          // Taxa do produto
      sellerRevenue: 22.50,        // Recebe apenas comissão
      supplierCost: 80,            // Custo do fornecedor
    }
  ]
}
```

### 3. Processamento do Pedido

**Para itens STOCK:**
1. ✅ Debitar do estoque
2. ✅ Vendedor separa e embala
3. ✅ Vendedor gera código de rastreio
4. ✅ Atualiza status: PROCESSING → SHIPPED → DELIVERED

**Para itens DROPSHIPPING:**
1. ✅ Enviar pedido ao fornecedor (AliExpress, etc)
2. ✅ Aguardar confirmação (`supplierOrderId`)
3. ✅ Monitorar status (`supplierStatus`)
4. ✅ Receber rastreio (`trackingCode`)
5. ✅ Atualizar status: PROCESSING → SHIPPED → DELIVERED

### 4. Visualização para o Vendedor

Na página de pedidos, o vendedor vê indicadores visuais:

```
📦 Item Dropshipping - aguardando fornecedor
🏪 Item Estoque - enviar hoje
```

**Badge do Pedido:**
- 🏪 **Estoque**: Todos os itens são do estoque próprio
- 📦 **Dropshipping**: Todos os itens são dropshipping
- 🔄 **Híbrido**: Mistura de ambos os tipos

## 🚚 Fluxo de Envio

### Pedido 100% Estoque Próprio

```
[PEDIDO] → [VENDEDOR EMBALA] → [TRANSPORTADORA] → [CLIENTE]
         |
         └─ 1 código de rastreio
```

### Pedido 100% Dropshipping

```
[PEDIDO] → [FORNECEDOR EXTERNO] → [CLIENTE]
         |
         └─ 1 código de rastreio (do fornecedor)
```

### Pedido Híbrido

```
[PEDIDO]
  ├─ Item A (STOCK) → [VENDEDOR EMBALA] → [TRANSPORTADORA] → [CLIENTE]
  |                  |
  |                  └─ Rastreio 1: BR123456789
  |
  └─ Item B (DROP)  → [FORNECEDOR] → [CLIENTE]
                     |
                     └─ Rastreio 2: AE987654321
```

**Importante:** Em pedidos híbridos, pode haver **múltiplos códigos de rastreio** (um por item ou grupo de itens).

## 📊 Relatórios e Dashboard

### Estatísticas por Tipo

```typescript
GET /api/vendedor/produtos/estoque?type=all
{
  stats: {
    totalProducts: 150,
    stockProducts: 100,        // 🏪 Estoque próprio
    dropshippingProducts: 50,  // 📦 Dropshipping
    totalStock: 2500           // Estoque físico total
  }
}
```

### Filtros Disponíveis

```typescript
// Listar apenas produtos de estoque próprio
GET /api/vendedor/produtos/estoque?type=stock

// Listar apenas produtos de dropshipping
GET /api/vendedor/produtos/estoque?type=dropshipping

// Listar todos
GET /api/vendedor/produtos/estoque?type=all
```

## 🎯 Casos de Uso

### Caso 1: Vendedor Iniciante (100% Dropshipping)

```
Produtos: Todos com isDropshipping = true
Pedidos: Todos itens são DROPSHIPPING
Receita: Apenas comissões (15-30%)
Risco: Baixo (sem estoque)
```

### Caso 2: Vendedor Estabelecido (100% Estoque)

```
Produtos: Todos com isDropshipping = false
Pedidos: Todos itens são STOCK
Receita: Total menos comissão da plataforma (90%)
Risco: Médio (precisa gerenciar estoque)
```

### Caso 3: Vendedor Híbrido (Mix)

```
Produtos: 
  - 70% dropshipping (baixo risco, menor margem)
  - 30% estoque (maior margem, produtos populares)

Pedidos: Podem conter ambos os tipos
Receita: Mista (comissão + receita própria)
Risco: Balanceado

Estratégia: 
  - Produtos novos/teste → dropshipping
  - Produtos validados → estoque próprio
```

## 🔧 Implementação Técnica

### Migration SQL

```sql
ALTER TABLE `orderitem`
  ADD COLUMN `itemType` ENUM('DROPSHIPPING', 'STOCK') NOT NULL DEFAULT 'STOCK',
  ADD COLUMN `supplierOrderId` VARCHAR(191) NULL,
  ADD COLUMN `supplierStatus` VARCHAR(191) NULL,
  ADD COLUMN `supplierCost` DOUBLE NULL,
  ADD COLUMN `trackingCode` VARCHAR(191) NULL,
  ADD INDEX `orderitem_itemType_idx` (`itemType`),
  ADD INDEX `orderitem_sellerId_idx` (`sellerId`);
```

### Atualização de Dados Existentes

```sql
-- Migrar dados existentes baseado no produto
UPDATE `orderitem` oi
INNER JOIN `product` p ON oi.productId = p.id
SET oi.itemType = IF(p.isDropshipping = 1, 'DROPSHIPPING', 'STOCK');
```

## 📝 Checklist de Integração

- [x] Schema Prisma atualizado com ItemType enum
- [x] Migration SQL aplicada sem perda de dados
- [x] Lógica de comissão atualizada (lib/commission.ts)
- [x] API de criação de pedidos atualizada
- [x] Interface do vendedor mostra indicadores visuais
- [x] Filtros por tipo de produto funcionando
- [x] Cálculo correto para itens STOCK
- [x] Cálculo correto para itens DROPSHIPPING
- [x] Cálculo correto para pedidos HÍBRIDOS
- [x] Documentação completa

## 🚀 Próximos Passos

1. **Integração com Fornecedores**
   - Envio automático de pedidos ao AliExpress
   - Sincronização de status e rastreio
   - Webhook para atualizações

2. **Dashboard Avançado**
   - Gráficos de receita por tipo
   - Comparativo de margem: estoque vs dropshipping
   - Análise de ROI por produto

3. **Automações**
   - Auto-converter produtos de dropshipping para estoque
   - Alertas de produtos com alta demanda
   - Sugestões de produtos para estocagem

## 📞 Suporte

Para dúvidas sobre pedidos híbridos:
- Documentação: `/docs/PEDIDOS-HIBRIDOS.md`
- API Reference: `/docs/api/orders.md`
- Exemplos: `/examples/hybrid-orders/`

---

**Atualizado em:** 08/01/2026  
**Versão:** 1.0.0
