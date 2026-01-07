# 🛍️ E-Commerce - Módulo MYD_ADM

E-commerce moderno integrado ao sistema MYD_ADM.

## 🌐 Acesso ao Sistema

**URL Base:** http://localhost:3000/e-comece

## 🔐 Credenciais de Login

### Administrador
- **Email:** admin@example.com
- **Senha:** admin123
- **Painel Admin:** http://localhost:3000/e-comece/admin

### Usuário Comum
- **Email:** user@example.com
- **Senha:** user123

## 📍 Rotas Principais

### Área do Cliente
- 🏠 **Home:** /e-comece
- 🛍️ **Produtos:** /e-comece/produtos
- 📦 **Categorias:** /e-comece/categorias
- 🛒 **Carrinho:** /e-comece/carrinho
- ✅ **Checkout:** /e-comece/checkout
- 👤 **Perfil:** /e-comece/perfil
- 📋 **Meus Pedidos:** /e-comece/pedidos
- 🔐 **Login:** /e-comece/login
- 📝 **Registro:** /e-comece/registro

### Área Administrativa (Admin)
- 📊 **Dashboard:** /e-comece/admin
- 📦 **Produtos:** /e-comece/admin/produtos
- ➕ **Novo Produto:** /e-comece/admin/produtos/novo
- 🏷️ **Categorias:** /e-comece/admin/categorias
- ➕ **Nova Categoria:** /e-comece/admin/categorias/nova
- 📋 **Pedidos:** /e-comece/admin/pedidos
- 👥 **Usuários:** /e-comece/admin/usuarios

## 🚀 Como Iniciar

```powershell
# Entre no diretório do módulo
cd C:\xampp\htdocs\myd_adm\Modules\e-comece

# Inicie o servidor
npm run dev
```

O sistema estará disponível em: **http://localhost:3000/e-comece**

## 🗄️ Banco de Dados

- **Tipo:** MySQL (XAMPP)
- **Banco:** ecommerce
- **Porta:** 3306
- **Usuário:** root (sem senha)

### Comandos Úteis

```powershell
# Ver banco de dados no navegador
npx prisma studio

# Resetar e popular novamente
npx prisma db push --force-reset
npx prisma db seed
```

## 📦 Dados Incluídos

Após o seed, o sistema contém:
- ✅ 2 usuários (1 admin + 1 comum)
- ✅ 5 categorias (Eletrônicos, Moda, Livros, Casa e Decoração, Esportes)
- ✅ 8 produtos com imagens
- ✅ Produtos em destaque com descontos

## 🎯 Funcionalidades

### Para Clientes
- ✅ Navegação por produtos e categorias
- ✅ Página de detalhes com galeria de imagens
- ✅ Carrinho de compras persistente
- ✅ Sistema de autenticação
- ✅ Checkout completo
- ✅ Histórico de pedidos
- ✅ Perfil de usuário

### Para Administradores
- ✅ Dashboard com estatísticas
- ✅ CRUD completo de produtos
- ✅ CRUD completo de categorias
- ✅ Gerenciamento de pedidos com mudança de status
- ✅ Visualização de usuários

## 🛠️ Tecnologias

- Next.js 14
- TypeScript
- Tailwind CSS
- MySQL (XAMPP)
- Prisma ORM
- NextAuth.js
- Zustand
- React Hot Toast

---

**Desenvolvido como módulo do MYD_ADM**
