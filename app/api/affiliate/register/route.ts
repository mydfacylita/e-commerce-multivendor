import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * POST: Cadastro público de afiliado (influenciador se candidata)
 * Endpoint público - não requer autenticação
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      password,
      phone,
      cpf,
      instagram,
      youtube,
      tiktok,
      otherSocial,
      banco,
      agencia,
      conta,
      tipoConta,
      chavePix
    } = body

    // Validações básicas
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      // Se usuário existe, verificar se já é afiliado
      const existingAffiliate = await prisma.affiliate.findUnique({
        where: { userId: existingUser.id }
      })

      if (existingAffiliate) {
        return NextResponse.json(
          { error: 'Este email já está cadastrado como afiliado' },
          { status: 400 }
        )
      }

      // Usuário existe mas não é afiliado - criar afiliado para ele
      const code = await generateUniqueCode(name)

      const affiliate = await prisma.affiliate.create({
        data: {
          userId: existingUser.id,
          code,
          name,
          email,
          phone,
          cpf,
          instagram,
          youtube,
          tiktok,
          otherSocial,
          banco,
          agencia,
          conta,
          tipoConta,
          chavePix,
          commissionRate: 5, // Taxa padrão
          status: 'PENDING',
          isActive: false
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Cadastro enviado com sucesso! Aguarde aprovação.',
        data: {
          userId: existingUser.id,
          affiliateId: affiliate.id,
          code: affiliate.code,
          status: affiliate.status
        }
      }, { status: 201 })
    }

    // Criar novo usuário E afiliado
    const hashedPassword = await bcrypt.hash(password, 10)
    const code = await generateUniqueCode(name)

    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar usuário
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          cpf,
          role: 'USER', // Afiliado é um USER comum
          isActive: true
        }
      })

      // 2. Criar afiliado
      const affiliate = await tx.affiliate.create({
        data: {
          userId: user.id,
          code,
          name,
          email,
          phone,
          cpf,
          instagram,
          youtube,
          tiktok,
          otherSocial,
          banco,
          agencia,
          conta,
          tipoConta,
          chavePix,
          commissionRate: 5,
          status: 'PENDING',
          isActive: false
        }
      })

      return { user, affiliate }
    })

    // TODO: Enviar email de confirmação de cadastro

    return NextResponse.json({
      success: true,
      message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador.',
      data: {
        userId: result.user.id,
        affiliateId: result.affiliate.id,
        code: result.affiliate.code,
        status: result.affiliate.status
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao cadastrar afiliado:', error)
    return NextResponse.json(
      { error: 'Erro ao processar cadastro' },
      { status: 500 }
    )
  }
}

async function generateUniqueCode(name: string): Promise<string> {
  // Gerar código baseado no nome
  const baseName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9]/g, '') // Remove caracteres especiais
    .toUpperCase()
    .substring(0, 6)

  let code = baseName
  let counter = 1

  // Garantir que o código é único
  while (true) {
    const existing = await prisma.affiliate.findUnique({
      where: { code }
    })

    if (!existing) break

    code = `${baseName}${counter}`
    counter++
  }

  return code
}
