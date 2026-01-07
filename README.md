# E-Commerce Moderno 🛍️

E-commerce completo e moderno construído com Next.js 14, TypeScript, Tailwind CSS e Prisma.

## 🚀 Funcionalidades

### Para Clientes
- ✅ Navegação por produtos e categorias
- ✅ Página de detalhes do produto com galeria de imagens
- ✅ Carrinho de compras com persistência local
- ✅ Sistema de autenticação (login/registro)
- ✅ Checkout completo
- ✅ Histórico de pedidos
- ✅ Perfil de usuário

### Para Administradores
- ✅ Dashboard com estatísticas
- ✅ Gerenciamento de produtos
- ✅ Gerenciamento de categorias
- ✅ Visualização de pedidos
- ✅ Gerenciamento de usuários

## 🛠️ Tecnologias

- **Framework:** Next.js 14 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Banco de Dados:** PostgreSQL
- **ORM:** Prisma
- **Autenticação:** NextAuth.js
- **Gerenciamento de Estado:** Zustand
- **Ícones:** React Icons
- **Notificações:** React Hot Toast

## 📋 Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL instalado e rodando
- npm ou yarn

## 🔧 Instalação

### 1. Clone o repositório (se aplicável)
```bash
git clone <url-do-repositorio>
cd e-comece
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Database
DATABASE_URL="postgresql://usuario:senha@localhost:5432/ecommerce"

# NextAuth
NEXTAUTH_SECRET="gere-uma-chave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Stripe (opcional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

**Dica:** Para gerar uma chave secreta segura, execute:
```bash
openssl rand -base64 32
```

### 4. Configure o banco de dados

Crie o banco de dados PostgreSQL:
```sql
CREATE DATABASE ecommerce;
```

Execute as migrações do Prisma:
```bash
npx prisma db push
npx prisma generate
```

### 5. (Opcional) Popule o banco com dados de teste

Você pode criar um arquivo `prisma/seed.ts` para popular o banco:

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Criar usuário admin
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  // Criar categorias
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Eletrônicos',
        slug: 'eletronicos',
        description: 'Produtos eletrônicos e tecnologia',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Roupas',
        slug: 'roupas',
        description: 'Moda e vestuário',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Livros',
        slug: 'livros',
        description: 'Livros e literatura',
      },
    }),
  ])

  // Criar produtos
  await prisma.product.createMany({
    data: [
      {
        name: 'Smartphone XYZ',
        slug: 'smartphone-xyz',
        description: 'Smartphone de última geração com câmera de alta resolução',
        price: 1999.99,
        comparePrice: 2499.99,
        stock: 50,
        featured: true,
        categoryId: categories[0].id,
        images: ['https://via.placeholder.com/400'],
      },
      {
        name: 'Notebook ABC',
        slug: 'notebook-abc',
        description: 'Notebook potente para trabalho e estudos',
        price: 3499.99,
        stock: 30,
        featured: true,
        categoryId: categories[0].id,
        images: ['https://via.placeholder.com/400'],
      },
      {
        name: 'Camiseta Básica',
        slug: 'camiseta-basica',
        description: 'Camiseta de algodão 100% confortável',
        price: 49.99,
        comparePrice: 79.99,
        stock: 100,
        categoryId: categories[1].id,
        images: ['https://via.placeholder.com/400'],
      },
      {
        name: 'Livro: TypeScript Avançado',
        slug: 'livro-typescript-avancado',
        description: 'Aprenda TypeScript do básico ao avançado',
        price: 89.99,
        stock: 25,
        featured: true,
        categoryId: categories[2].id,
        images: ['https://via.placeholder.com/400'],
      },
    ],
  })

  console.log('✅ Banco de dados populado com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Adicione ao `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Execute o seed:
```bash
npm install -D ts-node
npx prisma db seed
```

## 🚀 Executando o Projeto

### Modo de desenvolvimento
```bash
npm run dev
```

Acesse: http://localhost:3000

### Build para produção
```bash
npm run build
npm start
```

## 📱 Estrutura do Projeto

```
e-comece/
├── app/                      # App Router do Next.js
│   ├── admin/               # Painel administrativo
│   ├── api/                 # API Routes
│   ├── carrinho/            # Página do carrinho
│   ├── checkout/            # Página de checkout
│   ├── login/               # Página de login
│   ├── produtos/            # Páginas de produtos
│   ├── registro/            # Página de registro
│   ├── layout.tsx           # Layout principal
│   ├── page.tsx             # Página inicial
│   └── globals.css          # Estilos globais
├── components/              # Componentes React
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── ProductCard.tsx
│   └── ...
├── lib/                     # Utilitários e configurações
│   ├── auth.ts              # Configuração NextAuth
│   ├── prisma.ts            # Cliente Prisma
│   └── store.ts             # Store Zustand
├── prisma/
│   └── schema.prisma        # Schema do banco de dados
├── types/                   # Tipos TypeScript
└── public/                  # Arquivos estáticos
```

## 🔐 Credenciais Padrão

Após executar o seed, você pode fazer login com:

- **Admin:**
  - Email: `admin@example.com`
  - Senha: `admin123`

## 🎨 Personalização

### Cores do Tema
Edite o arquivo `tailwind.config.ts` para personalizar as cores:

```typescript
colors: {
  primary: {
    50: '#f0f9ff',
    // ... adicione suas cores
  },
}
```

### Logo e Branding
Substitua o texto "E-Shop" no componente `Navbar.tsx` pelo seu logo.

## 📦 Deploy

### Vercel (Recomendado)
1. Faça push do código para o GitHub
2. Conecte o repositório no Vercel
3. Configure as variáveis de ambiente
4. Deploy automático!

### Outras Plataformas
- Configure as variáveis de ambiente
- Execute `npm run build`
- Inicie com `npm start`

## 🔧 Próximos Passos

- [ ] Integrar Stripe para pagamentos reais
- [ ] Adicionar busca avançada de produtos
- [ ] Implementar filtros e ordenação
- [ ] Adicionar avaliações de produtos
- [ ] Sistema de cupons de desconto
- [ ] Rastreamento de pedidos
- [ ] Email de confirmação
- [ ] Upload de imagens para produtos

## 📝 Licença

Este projeto é de código aberto e está disponível sob a licença MIT.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📧 Suporte

Para dúvidas ou suporte, abra uma issue no repositório.

---

Desenvolvido com ❤️ usando Next.js 14
