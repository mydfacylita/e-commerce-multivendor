const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Buscar TODOS os últimos 10 pedidos para ver a estrutura
  console.log('=== ÚLTIMOS 10 PEDIDOS ===\n');
  const allOrders = await p.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      items: {
        select: {
          product: {
            select: {
              name: true,
              isDropshipping: true,
              supplierId: true,
              supplier: {
                select: { type: true, name: true }
              }
            }
          }
        }
      }
    }
  });
  
  for (const o of allOrders) {
    console.log(`${o.id} - ${o.status} - ${o.paymentStatus}`);
    for (const i of o.items) {
      const sup = i.product.supplier ? `${i.product.supplier.name} (${i.product.supplier.type})` : 'SEM FORNECEDOR';
      console.log(`  ${i.product.name?.slice(0, 40)} | ${sup}`);
    }
    console.log('');
  }

  // Buscar pedidos recentes com itens que têm fornecedor
  const orders = await p.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    where: {
      items: {
        some: {
          product: {
            supplierId: { not: null }
          }
        }
      }
    },
    select: {
      id: true,
      status: true,
      items: {
        select: {
          id: true,
          product: {
            select: {
              id: true,
              name: true,
              supplierId: true,
              isDropshipping: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            }
          }
        }
      }
    }
  });

  console.log('=== PEDIDOS COM FORNECEDOR ===\n');
  
  for (const order of orders) {
    console.log(`Pedido: ${order.id}`);
    console.log(`Status: ${order.status}`);
    
    for (const item of order.items) {
      if (item.product.supplier) {
        console.log(`  - ${item.product.name}`);
        console.log(`    isDropshipping: ${item.product.isDropshipping}`);
        console.log(`    supplier: ${item.product.supplier.name} (type: ${item.product.supplier.type})`);
      }
    }
    console.log('---\n');
  }

  // Listar todos os fornecedores
  const suppliers = await p.supplier.findMany();
  console.log('=== TODOS FORNECEDORES ===\n');
  suppliers.forEach(s => {
    console.log(`${s.name} - type: ${s.type}`);
  });
}

main().finally(() => p.$disconnect());
