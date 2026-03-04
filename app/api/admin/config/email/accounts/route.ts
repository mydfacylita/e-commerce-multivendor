import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

const DOMAIN = 'mydsistemas.com.br'
const ACCOUNTS_CONFIG_KEY = 'email.accounts'

// Helper: busca contas salvas no DB
async function getAccountsFromDb() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: ACCOUNTS_CONFIG_KEY }
  })
  if (!config?.value) return []
  try {
    return JSON.parse(config.value)
  } catch {
    return []
  }
}

// Helper: salva contas no DB
async function saveAccountsToDb(accounts: any[]) {
  await prisma.systemConfig.upsert({
    where: { key: ACCOUNTS_CONFIG_KEY },
    update: { value: JSON.stringify(accounts) },
    create: {
      key: ACCOUNTS_CONFIG_KEY,
      value: JSON.stringify(accounts),
      category: 'email',
      label: 'Contas de E-mail'
    }
  })
}

// Helper: verificar se é admin
async function checkAdmin(session: any) {
  if (!session?.user?.id) return false
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })
  return user?.role === 'ADMIN'
}

/**
 * GET /api/admin/config/email/accounts
 * Lista contas de e-mail
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!await checkAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const accounts = await getAccountsFromDb()
    return NextResponse.json({ accounts })
  } catch (error) {
    console.error('Erro ao listar contas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * POST /api/admin/config/email/accounts
 * Cria nova conta de e-mail
 * Body: { email: 'sac', name: 'SAC', password: '...' }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!await checkAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, password } = body

    // Validações
    if (!email || !password) {
      return NextResponse.json({ message: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }

    // Normaliza o username (sem domínio)
    const username = email.includes('@') ? email.split('@')[0] : email
    if (!/^[a-z0-9_.-]+$/.test(username)) {
      return NextResponse.json({ message: 'Nome de usuário inválido. Use apenas letras minúsculas, números, _ . -' }, { status: 400 })
    }

    const fullEmail = `${username}@${DOMAIN}`

    // Verificar se já existe
    const accounts = await getAccountsFromDb()
    if (accounts.find((a: any) => a.email === fullEmail)) {
      return NextResponse.json({ message: 'Esta conta já existe' }, { status: 409 })
    }

    // Tentar criar o usuário no sistema (Postfix/Dovecot usa system auth)
    let systemCreated = false
    let systemError = ''

    try {
      // Verificar se usuário já existe no sistema
      const { stdout: existCheck } = await execAsync(`id "${username}" 2>/dev/null || echo "NOT_EXISTS"`)

      if (existCheck.includes('NOT_EXISTS')) {
        // Criar usuário sem login shell
        await execAsync(`useradd -m -s /usr/sbin/nologin -c "${name || username}" "${username}"`)
      }

      // Definir senha
      await execAsync(`echo "${username}:${password.replace(/'/g, "'\\''")}" | chpasswd`)

      systemCreated = true
    } catch (err: any) {
      systemError = err.message
      console.warn('⚠️ Não foi possível criar usuário no sistema:', err.message)
    }

    // Salvar no banco de dados
    const newAccount = {
      id: `${username}-${Date.now()}`,
      email: fullEmail,
      name: name || username,
      isDefault: accounts.length === 0,
      createdAt: new Date().toISOString(),
      systemCreated
    }

    accounts.push(newAccount)
    await saveAccountsToDb(accounts)

    return NextResponse.json({
      success: true,
      account: newAccount,
      systemCreated,
      ...(systemError && { warning: `Conta salva no banco mas ocorreu um erro ao criar usuário no sistema: ${systemError}` })
    })
  } catch (error: any) {
    console.error('Erro ao criar conta:', error)
    return NextResponse.json({ message: error.message || 'Erro ao criar conta' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/config/email/accounts
 * Atualiza conta (ex: definir como padrão, trocar senha)
 * Body: { id: '...', action: 'setDefault' | 'changePassword', password?: '...' }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!await checkAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { id, action, password } = body

    const accounts = await getAccountsFromDb()
    const accountIndex = accounts.findIndex((a: any) => a.id === id)

    if (accountIndex === -1) {
      return NextResponse.json({ message: 'Conta não encontrada' }, { status: 404 })
    }

    const account = accounts[accountIndex]
    const username = account.email.split('@')[0]

    if (action === 'setDefault') {
      accounts.forEach((a: any) => { a.isDefault = false })
      accounts[accountIndex].isDefault = true
    } else if (action === 'changePassword') {
      if (!password) {
        return NextResponse.json({ message: 'Senha é obrigatória' }, { status: 400 })
      }
      try {
        await execAsync(`echo "${username}:${password.replace(/'/g, "'\\''")}" | chpasswd`)
      } catch (err: any) {
        console.warn('Erro ao trocar senha no sistema:', err.message)
      }
    }

    await saveAccountsToDb(accounts)
    return NextResponse.json({ success: true, accounts })
  } catch (error: any) {
    console.error('Erro ao atualizar conta:', error)
    return NextResponse.json({ message: error.message || 'Erro ao atualizar conta' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/config/email/accounts
 * Remove uma conta de e-mail
 * Body: { id: '...' }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!await checkAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ message: 'ID da conta é obrigatório' }, { status: 400 })
    }

    const accounts = await getAccountsFromDb()
    const account = accounts.find((a: any) => a.id === id)

    if (!account) {
      return NextResponse.json({ message: 'Conta não encontrada' }, { status: 404 })
    }

    const username = account.email.split('@')[0]

    // Tentar remover usuário do sistema
    try {
      await execAsync(`userdel -r "${username}" 2>/dev/null || true`)
    } catch (err: any) {
      console.warn('Erro ao remover usuário do sistema:', err.message)
    }

    // Remover do banco
    const updated = accounts.filter((a: any) => a.id !== id)

    // Se era o padrão e ainda tem contas, o primeiro vira padrão
    if (account.isDefault && updated.length > 0) {
      updated[0].isDefault = true
    }

    await saveAccountsToDb(updated)
    return NextResponse.json({ success: true, accounts: updated })
  } catch (error: any) {
    console.error('Erro ao remover conta:', error)
    return NextResponse.json({ message: error.message || 'Erro ao remover conta' }, { status: 500 })
  }
}
