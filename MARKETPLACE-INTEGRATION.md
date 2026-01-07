# Sistema de Publicação em Marketplaces

## 📋 Funcionalidades Implementadas

### 1. **Controle de Status do Produto**
- Botão para ativar/inativar produtos
- Indicador visual do status (Ativo/Inativo)
- API: `PATCH /api/admin/products/:id/toggle-active`

### 2. **Publicação em Marketplaces**
- Modal com seletor de plataforma (Mercado Livre, Shopee, Amazon)
- Validação de requisitos por marketplace
- Publicação manual de produtos
- API: `POST /api/admin/products/:id/publish`

### 3. **Sincronização Individual**
- Botão para sincronizar preço e estoque de cada anúncio
- Visualização do status e última sincronização
- Link direto para o anúncio no marketplace
- API: `POST /api/admin/products/:id/sync-listing`

### 4. **Sincronização em Lote**
- Botão "Sincronizar Todos" na listagem de produtos
- Sincroniza todos os produtos publicados automaticamente
- Aguarda 1 segundo entre requisições (rate limiting)
- API: `POST /api/admin/marketplaces/sync-all`

### 5. **Rastreamento de Publicações**
- Nova tabela `MarketplaceListing` no banco
- Armazena: listingId, status, preço, estoque, URL, última sync
- Coluna "Marketplaces" mostra badges com status (ML, Shopee, Amazon)

## 🗃️ Estrutura do Banco de Dados

### Tabela `Product` - Novos Campos
```prisma
active Boolean @default(true) // Se o produto está ativo
marketplaceListings MarketplaceListing[] // Relação com publicações
```

### Nova Tabela `MarketplaceListing`
```prisma
id            String   // ID único
productId     String   // Produto vinculado
marketplace   String   // 'mercadolivre', 'shopee', 'amazon'
listingId     String   // ID do anúncio no marketplace
status        String   // 'active', 'paused', 'closed', 'pending'
title         String?  // Título do anúncio
price         Float?   // Preço publicado
stock         Int?     // Estoque sincronizado
listingUrl    String?  // URL do anúncio
lastSyncAt    DateTime? // Última sincronização
syncEnabled   Boolean  // Auto-sync ativo
errorMessage  String?  // Última mensagem de erro
```

## 🔄 Fluxo de Publicação no Mercado Livre

### 1. Validação de Requisitos
- ✅ GTIN/EAN obrigatório
- ✅ Marca obrigatória
- ✅ Pelo menos uma imagem
- ✅ Descrição obrigatória
- ✅ Preço maior que zero

### 2. Criação do Anúncio
```javascript
POST https://api.mercadolibre.com/items
{
  title: "Nome do Produto (max 60 caracteres)",
  category_id: "MLB1055", // Deve ser mapeada corretamente
  price: 99.90,
  currency_id: "BRL",
  available_quantity: 10,
  buying_mode: "buy_it_now",
  listing_type_id: "gold_special", // ou gold_pro, gold_premium
  condition: "new",
  description: { plain_text: "Descrição completa" },
  pictures: [{ source: "url_da_imagem" }],
  attributes: [
    { id: "GTIN", value_name: "7891234567890" },
    { id: "BRAND", value_name: "Marca" }
  ],
  shipping: {
    mode: "me2",
    free_shipping: false
  }
}
```

### 3. Salvamento no Banco
- Cria registro em `MarketplaceListing`
- Armazena listingId, status, URL do anúncio
- Define `syncEnabled: true`

## 🔄 Sincronização Automática

### Manual (Botão)
1. Usuário clica em "Sincronizar Todos"
2. Sistema busca todas listagens com `syncEnabled: true`
3. Para cada listagem:
   - Atualiza preço e estoque via API do marketplace
   - Registra `lastSyncAt`
   - Limpa `errorMessage` se sucesso
4. Exibe resumo: X sincronizados, Y erros

### Automática (Cron Job) - A Implementar
```javascript
// Exemplo com node-cron
cron.schedule('0 */6 * * *', async () => {
  // A cada 6 horas
  await fetch('/api/admin/marketplaces/sync-all', { method: 'POST' })
})
```

## 📊 Interface do Admin

### Nova Coluna: Marketplaces
- Mostra badges coloridas por marketplace
- Verde: active
- Amarelo: paused
- Cinza: closed/pending

### Novos Botões por Produto
1. **👁️ Ativar/Inativar** - ToggleProductActiveButton
2. **📤 Publicar** - PublishToMarketplaceButton
3. **✏️ Editar** - Link para edição (existente)
4. **🗑️ Deletar** - DeleteProductButton (existente)

### Botão Global
- **🔄 Sincronizar Todos** - SyncAllMarketplacesButton

## 🚀 Como Usar

### 1. Publicar Produto no Mercado Livre
1. Preencha GTIN, Marca, Imagens e Descrição do produto
2. Clique no botão 📤 (Publicar)
3. Selecione "Mercado Livre"
4. Clique em "Publicar"
5. Aguarde confirmação

### 2. Sincronizar Anúncio Individual
1. Clique no botão 📤 do produto
2. Veja os anúncios ativos
3. Clique em 🔄 para sincronizar
4. Preço e estoque serão atualizados no marketplace

### 3. Sincronizar Todos os Anúncios
1. Clique em "Sincronizar Todos" no topo da página
2. Aguarde processamento (1 segundo por produto)
3. Veja o resumo de sincronizações bem-sucedidas

### 4. Inativar Produto
1. Clique no ícone 👁️ (olho verde = ativo)
2. Produto fica inativo (olho cinza)
3. Pode ser reativado clicando novamente

## ⚙️ Configuração Necessária

### Credenciais do Mercado Livre
Você já tem configurado em `MercadoLivreAuth`:
- accessToken
- refreshToken
- expiresAt

### Próximos Passos para Shopee
1. Obter credenciais Shopee Partner API
2. Implementar OAuth flow similar ao ML
3. Criar funções `publishToShopee()` e `syncShopee()`
4. Adicionar validações específicas da Shopee

### Próximos Passos para Amazon
1. Configurar Amazon MWS/SP-API
2. Implementar autenticação
3. Mapear categorias e atributos
4. Implementar publicação e sync

## 📁 Arquivos Criados/Modificados

### Componentes
- `components/admin/ToggleProductActiveButton.tsx` ✨ Novo
- `components/admin/PublishToMarketplaceButton.tsx` ✨ Novo
- `components/admin/SyncAllMarketplacesButton.tsx` ✨ Novo

### APIs
- `app/api/admin/products/[id]/toggle-active/route.ts` ✨ Novo
- `app/api/admin/products/[id]/publish/route.ts` ✨ Novo
- `app/api/admin/products/[id]/sync-listing/route.ts` ✨ Novo
- `app/api/admin/marketplaces/sync-all/route.ts` ✨ Novo

### Páginas
- `app/admin/produtos/page.tsx` ✏️ Modificado

### Banco de Dados
- `prisma/schema.prisma` ✏️ Modificado
- Migração aplicada ✅

## 🎯 Benefícios

1. **Centralização**: Gerencie produtos em múltiplas plataformas de um só lugar
2. **Automação**: Sincronização automática de preços e estoques
3. **Escalabilidade**: Estrutura pronta para adicionar novos marketplaces
4. **Rastreabilidade**: Histórico de sincronizações e erros
5. **Flexibilidade**: Ative/desative produtos e sincronizações individualmente

## ⚠️ Observações Importantes

1. **Rate Limiting**: Sistema aguarda 1 segundo entre requisições para não sobrecarregar APIs
2. **Categoria ML**: Atualmente usando categoria padrão (MLB1055), deve ser mapeada corretamente por categoria de produto
3. **Listing Type**: Usando `gold_special` como padrão, pode ser configurado por produto
4. **Token Expiration**: Implementar refresh token automático para Mercado Livre
5. **Webhooks**: Considerar implementar webhooks do ML para receber atualizações de pedidos e perguntas

## 🔜 Melhorias Futuras

1. ⚡ **Cron Job** para sincronização automática periódica
2. 📊 **Dashboard** com estatísticas de vendas por marketplace
3. 🔔 **Notificações** quando um produto está com erro de sincronização
4. 🗺️ **Mapeamento de Categorias** automático por categoria interna
5. 📦 **Sincronização Bidirecional** (vendas do ML atualizam estoque interno)
6. 🎨 **Editor de Anúncios** para customizar título e descrição por marketplace
7. 🔄 **Gestão de Variações** para produtos com múltiplas SKUs
8. 📸 **Otimização de Imagens** automática para requisitos de cada marketplace
