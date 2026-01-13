import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

// POST - Cadastrar novo vendedor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { seller: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (user.seller) {
      return NextResponse.json({ error: 'Você já tem um cadastro de vendedor' }, { status: 400 });
    }

    const data = await request.json();
    const {
      storeName,
      storeDescription,
      sellerType,
      cpf,
      rg,
      dataNascimento,
      cnpj,
      razaoSocial,
      nomeFantasia,
      inscricaoEstadual,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      banco,
      agencia,
      conta,
      tipoConta,
      chavePix,
    } = data;

    // Validações básicas
    if (!storeName || !sellerType) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
    }

    if (sellerType === 'PF' && !cpf) {
      return NextResponse.json({ error: 'CPF é obrigatório para Pessoa Física' }, { status: 400 });
    }

    if (sellerType === 'PJ' && (!cnpj || !razaoSocial)) {
      return NextResponse.json({ error: 'CNPJ e Razão Social são obrigatórios para Pessoa Jurídica' }, { status: 400 });
    }

    // Gerar slug único
    let storeSlug = generateSlug(storeName);
    let slugExists = await prisma.seller.findUnique({ where: { storeSlug } });
    let counter = 1;

    while (slugExists) {
      storeSlug = `${generateSlug(storeName)}-${counter}`;
      slugExists = await prisma.seller.findUnique({ where: { storeSlug } });
      counter++;
    }

    // Criar vendedor
    const seller = await prisma.seller.create({
      data: {
        userId: user.id,
        storeName,
        storeSlug,
        storeDescription,
        sellerType,
        cpf: sellerType === 'PF' ? cpf : null,
        rg: sellerType === 'PF' ? rg : null,
        dataNascimento: sellerType === 'PF' && dataNascimento ? new Date(dataNascimento) : null,
        cnpj: sellerType === 'PJ' ? cnpj : null,
        razaoSocial: sellerType === 'PJ' ? razaoSocial : null,
        nomeFantasia: sellerType === 'PJ' ? nomeFantasia : null,
        inscricaoEstadual: sellerType === 'PJ' ? inscricaoEstadual : null,
        cep,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        banco,
        agencia,
        conta,
        tipoConta,
        chavePix,
        status: 'PENDING', // Aguardando aprovação
      },
    });

    // Atualizar role do usuário para SELLER
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SELLER' },
    });

    return NextResponse.json({
      success: true,
      seller: {
        id: seller.id,
        storeName: seller.storeName,
        storeSlug: seller.storeSlug,
        status: seller.status,
      },
    });
  } catch (error) {
    console.error('Erro ao cadastrar vendedor:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar vendedor' }, { status: 500 });
  }
}

// GET - Obter dados do vendedor logado
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        seller: {
          include: {
            subscription: true, // 1:1 relacionamento
            products: {
              include: {
                category: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        workForSeller: {
          include: {
            subscription: true, // 1:1 relacionamento
            products: {
              include: {
                category: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    // Se tem seller próprio, retorna ele
    if (user?.seller) {
      return NextResponse.json({
        seller: user.seller,
      });
    }

    // Se é funcionário, retorna o seller do empregador
    if (user?.workForSeller) {
      return NextResponse.json({
        seller: user.workForSeller,
      });
    }

    return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
  } catch (error) {
    console.error('Erro ao buscar vendedor:', error);
    return NextResponse.json({ error: 'Erro ao buscar vendedor' }, { status: 500 });
  }
}

// PUT - Atualizar dados do vendedor
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { seller: true },
    });

    if (!user?.seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    const data = await request.json();

    // Não permitir alterar dados se status for PENDING
    if (user.seller.status === 'PENDING') {
      return NextResponse.json(
        { error: 'Não é possível editar enquanto o cadastro está em análise' },
        { status: 400 }
      );
    }

    const updatedSeller = await prisma.seller.update({
      where: { id: user.seller.id },
      data: {
        storeDescription: data.storeDescription,
        cep: data.cep,
        endereco: data.endereco,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado,
        banco: data.banco,
        agencia: data.agencia,
        conta: data.conta,
        tipoConta: data.tipoConta,
        chavePix: data.chavePix,
      },
    });

    return NextResponse.json({ success: true, seller: updatedSeller });
  } catch (error) {
    console.error('Erro ao atualizar vendedor:', error);
    return NextResponse.json({ error: 'Erro ao atualizar vendedor' }, { status: 500 });
  }
}
