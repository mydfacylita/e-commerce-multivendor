import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET: Listar regras de cashback (Admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');

    const where: any = {};
    if (active === 'true') {
      where.isActive = true;
    } else if (active === 'false') {
      where.isActive = false;
    }

    const rules = await prisma.cashbackRule.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      rules: rules.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        type: r.type,
        value: r.value,
        minOrderValue: r.minOrderValue,
        maxCashback: r.maxCashback,
        categoryIds: r.categoryIds ? JSON.parse(r.categoryIds) : null,
        productIds: r.productIds ? JSON.parse(r.productIds) : null,
        sellerIds: r.sellerIds ? JSON.parse(r.sellerIds) : null,
        validFrom: r.validFrom,
        validUntil: r.validUntil,
        isActive: r.isActive,
        priority: r.priority,
        firstPurchaseOnly: r.firstPurchaseOnly,
        forNewCustomers: r.forNewCustomers,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Erro ao listar regras:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST: Criar nova regra de cashback
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      type = 'PERCENTAGE',
      value,
      minOrderValue,
      maxCashback,
      categoryIds,
      productIds,
      sellerIds,
      excludedProducts,
      validFrom,
      validUntil,
      isActive = true,
      priority = 0,
      firstPurchaseOnly = false,
      forNewCustomers = false
    } = body;

    if (!name || value === undefined) {
      return NextResponse.json({ error: 'Nome e valor são obrigatórios' }, { status: 400 });
    }

    const rule = await prisma.cashbackRule.create({
      data: {
        name,
        description,
        type,
        value,
        minOrderValue,
        maxCashback,
        categoryIds: categoryIds ? JSON.stringify(categoryIds) : null,
        productIds: productIds ? JSON.stringify(productIds) : null,
        sellerIds: sellerIds ? JSON.stringify(sellerIds) : null,
        excludedProducts: excludedProducts ? JSON.stringify(excludedProducts) : null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive,
        priority,
        firstPurchaseOnly,
        forNewCustomers,
        createdBy: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Regra de cashback criada com sucesso',
      rule: {
        id: rule.id,
        name: rule.name,
        type: rule.type,
        value: rule.value,
        isActive: rule.isActive
      }
    });
  } catch (error) {
    console.error('Erro ao criar regra:', error);
    return NextResponse.json({ error: 'Erro ao criar regra' }, { status: 500 });
  }
}
