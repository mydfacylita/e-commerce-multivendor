# 🚀 Prisma - Boas Práticas e Otimizações

Este documento contém padrões e práticas recomendadas para trabalhar com Prisma em alta escala.

## 📊 Índices Estratégicos

O schema já possui índices otimizados para:
- ✅ Buscas por categoria + produtos ativos
- ✅ Filtros por status (pedidos, vendedores, assinaturas)
- ✅ Queries compostas (seller + status, user + role)
- ✅ Ordenação por data de criação

## ⚡ Queries Otimizadas

### ✅ BOM: Use `include` para relacionamentos necessários

```typescript
// Uma query SQL com JOINs otimizados
const products = await prisma.product.findMany({
  where: { 
    categoryId: 'xxx',
    active: true 
  },
  include: {
    category: true,
    seller: {
      select: { storeName: true, id: true }
    }
  },
  take: 20
})
```

### ❌ RUIM: Evite N+1 queries

```typescript
// NUNCA faça isso - gera N queries
const products = await prisma.product.findMany()
for (const product of products) {
  const category = await prisma.category.findUnique({ 
    where: { id: product.categoryId } 
  })
}
```

## 🎯 Paginação Eficiente

### Cursor-based (Melhor para feeds infinitos)

```typescript
const products = await prisma.product.findMany({
  take: 20,
  skip: 1, // Pula o cursor
  cursor: { id: lastProductId },
  orderBy: { createdAt: 'desc' }
})
```

### Offset-based (Para páginas numeradas)

```typescript
const page = 2
const perPage = 20
const products = await prisma.product.findMany({
  take: perPage,
  skip: (page - 1) * perPage,
  orderBy: { createdAt: 'desc' }
})
```

## 🔍 Buscas com Full-Text Search

```typescript
// Busca otimizada (usa índice FULLTEXT do MySQL)
const products = await prisma.$queryRaw`
  SELECT * FROM product 
  WHERE MATCH(name, description) AGAINST(${searchTerm} IN NATURAL LANGUAGE MODE)
  AND active = 1
  LIMIT 20
`
```

## 💾 Transações Seguras

```typescript
// Use transações para operações críticas
const result = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData })
  
  await tx.orderItem.createMany({
    data: items.map(item => ({ ...item, orderId: order.id }))
  })
  
  // Atualiza estoque
  for (const item of items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } }
    })
  }
  
  return order
})
```

## 📈 Agregações Eficientes

```typescript
// Contagens e somas otimizadas
const stats = await prisma.order.aggregate({
  where: { 
    sellerId: 'xxx',
    status: 'DELIVERED',
    createdAt: { gte: new Date('2026-01-01') }
  },
  _count: true,
  _sum: { total: true },
  _avg: { total: true }
})
```

## 🚦 Limites e Timeouts

```typescript
// Sempre defina limites
const products = await prisma.product.findMany({
  take: 100, // Nunca retorne tudo
  where: { active: true }
})

// Para operações longas, use timeout
const result = await prisma.$queryRaw`...`.timeout(10000) // 10s
```

## 🔄 Soft Deletes (Recomendado)

```typescript
// Em vez de deletar, marque como inativo
await prisma.product.update({
  where: { id: 'xxx' },
  data: { active: false }
})

// Filtre inativos nas queries
const products = await prisma.product.findMany({
  where: { active: true }
})
```

## 📊 Monitoramento de Queries

Com os logs ativados em desenvolvimento, você verá:

```bash
prisma:query SELECT * FROM product WHERE active = 1 AND categoryId = 'xxx'
prisma:query Duration: 12ms
```

Use essas informações para identificar queries lentas e otimizar.

## ⚠️ Cuidados com Relacionamentos Profundos

```typescript
// ❌ Evite includes muito profundos
const order = await prisma.order.findUnique({
  where: { id: 'xxx' },
  include: {
    items: {
      include: {
        product: {
          include: {
            category: true,
            seller: {
              include: {
                user: true,
                products: true // MUITO PESADO!
              }
            }
          }
        }
      }
    }
  }
})

// ✅ Use select para limitar campos
const order = await prisma.order.findUnique({
  where: { id: 'xxx' },
  include: {
    items: {
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            category: { select: { name: true } }
          }
        }
      }
    }
  }
})
```

## 🔐 Migrations Seguras

### Desenvolvimento

```bash
# Criar nova migration
npm run prisma:migrate:dev -- --name add_new_field

# Ver status
npm run prisma:migrate:status
```

### Produção

```bash
# NUNCA use migrate:dev em produção!
# Use apenas:
npm run prisma:migrate:deploy
```

## 🛡️ Segurança

```typescript
// SEMPRE valide input do usuário
const email = sanitize(userInput.email)
const products = await prisma.product.findMany({
  where: { 
    seller: { user: { email } }
  }
})

// Prisma previne SQL injection automaticamente
// Mas você ainda precisa validar lógica de negócio
```

## 📚 Recursos Adicionais

- [Prisma Docs - Performance](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Connection Pool Guide](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Query Optimization](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)

---

**Última atualização:** Janeiro 2026
