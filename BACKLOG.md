# 📋 Backlog - E-Commerce Moderno

## 🔥 Tarefas Prioritárias - 08/01/2026

### 1. Revisão e Ajustes Financeiros
- [ ] **Avaliar e corrigir página financeira do vendedor**
  - [ ] Revisar layout e organização das informações
  - [ ] Verificar se todos os cálculos estão sendo exibidos corretamente
  - [ ] Validar separação entre produtos próprios e dropshipping
  - [ ] Melhorar visualização de comissões (+ e -)
  - [ ] Adicionar tooltips explicativos
  - [ ] Teste completo com múltiplos pedidos

### 2. Integração Vendedor com Marketplaces
- [ ] **Implementar fluxo de publicação no Mercado Livre**
  - [ ] Validar credenciais OAuth do vendedor
  - [ ] Mapear categorias do sistema para categorias ML
  - [ ] Criar anúncios automaticamente (produtos próprios)
  - [ ] Sincronizar estoque e preços
  - [ ] Webhook para atualizar status de vendas

- [ ] **Integração com outros marketplaces** (fase 2)
  - [ ] Shopee (API + OAuth)
  - [ ] Amazon (Seller Central API)
  - [ ] Magazine Luiza

- [ ] **Restrições importantes**:
  - [x] Bloquear publicação de produtos dropshipping em marketplaces externos
  - [x] Apenas produtos próprios podem ser publicados
  - [x] Validar antes de permitir publicação

### 2. Testes de Pedidos Dropshipping
- [ ] **Fluxo completo de pedido dropshipping**
  - [ ] Cliente faz pedido de produto dropshipping
  - [ ] Sistema notifica vendedor
  - [ ] Vendedor adiciona código de rastreio
  - [ ] Sistema atualiza status automaticamente
  - [ ] Calcular corretamente: custo base + comissão = lucro vendedor

- [ ] **Validar cálculos financeiros**
  - [ ] Margem de lucro dropshipping
  - [ ] Comissão da plataforma
  - [ ] Repasse ao fornecedor original
  - [ ] Relatório financeiro separando produtos próprios vs drop

- [ ] **Testes de edge cases**
  - [ ] Produto dropshipping sem estoque
  - [ ] Alteração de preço pelo fornecedor
  - [ ] Sincronização de estoque
  - [ ] Cancelamento de pedido drop

---

## ✅ Implementado Recentemente - 07/01/2026

### Sistema de Dropshipping Completo
- [x] Catálogo de produtos disponíveis para dropshipping
- [x] Adicionar produtos ao catálogo do vendedor
- [x] Personalização de preço e nome do produto
- [x] Badge identificando produtos de dropshipping
- [x] Bloqueio de edição de estoque (controlado pelo fornecedor)
- [x] Restrição de publicação em marketplaces externos

### Gestão de Pedidos
- [x] Página de detalhes do pedido
- [x] Impressão de etiqueta padrão Correios
- [x] Atualização de status (Pendente → Processando → Enviado → Entregue)
- [x] Adicionar código de rastreio
- [x] Identificação visual de produtos dropshipping no pedido
- [x] Cálculo de lucro por item (custo base vs preço venda)

### Análise Financeira
- [x] Dashboard com métricas gerais (receita, comissão, vendas)
- [x] Seção dedicada para análise de dropshipping
- [x] Cálculo de lucro líquido dropshipping
- [x] Margem de lucro percentual
- [x] Separação clara: produtos próprios vs dropshipping

### Sistema de Permissões
- [x] Gestão de funcionários do vendedor
- [x] Níveis de acesso: MANAGER, OPERATOR, VIEWER
- [x] Controle granular de permissões
- [x] Modal visual mostrando permissões por cargo

### Explicações e Documentação
- [x] Página de dropshipping com regras claras
- [x] Página de integração com avisos sobre restrições
- [x] Comparação visual: produtos próprios vs dropshipping
- [x] Explicação do motivo das restrições (problema de recebimento)

---

## 🎨 Melhorias Implementadas

### 1. Limpeza de Logs Excessivos
- ✅ Removidos logs desnecessários do código de importação
- ✅ Mantidos apenas logs essenciais (nome do produto, qtd de imagens, preço, status)

### 2. Exibição de Produtos com Múltiplos Fornecedores
- ✅ Sistema flexível para tratar especificações de diferentes fornecedores
- ✅ Tratamento específico para AliExpress (extrai `attr_name` e `attr_value`)
- ✅ Fácil adicionar novos fornecedores (Shopee, Amazon, etc.)
- ✅ Filtra campos complexos (HTML bruto, objetos aninhados)
- ✅ Formata nomes de campos automaticamente

### 3. Seletor de Variantes (Cores/Tamanhos)
- ✅ Componente `ProductVariantSelector` criado
- ✅ Botões interativos para seleção de opções
- ✅ Mostra preço específico da variante selecionada
- ✅ Mostra estoque disponível por variante
- ✅ Visual limpo e responsivo

---

## 🚀 Próximas Features

### Integração Shopee
- [ ] **Configurar credenciais API Shopee** (App Key, Secret, Shop ID)
- [ ] **Importação de produtos** da Shopee (similar ao AliExpress)
- [ ] **Criação automática de pedidos** no fornecedor Shopee
- [ ] **Rastreamento de pedidos** Shopee
- [ ] **Webhook de atualização de status** de pedidos
- [ ] **Sincronização de estoque** em tempo real
- [ ] **Gestão de múltiplos fornecedores** (AliExpress + Shopee)

### Sincronização Automática AliExpress
- [ ] **Cron job de sincronização** (rodar a cada X horas)
- [ ] **Atualização automática de estoque**
  - Consultar API `aliexpress.ds.product.get` periodicamente
  - Atualizar campo `stock` no banco de dados
  - Notificar admin se estoque zerou
- [ ] **Atualização automática de preços**
  - Monitorar mudanças de preço no AliExpress
  - Aplicar margem de lucro configurada
  - Atualizar preço de venda automaticamente
- [ ] **Detecção de produtos removidos/indisponíveis**
  - Marcar produtos como indisponíveis se removidos do AliExpress
  - Notificar admin sobre produtos problemáticos
- [ ] **Sincronização de variantes** (cores, tamanhos)
  - Atualizar estoque por variante
  - Detectar novas variantes adicionadas
- [ ] **Dashboard de sincronização**
  - Mostrar última sincronização
  - Produtos com problemas
  - Estatísticas de estoque

### Dropshipping Avançado
- [ ] Tracking automático de envios
- [ ] Sistema de rastreamento de pedidos
- [ ] Automação de compras no AliExpress

### Integração com Marketplaces
- [ ] Integração Mercado Livre (já iniciada)
- [ ] Integração Shopee
- [ ] Integração Amazon
- [ ] Sincronização multi-canal

### Melhorias de Produto
- [ ] Importar avaliações de clientes
- [ ] Sistema de variantes (cores/tamanhos)
- [ ] Calculadora de frete automática
- [ ] Editor de descrições com IA

---

## ✅ Concluído

### OAuth AliExpress
- ✅ Autenticação HMAC-SHA256
- ✅ Token refresh automático
- ✅ 100% funcional

### Importação de Produtos
- ✅ Busca por 12 nichos
- ✅ 20 produtos por busca
- ✅ Tradução automática PT-BR
- ✅ Margem de 50% aplicada
- ✅ Remoção de branding AliExpress
- ✅ Especificações e atributos
- ✅ Prevenção de duplicatas
- ✅ Update de produtos existentes

### Interface
- ✅ Menu "🚀 Dropshipping" no admin
- ✅ Página de seleção de nichos
- ✅ Página de produto com múltiplas imagens (frontend pronto)
