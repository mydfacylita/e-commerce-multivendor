import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET: Obter regra específica
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const rule = await prisma.cashbackRule.findUnique({
      where: { id: params.id }
    });

    if (!rule) {
      return NextResponse.json({ error: 'Regra não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      rule: {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        type: rule.type,
        value: rule.value,
        minOrderValue: rule.minOrderValue,
        maxCashback: rule.maxCashback,
        categoryIds: rule.categoryIds ? JSON.parse(rule.categoryIds) : null,
        productIds: rule.productIds ? JSON.parse(rule.productIds) : null,
        sellerIds: rule.sellerIds ? JSON.parse(rule.sellerIds) : null,
        excludedProducts: rule.excludedProducts ? JSON.parse(rule.excludedProducts) : null,
        validFrom: rule.validFrom,
        validUntil: rule.validUntil,
        isActive: rule.isActive,
        priority: rule.priority,
        firstPurchaseOnly: rule.firstPurchaseOnly,
        forNewCustomers: rule.forNewCustomers,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt
      }
    });
  } catch (error) {
    console.error('Erro ao buscar regra:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT: Atualizar regra
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      type,
      value,
      minOrderValue,
      maxCashback,
      categoryIds,
      productIds,
      sellerIds,
      excludedProducts,
      validFrom,
      validUntil,
      isActive,
      priority,
      firstPurchaseOnly,
      forNewCustomers
    } = body;

    const rule = await prisma.cashbackRule.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(value !== undefined && { value }),
        ...(minOrderValue !== undefined && { minOrderValue }),
        ...(maxCashback !== undefined && { maxCashback }),
        ...(categoryIds !== undefined && { categoryIds: categoryIds ? JSON.stringify(categoryIds) : null }),
        ...(productIds !== undefined && { productIds: productIds ? JSON.stringify(productIds) : null }),
        ...(sellerIds !== undefined && { sellerIds: sellerIds ? JSON.stringify(sellerIds) : null }),
        ...(excludedProducts !== undefined && { excludedProducts: excludedProducts ? JSON.stringify(excludedProducts) : null }),
        ...(validFrom && { validFrom: new Date(validFrom) }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(isActive !== undefined && { isActive }),
        ...(priority !== undefined && { priority }),
        ...(firstPurchaseOnly !== undefined && { firstPurchaseOnly }),
        ...(forNewCustomers !== undefined && { forNewCustomers })
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Regra atualizada com sucesso',
      rule: {
        id: rule.id,
        name: rule.name,
        isActive: rule.isActive
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar regra:', error);
    return NextResponse.json({ error: 'Erro ao atualizar regra' }, { status: 500 });
  }
}

// DELETE: Excluir regra
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    await prisma.cashbackRule.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Regra excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir regra:', error);
    return NextResponse.json({ error: 'Erro ao excluir regra' }, { status: 500 });
  }
}
