# Sistema Multi-Vendedor (Marketplace)

## Visão Geral

Este é um sistema completo de marketplace multi-vendedor onde vendedores (afiliados) podem se cadastrar, gerenciar seus próprios produtos e ter lojas virtuais individuais dentro da plataforma principal.

## Características Principais

### 🏪 **Para Vendedores**

- ✅ Cadastro como Pessoa Física (PF) ou Pessoa Jurídica (PJ)
- ✅ Loja virtual própria com URL personalizada (`/loja/[slug]`)
- ✅ Dashboard com estatísticas em tempo real
- ✅ Gerenciamento completo de produtos (criar, editar, deletar)
- ✅ Sistema de comissões automático
- ✅ Relatório financeiro detalhado
- ✅ Status de aprovação (Pendente, Ativo, Suspenso, Rejeitado)

### 👨‍💼 **Para Administradores**

- ✅ Visualizar todos os vendedores
- ✅ Aprovar ou rejeitar cadastros
- ✅ Suspender ou reativar vendedores
- ✅ Ver detalhes completos de cada vendedor
- ✅ Gerenciar comissões individuais
- ✅ Visualizar produtos por vendedor

### 🛍️ **Para Clientes**

- ✅ Visitar lojas individuais de vendedores
- ✅ Ver produtos organizados por vendedor
- ✅ Comprar de múltiplos vendedores em um único pedido
- ✅ Rastreamento de pedidos

## Estrutura de URLs

```
/vendedor/cadastro          → Escolha entre PF ou PJ
/vendedor/cadastro/pf       → Formulário de cadastro Pessoa Física
/vendedor/cadastro/pj       → Formulário de cadastro Pessoa Jurídica
/vendedor/dashboard         → Dashboard do vendedor
/vendedor/produtos/novo     → Cadastrar novo produto
/vendedor/produtos/[id]     → Editar produto
/vendedor/financeiro        → Relatório financeiro

/loja/[slug]                → Loja pública do vendedor

/admin/vendedores           → Lista de vendedores (admin)
/admin/vendedores/[id]      → Detalhes e ações do vendedor (admin)
```

## Modelos de Dados

### Seller

```prisma
model Seller {
  id                String       @id @default(cuid())
  userId            String       @unique
  
  // Loja
  storeName         String
  storeSlug         String       @unique
  storeDescription  String?
  storeLogo         String?
  storeBanner       String?
  
  // Tipo
  sellerType        SellerType   // PF ou PJ
  
  // PF
  cpf               String?
  rg                String?
  dataNascimento    DateTime?
  
  // PJ
  cnpj              String?
  razaoSocial       String?
  nomeFantasia      String?
  inscricaoEstadual String?
  
  // Endereço
  cep               String?
  endereco          String?
  numero            String?
  complemento       String?
  bairro            String?
  cidade            String?
  estado            String?
  
  // Bancário
  banco             String?
  agencia           String?
  conta             String?
  tipoConta         String?
  chavePix          String?
  
  // Config
  commission        Float        @default(10)
  status            SellerStatus @default(PENDING)
  
  products          Product[]
}
```

### Product (com sellerId)

```prisma
model Product {
  // ... campos existentes
  sellerId    String?
  seller      Seller? @relation(fields: [sellerId], references: [id])
}
```

### Order & OrderItem (com comissões)

```prisma
model Order {
  // ... campos existentes
  commissionRate    Float?
  commissionAmount  Float?
  sellerRevenue     Float?
}

model OrderItem {
  // ... campos existentes
  sellerId          String?
  commissionRate    Float?
  commissionAmount  Float?
  sellerRevenue     Float?
}
```

## Fluxo de Cadastro

1. **Vendedor acessa** `/vendedor/cadastro`
2. **Escolhe** entre Pessoa Física ou Pessoa Jurídica
3. **Preenche formulário** completo com:
   - Informações da loja
   - Dados pessoais/empresariais
   - Endereço (com busca automática por CEP via ViaCEP)
   - Dados bancários
4. **Status definido** como `PENDING` (Aguardando Aprovação)
5. **Role do usuário** é atualizado para `SELLER`
6. **Slug único** é gerado automaticamente para a loja

## Fluxo de Aprovação (Admin)

1. **Admin acessa** `/admin/vendedores`
2. **Vê lista** de todos os vendedores com status
3. **Clica em vendedor** para ver detalhes completos
4. **Aprova** (status → `ACTIVE`) ou **Rejeita** (status → `REJECTED`)
5. Vendedor aprovado pode começar a cadastrar produtos

## Sistema de Comissões

### Como Funciona

1. **Cada vendedor** tem uma taxa de comissão (padrão: 10%)
2. **Quando pedido é criado**, comissões são calculadas automaticamente
3. **Por item do pedido**:
   - `itemTotal = price × quantity`
   - `commissionAmount = itemTotal × (commission / 100)`
   - `sellerRevenue = itemTotal - commissionAmount`

### Exemplo de Cálculo

```javascript
// Produto: R$ 100,00
// Quantidade: 2
// Comissão do vendedor: 10%

const itemTotal = 100 * 2;              // R$ 200,00
const commissionAmount = 200 * 0.10;    // R$ 20,00
const sellerRevenue = 200 - 20;         // R$ 180,00

// Vendedor recebe: R$ 180,00
// Plataforma recebe: R$ 20,00
```

### Função Utilitária

```typescript
import { calculateOrderCommissions } from '@/lib/commission';

// Ao criar pedido
const order = await prisma.order.create({ ... });
await calculateOrderCommissions(order.id);
```

## Dashboard do Vendedor

### Estatísticas Exibidas

- **Total de Produtos**: Quantidade total cadastrada
- **Produtos Ativos**: Produtos disponíveis para venda
- **Vendas**: Número total de pedidos
- **Receita**: Total ganho (após comissões)

### Tabela de Produtos

- Imagem, nome, categoria
- Preço e estoque
- Status (ativo/inativo)
- Botão de edição

### Alertas de Status

- **PENDING**: "Cadastro em análise"
- **SUSPENDED**: "Conta suspensa"
- **REJECTED**: "Cadastro rejeitado"

## Relatório Financeiro

### Cards de Resumo

1. **Receita Total**: Valor que o vendedor recebe
2. **Taxa de Comissão**: Percentual da plataforma
3. **Total de Vendas**: Quantidade de pedidos
4. **Ticket Médio**: Valor médio por pedido

### Resumo de Comissões

- Valor Total de Vendas (bruto)
- Comissão da Plataforma (dedução)
- Você Recebe (líquido)

### Status de Pagamentos

- **Disponível para Saque**: Pedidos entregues
- **Aguardando Processamento**: Pedidos em andamento
- **Total Recebido**: Histórico de pagamentos

### Tabela de Vendas

- ID do pedido
- Data
- Quantidade de produtos
- Valor bruto
- Comissão descontada
- Valor líquido
- Status do pedido

## Loja Pública do Vendedor

### URL: `/loja/[slug]`

### Elementos da Página

1. **Banner**: Imagem de capa da loja
2. **Logo**: Sobreposto no banner
3. **Sidebar com**:
   - Nome da loja
   - Tipo (PF/PJ)
   - Localização (cidade/estado)
   - Total de produtos
   - Descrição da loja
4. **Grid de Produtos**: Usando componente `ProductCard`

### Geração Estática (SSG)

```typescript
export async function generateStaticParams() {
  const sellers = await prisma.seller.findMany({
    where: { status: 'ACTIVE' },
    select: { storeSlug: true },
  });

  return sellers.map((seller) => ({
    slug: seller.storeSlug,
  }));
}
```

## APIs do Vendedor

### `/api/seller/register`

- **POST**: Criar novo vendedor
- **GET**: Buscar dados do vendedor logado
- **PUT**: Atualizar informações

### `/api/seller/products`

- **POST**: Criar produto
- **GET**: Listar produtos do vendedor

### `/api/seller/products/[id]`

- **GET**: Buscar produto específico
- **PUT**: Atualizar produto
- **DELETE**: Deletar produto

### `/api/seller/financial`

- **GET**: Relatório financeiro completo

## APIs Admin

### `/api/admin/sellers/[id]`

- **GET**: Buscar vendedor específico
- **PUT**: Atualizar status/comissão
- **DELETE**: Remover vendedor (soft delete)

## Integrações

### ViaCEP

Busca automática de endereço por CEP nos formulários de cadastro:

```typescript
const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
const data = await response.json();

// Preenche automaticamente:
// - endereco
// - bairro
// - cidade
// - estado
```

## Validações

### Cadastro

- ✅ Nome da loja obrigatório
- ✅ Slug único gerado automaticamente
- ✅ CPF ou CNPJ dependendo do tipo
- ✅ Endereço completo
- ✅ Dados bancários completos

### Produtos

- ✅ Nome obrigatório
- ✅ Preço obrigatório (> 0)
- ✅ Categoria obrigatória
- ✅ Pelo menos uma imagem
- ✅ Apenas vendedores ACTIVE podem criar

### Permissões

- ✅ Vendedor só edita seus próprios produtos
- ✅ Admin pode ver e gerenciar todos
- ✅ Clientes veem apenas lojas ACTIVE

## Próximos Passos

### Funcionalidades Pendentes

1. **Upload de Imagens**
   - Integrar com Cloudinary ou S3
   - Substituir inputs de URL por upload

2. **Sistema de Pagamentos**
   - Integrar com Stripe/Mercado Pago
   - Implementar saques automáticos
   - Registro de pagamentos

3. **Notificações**
   - Email ao aprovar/rejeitar vendedor
   - Email de nova venda
   - Alertas de estoque baixo

4. **Avaliações e Comentários**
   - Clientes avaliam vendedores
   - Sistema de estrelas
   - Comentários em lojas

5. **Relatórios Avançados**
   - Gráficos de vendas
   - Produtos mais vendidos
   - Análise de performance

6. **Multi-idioma**
   - Suporte a português e inglês
   - Usando i18n

7. **SEO**
   - Meta tags dinâmicas
   - Sitemap com lojas
   - Schema.org markup

## Tecnologias Utilizadas

- **Next.js 14** (App Router)
- **Prisma ORM** (MySQL)
- **NextAuth.js** (Autenticação)
- **TailwindCSS** (Estilização)
- **React Icons** (Ícones)
- **React Hot Toast** (Notificações)

## Como Testar

### 1. Criar Vendedor

```bash
# Acessar: http://localhost:3000/vendedor/cadastro
# Preencher formulário PF ou PJ
```

### 2. Aprovar como Admin

```bash
# Acessar: http://localhost:3000/admin/vendedores
# Clicar no vendedor
# Clicar em "Aprovar Vendedor"
```

### 3. Cadastrar Produtos

```bash
# Acessar: http://localhost:3000/vendedor/dashboard
# Clicar em "Adicionar Produto"
# Preencher formulário
```

### 4. Ver Loja Pública

```bash
# Acessar: http://localhost:3000/loja/[slug-da-loja]
```

### 5. Ver Financeiro

```bash
# Acessar: http://localhost:3000/vendedor/financeiro
```

## Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

---

**Desenvolvido com ❤️ para e-commerce multi-vendedor**
