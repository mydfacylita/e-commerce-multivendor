import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar usuário admin principal
  const adminPassword = await bcrypt.hash('131189', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'misael_ribeiro@hotmail.com' },
    update: {},
    create: {
      name: 'Misael Feitoza Ribeiro',
      email: 'misael_ribeiro@hotmail.com',
      password: adminPassword,
      cpf: '01940069300',
      role: 'ADMIN',
    },
  })
  console.log('✅ Usuário admin criado:', admin.email)

  // Criar usuário comum
  const userPassword = await bcrypt.hash('user123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Usuário Teste',
      email: 'user@example.com',
      password: userPassword,
      role: 'USER',
    },
  })
  console.log('✅ Usuário comum criado:', user.email)

  // Criar fornecedores
  const fornecedor1 = await prisma.supplier.upsert({
    where: { email: 'contato@fornecedor1.com' },
    update: {},
    create: {
      name: 'Fornecedor Global',
      email: 'contato@fornecedor1.com',
      phone: '(11) 98765-4321',
      website: 'https://fornecedorglobal.com',
      commission: 15,
      active: true,
    },
  })
  console.log('✅ Fornecedor 1 criado:', fornecedor1.name)

  const fornecedor2 = await prisma.supplier.upsert({
    where: { email: 'vendas@dropship.com' },
    update: {},
    create: {
      name: 'Dropship Premium',
      email: 'vendas@dropship.com',
      phone: '(21) 99876-5432',
      website: 'https://dropshippremium.com',
      apiUrl: 'https://api.dropshippremium.com/v1',
      apiKey: 'demo-api-key-12345',
      commission: 20,
      active: true,
    },
  })
  console.log('✅ Fornecedor 2 criado:', fornecedor2.name)

  // Criar categorias
  const categorias = [
    {
      name: 'Eletrônicos',
      slug: 'eletronicos',
      description: 'Produtos eletrônicos e tecnologia de ponta',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
    },
    {
      name: 'Moda',
      slug: 'moda',
      description: 'Roupas e acessórios para todos os estilos',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
    },
    {
      name: 'Livros',
      slug: 'livros',
      description: 'Livros de diversos gêneros e autores',
      image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
    },
    {
      name: 'Casa e Decoração',
      slug: 'casa-decoracao',
      description: 'Itens para deixar sua casa ainda mais bonita',
      image: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=400',
    },
    {
      name: 'Esportes',
      slug: 'esportes',
      description: 'Equipamentos e roupas para prática esportiva',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400',
    },
  ]

  const categoriasCreated = []
  for (const cat of categorias) {
    const categoria = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
    categoriasCreated.push(categoria)
    console.log('✅ Categoria criada:', categoria.name)
  }

  // Criar produtos
  const produtos = [
    {
      name: 'Smartphone Galaxy S23',
      slug: 'smartphone-galaxy-s23',
      description: 'Smartphone de última geração com câmera de alta resolução e processador potente',
      price: 2999.99,
      comparePrice: 3499.99,
      stock: 50,
      featured: true,
      categoryId: categoriasCreated[0].id,
      images: JSON.stringify(['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400']),
    },
    {
      name: 'Notebook Dell Inspiron 15',
      slug: 'notebook-dell-inspiron-15',
      description: 'Notebook potente para trabalho e estudos, com Intel Core i7 e 16GB RAM',
      price: 4299.99,
      comparePrice: 4999.99,
      stock: 30,
      featured: true,
      categoryId: categoriasCreated[0].id,
      images: JSON.stringify(['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400']),
    },
    {
      name: 'Fone Bluetooth JBL',
      slug: 'fone-bluetooth-jbl',
      description: 'Fone de ouvido bluetooth com cancelamento de ruído',
      price: 399.99,
      stock: 100,
      featured: false,
      categoryId: categoriasCreated[0].id,
      images: JSON.stringify(['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400']),
    },
    {
      name: 'Camiseta Básica Premium',
      slug: 'camiseta-basica-premium',
      description: 'Camiseta de algodão 100% premium, confortável e durável',
      price: 79.99,
      comparePrice: 129.99,
      stock: 200,
      featured: false,
      categoryId: categoriasCreated[1].id,
      images: JSON.stringify(['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400']),
    },
    {
      name: 'Tênis Nike Air Max',
      slug: 'tenis-nike-air-max',
      description: 'Tênis esportivo com tecnologia Air Max para máximo conforto',
      price: 599.99,
      comparePrice: 799.99,
      stock: 80,
      featured: true,
      categoryId: categoriasCreated[4].id,
      images: JSON.stringify(['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400']),
    },
    {
      name: 'Livro: Clean Code',
      slug: 'livro-clean-code',
      description: 'Guia completo sobre código limpo e boas práticas de programação',
      price: 89.99,
      stock: 50,
      featured: true,
      categoryId: categoriasCreated[2].id,
      images: JSON.stringify(['https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400']),
    },
    {
      name: 'Luminária LED Moderna',
      slug: 'luminaria-led-moderna',
      description: 'Luminária de mesa com LED ajustável, perfeita para leitura',
      price: 149.99,
      stock: 60,
      featured: false,
      categoryId: categoriasCreated[3].id,
      images: JSON.stringify(['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400']),
    },
    {
      name: 'Smart Watch Series 7',
      slug: 'smart-watch-series-7',
      description: 'Relógio inteligente com monitoramento de saúde e fitness',
      price: 1899.99,
      comparePrice: 2299.99,
      stock: 40,
      featured: true,
      categoryId: categoriasCreated[0].id,
      images: JSON.stringify(['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400']),
    },
  ]

  for (const prod of produtos) {
    const produto = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: prod,
    })
    console.log('✅ Produto criado:', produto.name)
  }

  console.log('\n🎉 Seed concluído com sucesso!')
  console.log('\n📝 Credenciais de acesso:')
  console.log('   Admin:')
  console.log('   - Email: admin@example.com')
  console.log('   - Senha: admin123')
  console.log('\n   Usuário:')
  console.log('   - Email: user@example.com')
  console.log('   - Senha: user123')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
