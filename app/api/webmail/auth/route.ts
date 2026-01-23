import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * POST /api/webmail/auth
 * Autentica usuário de email via doveadm
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Extrair usuário do email (antes do @)
    const username = email.split('@')[0]

    try {
      // Testar autenticação com doveadm
      const { stdout, stderr } = await execAsync(
        `doveadm auth test ${username} '${password.replace(/'/g, "'\\''")}'`
      )

      if (stdout.includes('passdb:') && !stderr) {
        // Autenticação bem-sucedida - criar sessão
        const sessionData = {
          email,
          username,
          password, // Necessário para SMTP
          expires: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
        }

        const response = NextResponse.json({
          success: true,
          email,
          username
        })

        // Criar cookie de sessão
        response.cookies.set('webmail_session', JSON.stringify(sessionData), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 // 24 horas
        })

        return response
      } else {
        return NextResponse.json(
          { success: false, message: 'Email ou senha incorretos' },
          { status: 401 }
        )
      }
    } catch (error: any) {
      console.error('Erro de autenticação:', error)
      return NextResponse.json(
        { success: false, message: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Erro no endpoint de autenticação:', error)
    return NextResponse.json(
      { success: false, message: 'Erro no servidor' },
      { status: 500 }
    )
  }
}
