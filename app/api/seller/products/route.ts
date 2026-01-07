import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserPermissions, getSellerFromSession } from '@/lib/seller';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// POST - Criar novo produto do vendedor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissões
    const permissions = await getUserPermissions(session);
    if (!permissions || !permissions.canManageProducts) {
      return NextResponse.json(
        { error: 'Você não tem permissão para gerenciar produtos' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { seller: true },
    });

    if (!user?.seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    if (user.seller.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Sua conta precisa estar ativa para cadastrar produtos' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const {
      name,
      description,
      price,
      comparePrice,
      stock,
      categoryId,
      brand,
      model,
      color,
      images,
      specifications,
    } = data;

    // Validações
    if (!name || !description || !price || !stock || !categoryId) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
    }

    // Gerar slug único
    let slug = generateSlug(name);
    let slugExists = await prisma.product.findUnique({ where: { slug } });
    let counter = 1;

    while (slugExists) {
      slug = `${generateSlug(name)}-${counter}`;
      slugExists = await prisma.product.findUnique({ where: { slug } });
      counter++;
    }

    // Criar produto
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price,
        comparePrice,
        stock,
        categoryId,
        sellerId: user.seller.id,
        brand,
        model,
        color,
        images,
        specifications,
        active: true, // Produto ativo por padrão
        featured: false,
      },
      include: {
        category: true,
        seller: {
          select: {
            storeName: true,
            storeSlug: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
  }
}

// GET - Listar produtos do vendedor logado
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissões
    const permissions = await getUserPermissions(session);
    if (!permissions || !permissions.canManageProducts) {
      return NextResponse.json(
        { error: 'Você não tem permissão para visualizar produtos' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { seller: true },
    });

    if (!user?.seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: { sellerId: user.seller.id },
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    return NextResponse.json({ error: 'Erro ao listar produtos' }, { status: 500 });
  }
}

// PUT - Atualizar produto do vendedor
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissões
    const permissions = await getUserPermissions(session);
    if (!permissions || !permissions.canManageProducts) {
      return NextResponse.json(
        { error: 'Você não tem permissão para editar produtos' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { seller: true },
    });

    if (!user?.seller) {
      return NextResponse.json({ error: 'Você não é um vendedor' }, { status: 403 });
    }

    const data = await request.json();
    const { productId, ...updateData } = data;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID é obrigatório' }, { status: 400 });
    }

    // Verificar se o produto pertence ao vendedor
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.sellerId !== user.seller.id) {
      return NextResponse.json(
        { error: 'Produto não encontrado ou você não tem permissão' },
        { status: 404 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 });
  }
}

// DELETE - Deletar produto do vendedor
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissões
    const permissions = await getUserPermissions(session);
    if (!permissions || !permissions.canManageProducts) {
      return NextResponse.json(
        { error: 'Você não tem permissão para deletar produtos' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { seller: true },
    });

    if (!user?.seller) {
      return NextResponse.json({ error: 'Você não é um vendedor' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID é obrigatório' }, { status: 400 });
    }

    // Verificar se o produto pertence ao vendedor
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.sellerId !== user.seller.id) {
      return NextResponse.json(
        { error: 'Produto não encontrado ou você não tem permissão' },
        { status: 404 }
      );
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    return NextResponse.json({ error: 'Erro ao deletar produto' }, { status: 500 });
  }
}
