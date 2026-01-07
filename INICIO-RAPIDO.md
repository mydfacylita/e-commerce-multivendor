# 🚀 Guia de Inicialização Rápida

## Passo a Passo para Configurar o E-commerce

### 1️⃣ Configurar PostgreSQL

**Opção A: Usando XAMPP com PostgreSQL**
- Certifique-se de que o PostgreSQL está instalado e rodando
- Porta padrão: 5432

**Opção B: Instalar PostgreSQL separadamente**
- Baixe em: https://www.postgresql.org/download/windows/
- Durante a instalação, defina a senha do usuário `postgres`

### 2️⃣ Criar o Banco de Dados

Abra o pgAdmin ou psql e execute:
```sql
CREATE DATABASE ecommerce;
```

### 3️⃣ Configurar Variáveis de Ambiente

O arquivo `.env` já foi criado! **IMPORTANTE: Edite a linha DATABASE_URL:**

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA_AQUI@localhost:5432/ecommerce"
```

Substitua `SUA_SENHA_AQUI` pela senha do seu PostgreSQL.

### 4️⃣ Instalar Dependências (se ainda não instalou)

```powershell
npm install
npm install -D ts-node
```

### 5️⃣ Configurar o Banco de Dados

```powershell
# Gerar o Prisma Client
npx prisma generate

# Criar as tabelas no banco
npx prisma db push

# Popular o banco com dados de exemplo
npx prisma db seed
```

### 6️⃣ Iniciar o Servidor

```powershell
npm run dev
```

## 🌐 Acessar o Sistema

Após iniciar, acesse: **http://localhost:3000**

## 🔐 Credenciais de Acesso

### Administrador (Painel Admin)
- **Email:** admin@example.com
- **Senha:** admin123
- **Acesso:** http://localhost:3000/admin

### Usuário Comum
- **Email:** user@example.com
- **Senha:** user123

## 📍 Principais Rotas

### Cliente
- **Home:** http://localhost:3000
- **Produtos:** http://localhost:3000/produtos
- **Categorias:** http://localhost:3000/categorias
- **Carrinho:** http://localhost:3000/carrinho
- **Login:** http://localhost:3000/login
- **Registro:** http://localhost:3000/registro
- **Perfil:** http://localhost:3000/perfil
- **Meus Pedidos:** http://localhost:3000/pedidos

### Admin (requer login como admin)
- **Dashboard:** http://localhost:3000/admin
- **Produtos:** http://localhost:3000/admin/produtos
- **Categorias:** http://localhost:3000/admin/categorias
- **Pedidos:** http://localhost:3000/admin/pedidos
- **Usuários:** http://localhost:3000/admin/usuarios

## 🛠️ Comandos Úteis

```powershell
# Iniciar em modo desenvolvimento
npm run dev

# Ver o banco no navegador (Prisma Studio)
npx prisma studio

# Resetar o banco (apaga tudo)
npx prisma db push --force-reset

# Popular novamente
npx prisma db seed
```

## ⚠️ Solução de Problemas

### Erro de conexão com banco
- Verifique se o PostgreSQL está rodando
- Confira a senha em `.env`
- Teste a conexão no pgAdmin

### Erro ao rodar seed
- Certifique-se de ter instalado: `npm install -D ts-node`
- Execute: `npx prisma generate` antes do seed

### Porta 3000 em uso
- Mude para outra porta: `npm run dev -- -p 3001`

## 📦 Dados de Exemplo Incluídos

Após o seed, você terá:
- ✅ 2 usuários (1 admin + 1 comum)
- ✅ 5 categorias
- ✅ 8 produtos com imagens
- ✅ Produtos em destaque
- ✅ Preços com desconto

## 🎯 Próximos Passos

1. Faça login como admin
2. Crie novos produtos em `/admin/produtos`
3. Teste o fluxo de compra como usuário
4. Gerencie pedidos no painel admin

---

**Desenvolvido com ❤️ usando Next.js 14**
