# 🎯 Sistema de Afiliados - MYDSHOP

## 📋 Visão Geral

Sistema completo de afiliados para influenciadores digitais promoverem produtos da MYDSHOP e receberem comissões por vendas geradas.

## 🔄 Fluxo Completo

### 1. Cadastro do Influenciador
- Influenciador se cadastra no sistema
- Preenche dados pessoais, redes sociais e dados bancários
- Status inicial: `PENDING` (aguardando aprovação)

### 2. Aprovação pelo Admin
- Admin acessa `/admin/afiliados`
- Visualiza dados do influenciador
- Aprova ou rejeita o cadastro
- Após aprovação: status muda para `APPROVED` e influenciador recebe código único

### 3. Divulgação
Influenciador divulga link personalizado:
```
https://www.mydshop.com.br?ref=JOAO123
```

### 4. Rastreamento
Quando cliente clica no link:
1. API `/api/affiliate/track?ref=JOAO123` é chamada
2. Cookie `affiliate_ref` é salvo no navegador (validade: 30 dias)
3. Clique é registrado na tabela `affiliate_click`

### 5. Compra
Quando cliente finaliza compra:
1. Sistema verifica cookie de afiliado
2. Vincula pedido ao afiliado na tabela `order` (campos `affiliateId` e `affiliateCode`)
3. Cria registro em `affiliate_sale` com status `PENDING`
4. Calcula comissão baseada na taxa do afiliado

### 6. Confirmação
Quando pedido é entregue:
1. Status da venda muda para `CONFIRMED`
2. Comissão é creditada no `availableBalance` do afiliado
3. Afiliado pode solicitar saque

### 7. Saque
1. Afiliado acessa painel e solicita saque
2. Admin processa pagamento via PIX/TED
3. Valor é debitado do `availableBalance`
4. Registro criado em `affiliate_withdrawal`

## 📊 Estrutura do Banco de Dados

### Tabelas Criadas

#### `affiliate`
```sql
- id: ID único
- userId: Relação com usuário
- code: Código único (ex: JOAO123)
- name: Nome do influenciador
- email: Email
- phone: Telefone
- cpf: CPF
- instagram/youtube/tiktok: Redes sociais
- commissionRate: Taxa de comissão (%)
- status: PENDING | APPROVED | REJECTED | SUSPENDED
- totalSales: Total de vendas geradas
- totalCommission: Comissão total acumulada
- availableBalance: Saldo disponível para saque
- totalWithdrawn: Total já sacado
- banco/agencia/conta/chavePix: Dados bancários
```

#### `affiliate_sale`
```sql
- id: ID único
- affiliateId: ID do afiliado
- orderId: ID do pedido
- customerId: ID do cliente
- orderTotal: Valor total do pedido
- commissionRate: Taxa aplicada
- commissionAmount: Valor da comissão
- status: PENDING | CONFIRMED | PAID | CANCELLED
- paidAt: Data do pagamento
```

#### `affiliate_withdrawal`
```sql
- id: ID único
- affiliateId: ID do afiliado
- amount: Valor do saque
- status: PENDING | PROCESSING | COMPLETED | REJECTED
- method: PIX | TED | BOLETO
- pixKey: Chave PIX
- bankInfo: Dados bancários (JSON)
- proofUrl: Comprovante de pagamento
```

#### `affiliate_click`
```sql
- id: ID único
- affiliateId: ID do afiliado
- ipAddress: IP do visitante
- userAgent: Navegador
- referrer: Origem do tráfego
- landingPage: Página de destino
- converted: Se resultou em compra
- orderId: ID do pedido (se converteu)
```

## 🔌 APIs Criadas

### GET `/api/affiliate/track?ref=CODIGO`
Rastreia clique e salva cookie
```javascript
// Resposta
{
  "success": true,
  "affiliate": {
    "code": "JOAO123",
    "name": "João Silva"
  }
}
```

### POST `/api/affiliate/track`
Converte clique em venda
```javascript
// Body
{
  "orderId": "clxxx..."
}

// Resposta
{
  "success": true,
  "affiliateSale": {
    "id": "clyyy...",
    "commissionAmount": 25.50,
    "status": "PENDING"
  }
}
```

### GET `/api/admin/affiliates?status=ALL`
Lista afiliados (apenas ADMIN)
```javascript
// Resposta
{
  "affiliates": [...],
  "stats": {
    "totalAffiliates": 10,
    "activeAffiliates": 8,
    "pendingAffiliates": 2,
    "totalSales": 15000.00,
    "totalCommission": 750.00,
    "totalPaid": 500.00
  }
}
```

### POST `/api/admin/affiliates/{id}/approve`
Aprovaafiliad (apenas ADMIN)

### POST `/api/admin/affiliates/{id}/reject`
Rejeita afiliado (apenas ADMIN)

## 🎨 Páginas Criadas

### Admin: `/admin/afiliados`
- Lista de todos os afiliados
- Estatísticas gerais
- Filtros por status
- Aprovação/rejeição
- Visualização de performance

### Influenciador: `/afiliado` (TODO)
- Dashboard com estatísticas
- Vendas geradas
- Comissões ganhas
- Link personalizado
- Solicitação de saque

## 📝 Próximos Passos

### 1. Executar Migration
```bash
mysql -u root -p ecommerce < add-affiliate-system.sql
```

### 2. Gerar Prisma Client
```bash
npx prisma generate
```

### 3. Criar Painel do Influenciador
- [ ] Página `/afiliado` (login obrigatório)
- [ ] Dashboard com estatísticas
- [ ] Link de afiliado para copiar
- [ ] Lista de vendas
- [ ] Formulário de saque

### 4. Integrar no Checkout
Adicionar no processo de checkout:
```typescript
// Em app/api/checkout/route.ts
import { cookies } from 'next/headers'

// Após criar pedido
const affiliateRef = cookies().get('affiliate_ref')
if (affiliateRef) {
  await fetch('/api/affiliate/track', {
    method: 'POST',
    body: JSON.stringify({ orderId: order.id })
  })
}
```

### 5. Automatizar Confirmação de Comissão
Quando pedido for marcado como "ENTREGUE":
```typescript
// Mudar status de affiliate_sale para CONFIRMED
// Creditar availableBalance do afiliado
```

### 6. Notificações
- [ ] Email ao aprovar afiliado
- [ ] Email ao gerar venda
- [ ] Email ao processar saque
- [ ] WhatsApp com resumo semanal

## 💰 Exemplo de Cálculo

**Cenário:**
- Cliente compra R$ 500,00
- Taxa do afiliado: 5%
- Comissão: R$ 25,00

**Fluxo:**
1. Venda registrada com status `PENDING`
2. Pedido entregue → status muda para `CONFIRMED`
3. R$ 25,00 creditados no `availableBalance`
4. Afiliado solicita saque de R$ 25,00
5. Admin processa → status `COMPLETED`
6. R$ 25,00 debitados e movidos para `totalWithdrawn`

## 🔐 Segurança

- ✅ Cookie com httpOnly para ID do afiliado
- ✅ Validação de status (somente aprovados)
- ✅ Proteção contra fraude (rastreamento de IP)
- ✅ Auditoria completa de transações
- ✅ Apenas ADMIN pode aprovar/rejeitar

## 📈 Métricas Rastreadas

- **Cliques:** Total de acessos via link
- **Taxa de conversão:** Cliques que viraram vendas
- **Ticket médio:** Valor médio das vendas
- **Total de vendas:** Soma de todas as vendas
- **Comissões:** Total ganho pelo afiliado

## 🎯 Recursos Futuros

- [ ] Sistema de cupons exclusivos por afiliado
- [ ] Metas e bônus progressivos
- [ ] Ranking de top afiliados
- [ ] Material de divulgação (banners, posts)
- [ ] API pública para afiliados
- [ ] Integração com Instagram/TikTok Shop
- [ ] Pagamento automático via PIX
