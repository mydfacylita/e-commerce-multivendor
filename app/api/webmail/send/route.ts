import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'

/**
 * POST /api/webmail/send
 * Envia email via SMTP
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const cookieStore = await cookies()
    const session = cookieStore.get('webmail_session')

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const sessionData = JSON.parse(session.value)
    const { to, subject, body } = await request.json()

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Destinatário e assunto são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar configurações SMTP
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'email.' } }
    })

    const configMap: Record<string, string> = {}
    configs.forEach(c => {
      configMap[c.key.replace('email.', '')] = c.value
    })

    if (!configMap.smtpHost || !configMap.smtpUser) {
      return NextResponse.json(
        { error: 'Servidor SMTP não configurado' },
        { status: 500 }
      )
    }

    // Configurar transporter
    const transporter = nodemailer.createTransport({
      host: configMap.smtpHost,
      port: parseInt(configMap.smtpPort || '587'),
      secure: configMap.smtpSecure === 'true',
      auth: {
        user: sessionData.username,
        pass: sessionData.password // Nota: precisaria armazenar na sessão
      }
    })

    // Enviar email
    await transporter.sendMail({
      from: `${sessionData.email}`,
      to,
      subject,
      text: body
    })

    return NextResponse.json({ 
      success: true,
      message: 'E-mail enviado com sucesso'
    })
  } catch (error: any) {
    console.error('Erro ao enviar email:', error)
    return NextResponse.json(
      { 
        success: false,
        message: error.message || 'Erro ao enviar email' 
      },
      { status: 500 }
    )
  }
}
