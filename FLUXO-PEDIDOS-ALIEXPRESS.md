# 📦 Fluxo de Pedidos AliExpress Dropshipping

## 🔄 Fluxo Completo

### 1️⃣ **Criação do Pedido no Sistema**
- Cliente faz pedido no seu e-commerce
- Pedido registrado no banco de dados com status `PENDING`
- Campos importantes:
  - `id`: ID interno do pedido
  - `userId`: Cliente que fez o pedido
  - `shippingAddress`: Endereço de entrega
  - `items`: Lista de produtos comprados

### 2️⃣ **Envio ao Fornecedor AliExpress**

Quando o admin clica em **"Enviar ao Fornecedor"**:

#### **a) Consulta de Frete**
```typescript
API: aliexpress.ds.freight.query
Parâmetros:
- queryDeliveryReq: JSON.stringify({
    country: "BR",
    product_id: "1005009511867537",
    product_num: 2,
    sku_id: ""
  })

Retorna:
- Métodos de envio disponíveis
- Custo de cada método
- Tempo estimado de entrega
```

#### **b) Criação do Pedido**
```typescript
API: aliexpress.ds.order.create
Parâmetros:
- param_place_order_request4_open_api_d_t_o: JSON.stringify({
    product_items: [
      { product_id: "1005009511867537", product_count: 2, sku_attr: "" }
    ],
    logistics_address: {
      address: "Rua Exemplo, 123",
      city: "São Paulo",
      contact_person: "João Silva",
      country: "BR",
      mobile_no: "11999999999",
      phone_country: "BR",
      province: "SP",
      zip: "01234-567"
    },
    logistics_service_name: "CAINIAO_STANDARD"
  })

Retorna:
{
  order_id: "8123456789012345",          // 📋 Número do pedido AliExpress
  order_list: [...],                      // Lista de sub-pedidos (por produto)
  is_success: true,
  payment_url: "https://...",             // 💳 URL para pagar
  checkout_info: {...}
}
```

### 3️⃣ **Status do Pedido Criado**

Após criar o pedido:
- ✅ Pedido foi criado no AliExpress
- ⚠️ **IMPORTANTE**: O pedido ainda NÃO está pago!
- 💳 É necessário acessar a `payment_url` para completar o pagamento

**O que acontece:**
```
1. Sistema cria pedido no AliExpress ✅
2. AliExpress retorna:
   - order_id: 8123456789012345
   - payment_url: https://pay.aliexpress.com/...
3. Sistema salva supplierOrderId no banco
4. Admin vê no console:
   - 📋 Número do Pedido: 8123456789012345
   - 💰 URL de Pagamento: https://pay.aliexpress.com/...
   - ⚠️ IMPORTANTE: Acesse a URL para pagar!
```

### 4️⃣ **Pagamento do Pedido**

#### **Como pagar:**
1. Copie a `payment_url` do console ou do componente de status
2. Acesse a URL no navegador
3. Faça login na sua conta AliExpress
4. Complete o pagamento (cartão de crédito, saldo, etc.)

#### **Ou use a página de detalhes:**
- Acesse `/admin/pedidos/[id]`
- Se o pedido ainda não foi pago, verá um card com:
  - ⚠️ **Pagamento Pendente**
  - Botão **"💳 Pagar Agora"** que abre a URL de pagamento

### 5️⃣ **Acompanhamento do Status**

Use a API `aliexpress.ds.order.get` para consultar:

```typescript
Endpoint: /api/admin/orders/aliexpress-status
POST { orderId, aliexpressOrderId }

Retorna:
{
  order_id: "8123456789012345",
  order_status: "PLACE_ORDER_SUCCESS" | "WAIT_SELLER_SEND_GOODS" | "IN_TRANSIT" | "FINISH",
  payment_status: "WAIT_BUYER_PAY" | "PAY_SUCCESS",
  payment_time: "2026-01-05T10:30:00",
  tracking_number: "LP00123456789BR",
  logistics_service_name: "CAINIAO_STANDARD",
  total_amount: { currency: "USD", amount: "45.99" }
}
```

#### **Status possíveis:**

| Status do Pedido | Significado | Ação |
|-----------------|-------------|------|
| `PLACE_ORDER_SUCCESS` | Pedido criado | Pagar |
| `WAIT_BUYER_PAY` | Aguardando pagamento | Completar pagamento |
| `PAY_SUCCESS` | Pagamento confirmado | Aguardar envio |
| `WAIT_SELLER_SEND_GOODS` | Aguardando envio do fornecedor | Monitorar |
| `WAIT_BUYER_ACCEPT_GOODS` | Em trânsito | Rastrear |
| `FINISH` | Pedido finalizado | ✅ Concluído |

### 6️⃣ **Fluxo Visual no Sistema**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ADMIN: "Enviar ao Fornecedor" (botão na listagem)       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SISTEMA: Consulta métodos de frete disponíveis          │
│    API: aliexpress.ds.freight.query                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SISTEMA: Cria pedido no AliExpress                       │
│    API: aliexpress.ds.order.create                          │
│    Retorna: order_id + payment_url                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CONSOLE: Mostra informações do pedido                    │
│    ✅ Pedido criado: 8123456789012345                       │
│    💰 URL de Pagamento: https://pay.aliexpress.com/...      │
│    ⚠️ AÇÃO NECESSÁRIA: Acessar URL e pagar!                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. ADMIN: Acessa detalhes do pedido                         │
│    /admin/pedidos/[id]                                       │
│    Vê card "Status AliExpress" com botão "Pagar Agora"     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. ADMIN: Clica em "💳 Pagar Agora"                        │
│    Abre payment_url em nova aba                             │
│    Faz login no AliExpress e paga                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. ADMIN: Consulta status (botão "🔍 Consultar Status")   │
│    API: aliexpress.ds.order.get                             │
│    Vê: payment_status = "PAY_SUCCESS"                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. FORNECEDOR: Processa e envia o pedido                    │
│    Status muda para: "WAIT_BUYER_ACCEPT_GOODS"             │
│    Sistema recebe tracking_number                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. CLIENTE: Recebe o produto                                │
│    Admin pode atualizar status local para "DELIVERED"      │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Checklist de Implementação

### ✅ Já Implementado:
- [x] API para criar pedido (`aliexpress.ds.order.create`)
- [x] API para consultar frete (`aliexpress.ds.freight.query`)
- [x] API para consultar status (`aliexpress.ds.order.get`)
- [x] Componente visual de status (`AliExpressOrderStatus`)
- [x] Logs detalhados com order_id e payment_url
- [x] Integração na página de detalhes do pedido
- [x] Botão "Pagar Agora" quando pagamento pendente

### 📋 Campos Importantes no Banco:

```prisma
model Order {
  supplierOrderId   String?     // ID do pedido no AliExpress (ex: 8123456789012345)
  trackingCode      String?     // Código de rastreio (atualizado após envio)
  sentToSupplier    Boolean     // true = pedido foi criado no AliExpress
  sentToSupplierAt  DateTime?   // Data/hora que foi criado
}
```

### 🔑 Informações Retornadas pela API:

#### **Ao criar pedido:**
```json
{
  "order_id": "8123456789012345",
  "payment_url": "https://pay.aliexpress.com/checkout.htm?orderId=...",
  "is_success": true,
  "order_list": [
    {
      "product_id": "1005009511867537",
      "order_id": "8123456789012345"
    }
  ]
}
```

#### **Estrutura correta dos parâmetros:**

**Frete (queryDeliveryReq):**
```json
{
  "country": "BR",
  "product_id": "1005009511867537",
  "product_num": 2,
  "sku_id": ""
}
```

**Pedido (param_place_order_request4_open_api_d_t_o):**
```json
{
  "product_items": [
    {
      "product_id": "1005009511867537",
      "product_count": 2,
      "sku_attr": ""
    }
  ],
  "logistics_address": {
    "address": "Rua Exemplo, 123",
    "city": "São Paulo",
    "contact_person": "João Silva",
    "country": "BR",
    "mobile_no": "11999999999",
    "phone_country": "BR",
    "province": "SP",
    "zip": "01234-567"
  },
  "logistics_service_name": "CAINIAO_STANDARD"
}
```

#### **Ao consultar status:**
```json
{
  "order_id": "8123456789012345",
  "order_status": "WAIT_BUYER_PAY",
  "payment_status": "WAIT_BUYER_PAY",
  "logistics_status": "NO_LOGISTICS",
  "tracking_number": null,
  "total_amount": {
    "currency": "USD",
    "amount": "45.99"
  },
  "payment_url": "https://pay.aliexpress.com/..."
}
```

## 🚨 Pontos de Atenção

### 1. **Pagamento é Manual**
- A API `aliexpress.ds.order.create` NÃO processa pagamento automaticamente
- Ela apenas CRIA o pedido e retorna uma URL de pagamento
- Admin precisa acessar a URL e pagar manualmente

### 2. **Erros Comuns**
- `B_DROPSHIPPER_DELIVERY_ADDRESS_VALIDATE_FAIL`: Endereço inválido, revisar formato
- `PRICE_PAY_CURRENCY_ERROR`: Produtos com moedas diferentes
- `DELIVERY_METHOD_NOT_EXIST`: Método de frete inválido

### 3. **Campos Obrigatórios**
- **Para consulta de frete**: `queryDeliveryReq` (objeto JSON com country, product_id, product_num)
- **Para criação de pedido**: `param_place_order_request4_open_api_d_t_o` (objeto JSON com product_items, logistics_address, logistics_service_name)
- ⚠️ **IMPORTANTE**: Os parâmetros devem ser enviados como objetos JSON dentro de parâmetros wrapper específicos, não como parâmetros individuais!

## 📚 Referências

- **API Dropshipping**: Use APIs `aliexpress.ds.*` (não `aliexpress.trade.*`)
- **Documentação**: https://developers.aliexpress.com/
- **Registro**: Criar App com tipo "Drop Shipping" no AE-Openplatform
- **Permissões**: Scope `ds_access` no OAuth

## 🎉 Resumo

1. **Criar pedido** → Retorna `order_id` + `payment_url`
2. **Pagar** → Acessar `payment_url` e completar pagamento
3. **Consultar status** → Ver se pagamento foi confirmado
4. **Aguardar envio** → Fornecedor processa e envia
5. **Rastrear** → Receber `tracking_number` e acompanhar
