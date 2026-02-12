# Sistema de Comissões de Afiliados - Período de Carência

## ✅ IMPLEMENTADO - Fluxo de Comissão com Carência de 7 Dias

### 📋 Visão Geral

O sistema agora implementa um **período de carência de 7 dias** após a entrega do pedido antes da comissão ficar disponível para saque.

### 🔄 Novo Fluxo

```
1. Cliente compra via link do afiliado → AffiliateSale criada (status: PENDING)
   └─ Comissão: R$ 0,50 (3% de R$ 16,83)

2. Pedido marcado como DELIVERED → AffiliateSale (status: CONFIRMED)
   └─ availableAt = hoje + 7 dias
   └─ Exemplo: Entregue em 12/02/2026 → Disponível em 19/02/2026
   └─ Motivo: Cliente tem 7 dias para devolver

3. Após 7 dias → Comissão disponível para saque
   └─ Aparece no dashboard em "Disponível para Saque"
   └─ Afiliado pode solicitar saque

4. Afiliado solicita saque → AffiliateSale (status: PAID)
   └─ Sistema marca vendas como PAID
   └─ Cria withdrawal request (PENDING)
   └─ Admin processa pagamento manualmente

5. Admin aprova saque → Withdrawal (status: APPROVED)
   └─ Dinheiro transferido para conta do afiliado
```

### 📊 Dashboard do Afiliado

O dashboard agora mostra 4 cards:

```
┌─────────────────────────────────────────────────────────────────────┐
│  💰 Disponível para Saque  │  ⏳ Em Período de Carência             │
│     R$ 0,00                │     R$ 0,50                            │
│     0 vendas liberadas     │     1 venda aguardando 7 dias          │
├────────────────────────────┼────────────────────────────────────────┤
│  📈 Comissão Total         │  👥 Total de Cliques                   │
│     R$ 0,50                │     5 cliques                          │
│     1 venda confirmada     │     Conversão: 20%                     │
└────────────────────────────┴────────────────────────────────────────┘
```

### 🗓️ Exemplo Prático

**Seu pedido de teste:**

```
Pedido: #ca11ye041QN062namvatoy8h8
Valor: R$ 16,83
Comissão: R$ 0,50 (3%)
Status atual: PENDING (aguardando entrega)

Quando você marcar como DELIVERED:
├─ Comissão: PENDING → CONFIRMED
├─ availableAt: 19/02/2026 (hoje + 7 dias)
└─ Dashboard mostra: "Em Período de Carência: R$ 0,50"

Depois de 19/02/2026:
└─ Dashboard mostra: "Disponível para Saque: R$ 0,50"
```

### 🧪 Como Testar Agora

**1. Marcar pedido como entregue (via webhook):**

```bash
curl -X POST http://localhost:3000/api/webhooks/order-status \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ca11ye041QN062namvatoy8h8",
    "status": "DELIVERED"
  }'
```

**Resultado esperado:**
```json
{
  "message": "Status atualizado com sucesso",
  "affiliate": {
    "success": true,
    "message": "Comissão confirmada - disponível em 7 dias",
    "amount": 0.50,
    "affiliate": "Nome do Afiliado",
    "availableAt": "2026-02-19T..."
  }
}
```

**2. Verificar no dashboard:**

- Acesse: http://localhost:3000/afiliado/dashboard
- Verá: "Em Período de Carência: R$ 0,50"
- Verá: "1 venda aguardando 7 dias"

**3. Para testar saque (simular 7 dias depois):**

```sql
-- Liberar imediatamente para teste
UPDATE affiliate_sale 
SET availableAt = NOW() 
WHERE orderId = 'ca11ye041QN062namvatoy8h8';
```

Após isso, recarregue o dashboard:
- Verá: "Disponível para Saque: R$ 0,50"
- Poderá clicar em "Solicitar Saque"

### 🆕 Novos Campos no Banco

```sql
-- affiliate_sale
availableAt DATETIME NULL
-- Data em que a comissão fica disponível para saque (entrega + 7 dias)

-- Índice para consultas rápidas
KEY idx_availableAt (availableAt)
```

### 📡 APIs Atualizadas

**1. GET /api/affiliate/me**

Retorna agora:
```json
{
  "stats": {
    "availableCommission": 0.00,      // ✅ NOVO - Disponível para saque
    "blockedCommission": 0.50,         // ✅ NOVO - Aguardando 7 dias
    "availableSalesCount": 0,          // ✅ NOVO - Vendas liberadas
    "blockedSalesCount": 1,            // ✅ NOVO - Vendas bloqueadas
    "totalCommission": 0.50,
    "confirmedSales": 1,
    "paidSales": 0
  }
}
```

**2. POST /api/affiliate/withdrawals**

Agora calcula automaticamente comissões disponíveis:
```javascript
// Busca vendas com availableAt <= hoje
// Não depende mais de account.balance
// Marca vendas como PAID ao solicitar saque
```

**3. POST /api/webhooks/order-status**

Quando pedido vira DELIVERED:
```javascript
{
  status: 'CONFIRMED',
  availableAt: new Date() + 7 dias
}
```

### ⚠️ Mudanças Importantes

**ANTES (ERRADO):**
- Comissão creditada imediatamente na entrega
- Afiliado podia sacar logo após entrega
- Se cliente devolvesse, tinha que estornar

**AGORA (CORRETO):**
- Comissão confirmada mas bloqueada por 7 dias
- Afiliado só pode sacar após período de carência
- Se cliente devolver, comissão é simplesmente cancelada (status: CANCELLED)
- Sem necessidade de estorno, pois nunca foi paga

### 🎯 Benefícios

✅ **Proteção contra devoluções** - 7 dias é o prazo legal de arrependimento
✅ **Sem estornos complicados** - Comissão só é paga após período seguro
✅ **Transparência** - Afiliado vê exatamente quanto tem disponível vs bloqueado
✅ **Conformidade legal** - Respeita direito do consumidor

### 📝 Documentação

- [docs/AFFILIATE-COMMISSIONS.md](docs/AFFILIATE-COMMISSIONS.md) - Documentação completa atualizada
- [lib/affiliate-commission.ts](lib/affiliate-commission.ts) - Funções de processamento
- [app/api/affiliate/me/route.ts](app/api/affiliate/me/route.ts) - API com novos stats
- [app/api/affiliate/withdrawals/route.ts](app/api/affiliate/withdrawals/route.ts) - Saque com carência
- [app/afiliado/dashboard/page.tsx](app/afiliado/dashboard/page.tsx) - Dashboard atualizado

### 🚀 Próximos Passos Recomendados

1. ✅ Testar fluxo completo (criar pedido → entregar → aguardar/simular 7 dias → sacar)
2. ⚠️ Criar página de saques (/afiliado/saques) mostrando período de carência
3. ⚠️ Adicionar notificação quando comissão ficar disponível
4. ⚠️ Criar relatório admin de comissões pendentes vs disponíveis
5. ⚠️ Implementar estorno automático se pedido for cancelado durante período de carência
