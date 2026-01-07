# 🚀 Sistema de Dropshipping Multi-Marketplace

## 📋 Visão Geral do Fluxo

```
┌─────────────────────────────────────────────────────────┐
│                  FORNECEDORES DROPSHIPPING              │
│                                                          │
│  • Shopify (com API)                                    │
│  • Fornecedor 1 (com API)                               │
│  • Fornecedor 2 (manual)                                │
│  • Outros...                                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 1. Cadastro/Importação de Produtos
                 ↓
┌─────────────────────────────────────────────────────────┐
│              SISTEMA LOCAL (Next.js + MySQL)            │
│                                                          │
│  • Gerenciamento de produtos                            │
│  • Cálculo automático de margens                        │
│  • Estoque centralizado                                 │
│  • Painel administrativo                                │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 2. Listagem de Produtos
                 ↓
┌─────────────────────────────────────────────────────────┐
│                PLATAFORMAS DE VENDA                     │
│                                                          │
│  ✓ Mercado Livre (implementado)                         │
│  ⏳ Amazon (em breve)                                    │
│  ⏳ Shopee (em breve)                                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 3. Venda realizada (Webhook)
                 ↓
┌─────────────────────────────────────────────────────────┐
│         SISTEMA LOCAL - Pedido Importado                │
│                                                          │
│  • Pedido criado automaticamente                        │
│  • Origem identificada (ML/Amazon/etc)                  │
│  • Lucro calculado                                      │
│  • Aguardando envio ao fornecedor                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 4. Envio ao Fornecedor
                 ↓
┌─────────────────────────────────────────────────────────┐
│              FORNECEDOR PROCESSA PEDIDO                 │
│                                                          │
│  • Pedido enviado via API (automático)                  │
│  • Ou enviado manualmente                               │
│  • Fornecedor envia produto ao cliente                  │
│  • Tracking code retornado                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Componentes Implementados

### 1️⃣ **Database Schema (Prisma)**

#### Novos Modelos:
- **MercadoLivreAuth**: Armazena tokens OAuth do ML
- **ShopifyAuth**: Credenciais da loja Shopify (fornecedor)

#### Modelo Order Estendido:
```prisma
model Order {
  marketplaceName      String?   // "Mercado Livre", "Amazon", "Direct"
  marketplaceOrderId   String?   // ID único do pedido no marketplace
  sentToSupplier       Boolean   // Se já foi enviado ao fornecedor
  sentToSupplierAt     DateTime? // Data de envio
  supplierOrderId      String?   // ID retornado pelo fornecedor
  trackingCode         String?   // Código de rastreio
}
```

---

### 2️⃣ **Webhook do Mercado Livre**

**Endpoint**: `/api/webhooks/mercadolivre`

**O que faz**:
- Recebe notificação quando há venda no ML
- Busca detalhes do pedido via ML API
- Cria Order no sistema local automaticamente
- Calcula lucro com base no produto
- Marca como "aguardando envio ao fornecedor"

**Como configurar no ML**:
1. Acesse https://developers.mercadolivre.com.br
2. Seu App → Webhooks
3. Adicione: `https://seu-dominio.com/api/webhooks/mercadolivre`
4. Marque "orders_v2"

---

### 3️⃣ **Integração Shopify**

#### Páginas:
- `/admin/integracao/shopify` - Configuração e importação

#### APIs:
- **POST** `/api/admin/integrations/shopify/configure`  
  Salva credenciais (storeUrl, accessToken)

- **POST** `/api/admin/integrations/shopify/import-products`  
  Importa produtos do Shopify para o sistema local

- **GET** `/api/admin/integrations/shopify/import-products`  
  Verifica status da conexão

#### Como configurar:
1. Acesse admin do Shopify
2. Settings → Apps and sales channels
3. "Develop apps" → Criar app privado
4. Permissões: `read_products`, `write_draft_orders`
5. Instale o app e copie o Access Token
6. Cole no painel `/admin/integracao/shopify`

---

### 4️⃣ **Envio de Pedidos ao Fornecedor**

**Endpoint**: `/api/admin/orders/send-to-supplier`

**Fluxo**:
1. Admin visualiza pedido do ML no painel
2. Clica em "Enviar ao Fornecedor"
3. Sistema identifica fornecedor do produto
4. **Se fornecedor tem API**: Envia automaticamente
5. **Se não tem API**: Marca como "enviar manualmente"

#### Exemplo para Shopify:
- Cria **Draft Order** no Shopify via API
- Fornecedor processa o draft order
- Retorna ID do pedido
- Fornecedor envia produto diretamente ao cliente

---

## 📊 Painel Administrativo

### Gestão de Fornecedores
- `/admin/fornecedores`
- Cadastrar fornecedor com:
  - Nome, contato, comissão
  - API URL e API Key (opcional)
  - Se não tiver API, envio será manual

### Gestão de Produtos
- `/admin/produtos/novo`
- Campos de dropshipping:
  - Fornecedor
  - Preço de custo
  - Margem (calculada em tempo real)
  - SKU do fornecedor
  - URL do produto no fornecedor

### Pedidos
- `/admin/pedidos`
- Mostra:
  - Origem do pedido (ML, Amazon, Direto)
  - Status de envio ao fornecedor
  - Botão "Enviar ao Fornecedor"
  - Tracking code

### Integrações
- `/admin/integracao`
- Cards para:
  - Mercado Livre (conectar OAuth)
  - Shopify (importar produtos)
  - Amazon (em breve)
  - Shopee (em breve)

---

## 🔐 Configurações Necessárias

### Arquivo `.env`

```env
# Database
DATABASE_URL="mysql://root@localhost:3306/ecommerce"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="seu-secret-aqui"

# Mercado Livre
NEXT_PUBLIC_MERCADOLIVRE_CLIENT_ID="seu-client-id"
MERCADOLIVRE_CLIENT_SECRET="seu-client-secret"

# Shopify (Fornecedor DROP)
# Configurado via painel admin
```

---

## 🎯 Como Usar

### Passo 1: Configurar Fornecedores
1. Acesse `/admin/fornecedores/novo`
2. Cadastre seus fornecedores DROP
3. Para Shopify: adicione API URL e Key

### Passo 2: Importar/Cadastrar Produtos
**Opção A - Shopify**:
1. `/admin/integracao/shopify`
2. Configure credenciais
3. Clique em "Importar Produtos"

**Opção B - Manual**:
1. `/admin/produtos/novo`
2. Preencha dados
3. Selecione fornecedor
4. Margem é calculada automaticamente

### Passo 3: Listar no Mercado Livre
1. `/admin/integracao/mercadolivre`
2. Conecte sua conta ML
3. Clique em "Listar Produtos"

### Passo 4: Configurar Webhook ML
1. Mercado Livre Developers
2. Adicione webhook: `/api/webhooks/mercadolivre`
3. Ative notificações de "orders_v2"

### Passo 5: Receber Vendas
- **Automático via webhook**:
  - Venda no ML → Webhook dispara
  - Pedido criado no sistema
  - Notificação ao admin

### Passo 6: Enviar ao Fornecedor
1. `/admin/pedidos`
2. Visualize pedidos pendentes
3. Clique em "Enviar ao Fornecedor"
4. Sistema envia via API (ou marca para envio manual)

### Passo 7: Atualizar Tracking
- Fornecedor retorna código de rastreio
- Sistema atualiza no ML automaticamente
- Cliente recebe notificação

---

## 📈 Recursos Futuros

### Prioridade Alta
- [ ] Sincronização de estoque ML ↔ Sistema ↔ Fornecedor
- [ ] Webhook para atualização de tracking
- [ ] Painel de pedidos com filtros avançados
- [ ] Notificações push/email para novas vendas

### Prioridade Média
- [ ] Integração Amazon Seller Central
- [ ] Integração Shopee
- [ ] Relatórios de lucro por marketplace
- [ ] Exportação de relatórios (CSV/PDF)

### Prioridade Baixa
- [ ] App mobile (React Native)
- [ ] Integração com WhatsApp Business
- [ ] Chat com clientes
- [ ] Sistema de tickets

---

## 🐛 Troubleshooting

### Webhook ML não está funcionando
1. Verifique se a URL está acessível publicamente
2. Use ngrok para desenvolvimento local
3. Verifique logs do webhook: `console.log`

### Produtos não importam do Shopify
1. Verifique se o Access Token tem permissões corretas
2. Teste conexão via GET em `/api/admin/integrations/shopify/import-products`
3. Verifique logs do navegador

### Pedido não envia ao fornecedor
1. Verifique se fornecedor tem API URL configurada
2. Teste API do fornecedor manualmente (Postman)
3. Verifique se fornecedor está vinculado ao produto

---

## 📞 Suporte

Para dúvidas:
1. Consulte documentação oficial:
   - Mercado Livre: https://developers.mercadolivre.com.br
   - Shopify: https://shopify.dev/docs
2. Logs do sistema: verifique terminal do Next.js
3. Logs do banco: verifique Prisma Studio

---

## ✅ Checklist de Implementação

- [x] Schema Prisma com marketplace tracking
- [x] Webhook Mercado Livre
- [x] Integração Shopify (importar produtos)
- [x] API envio pedido ao fornecedor
- [x] Página config Shopify
- [x] Atualização painel de integrações
- [ ] Painel de pedidos com marketplace info
- [ ] Sincronização de tracking
- [ ] Testes end-to-end

---

**Versão**: 1.0.0  
**Última Atualização**: 04/01/2026
