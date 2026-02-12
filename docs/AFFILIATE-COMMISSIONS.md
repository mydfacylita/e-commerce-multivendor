# Sistema de Comissões de Afiliados - Automação

## 📋 Visão Geral

O sistema processa comissões de afiliados **automaticamente** quando pedidos são marcados como **ENTREGUES** (DELIVERED) ou **CANCELADOS** (CANCELLED).

## 🔄 Fluxo de Status

```mermaid
graph LR
    A[Pedido Criado] --> B[PENDING]
    B --> C[PROCESSING]
    C --> D[SHIPPED]
    D --> E[DELIVERED]
    E --> F[💰 Comissão CONFIRMADA]
    F --> G[⏳ Aguardar 7 dias]
    G --> H[✅ Disponível para Saque]
    H --> I[👤 Afiliado solicita saque]
    I --> J[PAID - Em processamento]
    
    B --> K[CANCELLED]
    K --> L[❌ Comissão Cancelada]
```

### Status da Comissão

- **PENDING**: Aguardando entrega do pedido
- **CONFIRMED**: Pedido entregue, aguardando 7 dias (período de carência para devolução)
- **PAID**: Afiliado solicitou saque, comissão em processamento
- **CANCELLED**: Pedido cancelado, comissão estornada

### Período de Carência

⚠️ **IMPORTANTE:** Após a entrega do pedido, há um **período de carência de 7 dias** antes da comissão ficar disponível para saque.

**Por quê?** O cliente tem 7 dias para solicitar devolução do produto. Se houver devolução, a comissão é cancelada automaticamente.

**Fluxo:**
1. Pedido entregue (DELIVERED) → Comissão muda para CONFIRMED
2. Sistema define `availableAt = dataEntrega + 7 dias`
3. Após 7 dias → Comissão aparece como "Disponível para Saque"
4. Afiliado solicita saque → Comissão muda para PAID

## 🚀 Métodos de Automação

### 1. API Admin (Manual)

Atualizar status do pedido manualmente via painel admin:

```typescript
PATCH /api/admin/orders/[id]/status
Authorization: Bearer <session-token>

Body:
{
  "status": "DELIVERED" // ou "CANCELLED"
}

Resposta:
{
  "message": "Status atualizado com sucesso",
  "order": { ... },
  "affiliate": {
    "success": true,
    "message": "Comissão liberada e creditada",
    "amount": 0.50,
    "affiliate": "Nome do Afiliado"
  }
}
```

### 2. Webhook (Automático)

Ideal para integrações com gateways de pagamento, Correios, etc:

```typescript
POST /api/webhooks/order-status

Body:
{
  "orderId": "ca11ye041...",
  "status": "DELIVERED",
  "source": "correios", // opcional
  "metadata": {
    "trackingCode": "BR123456789BR",
    "deliveredAt": "2026-01-01T10:00:00Z"
  }
}

Resposta:
{
  "message": "Status atualizado com sucesso",
  "orderId": "ca11ye041...",
  "oldStatus": "SHIPPED",
  "newStatus": "DELIVERED",
  "source": "correios",
  "affiliate": {
    "success": true,
    "message": "Comissão liberada e creditada",
    "amount": 0.50
  }
}
```

**Configurar no Mercado Pago:**
```
URL: https://seusite.com/api/webhooks/order-status
Method: POST
Events: payment.updated, payment.delivered
```

**Configurar no Correios:**
```
URL: https://seusite.com/api/webhooks/order-status
Method: POST
Events: object.delivered
```

### 3. Cron Job (Automático Periódico)

Processar comissões pendentes periodicamente (recomendado: a cada 1 hora).

**Executar todos os pedidos entregues:**

```bash
curl -X GET \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  https://seusite.com/api/jobs/process-affiliate-commissions
```

**Executar pedidos específicos:**

```bash
curl -X POST \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"orderIds": ["ca11ye041...", "ca11ye042..."]}' \
  https://seusite.com/api/jobs/process-affiliate-commissions
```

**Configurar no Vercel Cron:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/jobs/process-affiliate-commissions",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Configurar no Linux Crontab:**

```bash
# Executar a cada hora
0 * * * * curl -X GET -H "Authorization: Bearer SEU_CRON_SECRET" https://seusite.com/api/jobs/process-affiliate-commissions

# Executar a cada 30 minutos
*/30 * * * * curl -X GET -H "Authorization: Bearer SEU_CRON_SECRET" https://seusite.com/api/jobs/process-affiliate-commissions
```

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Adicionar no `.env`:

```bash
# Secret para proteger cron jobs
CRON_SECRET=seu-secret-aleatorio-super-seguro-aqui
```

Gerar um secret seguro:

```bash
openssl rand -base64 32
```

### 2. Monitoramento

Todos os processos geram logs detalhados:

```bash
🎯 [AFILIADO] Verificando comissão para pedido: ca11ye041...
   📦 Pedido ENTREGUE - Liberando comissão
   💰 R$ 0.50 creditados na conta MYD
   👤 Afiliado: Maria Silva
   ✅ Comissão liberada e creditada
```

## 🧪 Testando o Sistema

### 1. Testar via API Admin

```bash
# Marcar pedido como entregue
curl -X PATCH \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"status": "DELIVERED"}' \
  http://localhost:3000/api/admin/orders/SEU_PEDIDO_ID/status
```

### 2. Testar via Webhook

```bash
# Simular notificação de entrega
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "SEU_PEDIDO_ID",
    "status": "DELIVERED",
    "source": "teste"
  }' \
  http://localhost:3000/api/webhooks/order-status
```

### 3. Testar Job Manual

```bash
# Processar todas as comissões pendentes
curl -X GET \
  -H "Authorization: Bearer dev-secret-change-in-production" \
  http://localhost:3000/api/jobs/process-affiliate-commissions
```

## 📊 Exemplos de Resposta

### Sucesso - Comissão Confirmada (Aguardando 7 dias)

```json
{
  "success": true,
  "message": "Comissão confirmada - disponível em 7 dias",
  "amount": 0.50,
  "affiliate": "Maria Silva",
  "availableAt": "2026-02-19T10:00:00.000Z"
}
```

### Já Processada Anteriormente

```json
{
  "success": true,
  "message": "Comissão já liberada"
}
```

### Pedido Sem Afiliado

```json
{
  "success": true,
  "message": "Pedido sem afiliado"
}
```

### Aguardando Entrega

```json
{
  "success": true,
  "message": "Aguardando entrega do pedido"
}
```

## 🔐 Segurança

### Webhook Protection

Para proteger webhooks contra chamadas não autorizadas, você pode:

1. **Verificar IP do remetente**
2. **Validar assinatura HMAC**
3. **Usar HTTPS obrigatório**

Exemplo de validação de IP:

```typescript
// app/api/webhooks/order-status/route.ts
const allowedIPs = process.env.WEBHOOK_ALLOWED_IPS?.split(',') || []
const clientIP = req.headers.get('x-forwarded-for')

if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
  return NextResponse.json({ error: 'IP não autorizado' }, { status: 403 })
}
```

### Cron Job Protection

O job está protegido com `Authorization: Bearer` token:

```typescript
const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}
```

## 📈 Monitoramento e Logs

### Console do Servidor

```
🔔 [WEBHOOK] Notificação recebida: { orderId: 'ca11ye041...', status: 'DELIVERED' }
   ✅ Status atualizado: SHIPPED → DELIVERED
   🎯 Pedido tem afiliado - processando comissão...
🎯 [AFILIADO] Verificando comissão para pedido: ca11ye041...
   📦 Pedido ENTREGUE - Liberando comissão
   💰 R$ 0.50 creditados na conta MYD
   👤 Afiliado: Maria Silva
   ✅ Comissão liberada e creditada
```

### Job Summary

```json
{
  "message": "Processamento concluído",
  "total": 10,
  "processed": 8,
  "alreadyProcessed": 1,
  "errors": 1,
  "results": [...]
}
```

## 🏁 Quick Start

### Passo 1: Configurar .env

```bash
CRON_SECRET=cole-aqui-secret-gerado
```

### Passo 2: Escolher Método

**Opção A - Webhook (Recomendado para produção):**
- Configure o webhook no seu gateway de pagamento
- URL: `https://seusite.com/api/webhooks/order-status`

**Opção B - Cron Job:**
- Configure cron job para rodar a cada hora
- Command: `curl -H "Authorization: Bearer $CRON_SECRET" https://seusite.com/api/jobs/process-affiliate-commissions`

**Opção C - Manual (Admin Panel):**
- Acesse painel admin de pedidos
- Clique em "Marcar como Entregue"
- Sistema libera comissão automaticamente

### Passo 3: Testar

```bash
# 1. Fazer pedido com link de afiliado
http://localhost:3000?ref=CODIGO

# 2. Completar compra
# ...

# 3. Marcar como entregue (escolher um método acima)
# ...

# 4. Verificar no painel do afiliado
http://localhost:3000/afiliado/vendas
# Status deve mudar de "Pendente" para "Confirmada"
# Saldo MYD deve ser creditado
```

## ❓ FAQ

### Quando a comissão é liberada?

Apenas quando o pedido muda para status **DELIVERED** (entregue).

### E se o pedido for cancelado?

A comissão é automaticamente marcada como **CANCELLED**. Se já foi creditada, o valor é estornado.

### Posso processar comissões manualmente?

Sim! Use a API `/api/jobs/process-affiliate-commissions` com o header de autorização.

### O que acontece se processar duas vezes?

Nada! O sistema verifica se já foi processado e retorna "Comissão já liberada".

### Preciso configurar tudo ou só uma opção?

Recomendamos **webhook + cron job** como fallback. O cron catch coisas que o webhook perdeu.

## 🆘 Troubleshooting

### Comissão não foi creditada

1. Verificar se pedido está marcado como DELIVERED
2. Verificar se AffiliateSale existe: `SELECT * FROM affiliate_sale WHERE orderId = '...'`
3. Verificar status da venda: deve ser CONFIRMED após processar
4. Verificar logs do servidor para erros
5. Executar job manualmente para forçar processamento

### Webhook não está funcionando

1. Verificar se URL está acessível publicamente
2. Testar com curl manualmente
3. Verificar logs do gateway de pagamento
4. Confirmar que está enviando POST com JSON correto

### Cron job retorna 401

1. Verificar se CRON_SECRET está configurado no .env
2. Confirmar que header Authorization está correto
3. Verificar se secret tem espaços ou caracteres especiais indevidos

## 📝 Arquivos Criados

- `lib/affiliate-commission.ts` - Funções auxiliares
- `app/api/admin/orders/[id]/status/route.ts` - API admin de status
- `app/api/webhooks/order-status/route.ts` - Webhook genérico
- `app/api/jobs/process-affiliate-commissions/route.ts` - Cron job
- `docs/AFFILIATE-COMMISSIONS.md` - Esta documentação
