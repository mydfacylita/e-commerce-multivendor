import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { checkRateLimit, isValidEmail, sanitizeHtml } from '@/lib/validation'

/**
 * 🔒 Validar força da senha
 */
function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'A senha deve ter pelo menos 8 caracteres' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos uma letra maiúscula' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos uma letra minúscula' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos um número' }
  }
  if (password.length > 128) {
    return { valid: false, message: 'A senha não pode ter mais de 128 caracteres' }
  }
  return { valid: true }
}

export async function POST(req: NextRequest) {
  try {
    // 🔒 Rate limiting: 5 registros por hora por IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown'
    const rateLimit = checkRateLimit(`register:${ip}`, 5, 3600000) // 5 por hora
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Muitas tentativas de registro. Tente novamente em 1 hora.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { name, email, password } = body

    // 🔒 Validar campos obrigatórios
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    // 🔒 Sanitizar nome
    const sanitizedName = sanitizeHtml(name.trim()).substring(0, 100)
    if (!sanitizedName || sanitizedName.length < 2) {
      return NextResponse.json(
        { message: 'Nome inválido' },
        { status: 400 }
      )
    }

    // 🔒 Validar formato do email
    const sanitizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { message: 'Email inválido' },
        { status: 400 }
      )
    }

    // 🔒 Validar força da senha
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { message: passwordValidation.message },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email já cadastrado' },
        { status: 400 }
      )
    }

    // 🔒 Hash com custo 12 (mais seguro que 10)
    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name: sanitizedName,
        email: sanitizedEmail,
        password: hashedPassword,
      },
    })

    // 🔒 Não retornar dados sensíveis
    return NextResponse.json(
      { message: 'Usuário criado com sucesso', user: { id: user.id, email: user.email } },
      { status: 201 }
    )
  } catch (error) {
    // 🔒 Log sem expor detalhes ao cliente
    console.error('[Register] Erro ao criar usuário')
    return NextResponse.json(
      { message: 'Erro ao criar usuário. Tente novamente.' },
      { status: 500 }
    )
  }
}
