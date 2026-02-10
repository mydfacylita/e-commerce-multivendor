const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function check() {
  try {
    // Contar total de categorias
    const total = await p.category.count()
    console.log('Total de categorias:', total)
    
    // Contar categorias pai (sem parentId)
    const pais = await p.category.count({ where: { parentId: null } })
    console.log('Categorias pai:', pais)
    
    // Contar subcategorias (com parentId)
    const filhos = await p.category.count({ where: { parentId: { not: null } } })
    console.log('Subcategorias:', filhos)
    
    // Listar alguns exemplos de subcategorias
    if (filhos > 0) {
      const exemplos = await p.category.findMany({
        where: { parentId: { not: null } },
        take: 5,
        include: { parent: { select: { name: true } } }
      })
      console.log('\nExemplos de subcategorias:')
      exemplos.forEach(e => {
        console.log(`  - ${e.name} (pai: ${e.parent?.name})`)
      })
    }
    
    // Verificar uma categoria pai com filhos
    const comFilhos = await p.category.findFirst({
      where: { parentId: null },
      include: { children: { take: 5 } }
    })
    if (comFilhos) {
      console.log('\nCategoria pai:', comFilhos.name)
      console.log('Filhos:', comFilhos.children.map(c => c.name).join(', ') || 'Nenhum')
    }
    
  } catch (e) {
    console.log('Erro:', e.message)
  } finally {
    await p.$disconnect()
  }
}

check()
