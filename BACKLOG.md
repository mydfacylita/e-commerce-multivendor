# 📋 Backlog - E-Commerce Moderno

## 🚀 Em Andamento - 22/01/2026

### 📱 App Android - Continuação
- [ ] **Testar página de detalhes do pedido** após fix do token
- [ ] **Testar fluxo completo** - Login → Carrinho → Checkout → Pedido → Detalhes
- [ ] **Push Notifications** - Configurar Firebase Cloud Messaging (FCM)
- [ ] **Deep Links** - Configurar links para abrir app direto em produto/pedido
- [ ] **Build de produção** - Gerar APK/AAB assinado para Play Store
- [ ] **Splash Screen** - Personalizar com logo da loja
- [ ] **Ícone do App** - Gerar ícones em todas as resoluções

### 🍎 App iOS - Início
- [ ] **Configurar ambiente Xcode** - Abrir projeto iOS
- [ ] **Certificados Apple Developer** - Provisioning profiles
- [ ] **Capacitor iOS** - Sync e build inicial
- [ ] **Testar no Simulador** - iPhone 14/15
- [ ] **Ajustar Safe Areas** - Notch e Dynamic Island
- [ ] **Permissões iOS** - Info.plist (câmera, notificações, etc)
- [ ] **Push Notifications iOS** - APNs (Apple Push Notification service)
- [ ] **Sign in with Apple** - Se necessário

### ⚠️ Possíveis Perrengues (e soluções)
- [ ] **CocoaPods** - `cd ios/App && pod install` se der erro de dependências
- [ ] **Certificados expirados** - Renovar no Apple Developer Portal
- [ ] **Capacitor plugins** - Alguns podem precisar de config específica no iOS
- [ ] **Safe Area** - Testar em dispositivos com notch
- [ ] **Keychain/Signing** - Configurar corretamente no Xcode
- [ ] **Privacy Manifest** - Apple exige declaração de APIs usadas (iOS 17+)

### 🔧 Melhorias Pendentes App
- [ ] **Favoritos** - Salvar produtos favoritos
- [ ] **Histórico de busca** - Armazenar buscas recentes
- [ ] **Compartilhar produto** - Share nativo
- [ ] **Avaliações no app** - Permitir avaliar produtos comprados
- [ ] **Notificações de status** - Avisar quando pedido mudar de status

---

## ✅ Implementado - 22/01/2026

### App Mobile (MYDSHOP) - Correções e Melhorias

#### 🔐 Autenticação JWT no Backend
- [x] **API `/orders` GET** - Adicionado suporte a autenticação JWT (antes só funcionava com NextAuth/sessão web)
- [x] **API `/orders/[id]` GET** - Adicionado suporte a autenticação JWT para detalhes do pedido
- [x] App mobile agora consegue listar e visualizar pedidos corretamente

#### 📦 Integridade dos Dados de Pedidos
- [x] **Corrigido campos size/color** - Alterado de `size`/`color` para `selectedSize`/`selectedColor` no checkout
- [x] **Adicionado campo `costPrice`** na tabela `orderitem` - Salva o custo do produto no momento da venda
- [x] **Análise financeira corrigida** - Usa `item.costPrice` salvo ao invés do preço atual do produto
- [x] Schema Prisma atualizado e migração aplicada

#### 📱 Identificação de Origem (APP vs Site)
- [x] **Pedidos do app marcados como "APP"** - Campo `marketplaceName` preenchido automaticamente
- [x] **Badge visual no admin** - Mostra "📱 APP" nos pedidos vindos do aplicativo
- [x] Detecção automática via autenticação JWT (se veio por JWT = app mobile)

#### 🖼️ Correção de Imagens no App
- [x] **Lista de pedidos** - Imagens dos produtos agora carregam corretamente
- [x] Função `mapOrder()` criada para transformar resposta da API
- [x] Parse correto do campo `images` (JSON → primeira imagem)
- [x] Uso do `ImageUrlPipe` para URLs absolutas

#### 📄 Página de Detalhes do Pedido (NOVA)
- [x] **Criado módulo `order-details`** - `order-details.module.ts`
- [x] **Criado componente** - `order-details.page.ts` com toda lógica
- [x] **Criado template** - `order-details.page.html` com layout completo
- [x] **Criado estilos** - `order-details.page.scss` com design moderno
- [x] **Rota adicionada** - `/order-details/:id` no `app-routing.module.ts`

**Funcionalidades da página de detalhes:**
- Timeline visual de status (colorida por estado)
- Código de rastreamento com botão de copiar
- Lista de itens com imagem, nome, tamanho/cor, quantidade e preço
- Endereço de entrega formatado
- Resumo de pagamento (subtotal, frete, descontos, total)
- Botão de cancelar pedido (apenas para status inicial)

#### 🛒 Carrinho Vazio - UI Melhorada
- [x] Botão "Explorar Produtos" com design moderno
- [x] Efeito gradiente e sombra
- [x] Ícone com animação de rotação no hover

#### 🐛 Correção de Erros de Hidratação
- [x] Adicionado `suppressHydrationWarning` em elementos com formatação de data
- [x] Corrigido erro de hidratação no SSR do Next.js

---

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

### Sistema de Avaliações e Perguntas (Janeiro/2026)
- ✅ Modelos Prisma: ProductReview, ProductQuestion, ReviewHelpful
- ✅ API de avaliações: GET/POST /api/products/[id]/reviews
- ✅ API de perguntas: GET/POST /api/products/[id]/questions
- ✅ API de responder perguntas: POST /api/products/[id]/questions/[questionId]/answer
- ✅ API de votar útil: POST /api/products/[id]/reviews/[reviewId]/helpful
- ✅ Componentes: ProductReviews.tsx, ProductQuestions.tsx
- ✅ Estatísticas: média, distribuição de notas, contagem respondidas
- ✅ Verificação de compra para avaliações verificadas
- ✅ Rate limiting: 10 perguntas/dia por usuário
- ✅ Integração na página do produto (/produtos/[slug])
