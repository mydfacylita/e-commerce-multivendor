import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'

/**
 * POST /api/admin/email/send
 * Envia email com anexos
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Parse FormData
    const formData = await request.formData()
    const to = formData.get('to') as string
    const cc = formData.get('cc') as string
    const subject = formData.get('subject') as string
    const body = formData.get('body') as string

    if (!to || !subject) {
      return NextResponse.json({ error: 'Destinatário e assunto são obrigatórios' }, { status: 400 })
    }

    // Buscar configurações de email
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'email.' } }
    })

    const configMap: Record<string, string> = {}
    configs.forEach((c: { key: string; value: string }) => {
      configMap[c.key.replace('email.', '')] = c.value
    })

    if (!configMap['smtpHost'] || !configMap['smtpUser']) {
      return NextResponse.json({ error: 'Servidor de email não configurado' }, { status: 400 })
    }

    // Processar anexos
    const attachments: { filename: string; content: Buffer }[] = []
    
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('attachment_') && value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer())
        attachments.push({
          filename: value.name,
          content: buffer
        })
      }
    }

    // Criar transporter com configurações mais robustas
    const smtpPort = parseInt(configMap['smtpPort'] || '587')
    const isSecure = smtpPort === 465 || configMap['smtpSecure'] === 'true'
    
    console.log('[Email] Configurações SMTP:', {
      host: configMap['smtpHost'],
      port: smtpPort,
      secure: isSecure,
      user: configMap['smtpUser']
    })
    
    // Tentar criar transporter com diferentes configurações
    let transporter = nodemailer.createTransport({
      host: configMap['smtpHost'],
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: configMap['smtpUser'],
        pass: configMap['smtpPassword']
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      }
    })

    // Verificar conexão antes de enviar
    try {
      await transporter.verify()
      console.log('[Email] Conexão SMTP verificada com sucesso')
    } catch (verifyError: any) {
      console.error('[Email] Erro na verificação SMTP:', verifyError.message)
      
      // Tentar com porta 465 (SSL) se falhou com 587
      if (smtpPort === 587) {
        console.log('[Email] Tentando com porta 465 (SSL)...')
        transporter = nodemailer.createTransport({
          host: configMap['smtpHost'],
          port: 465,
          secure: true,
          auth: {
            user: configMap['smtpUser'],
            pass: configMap['smtpPassword']
          },
          tls: {
            rejectUnauthorized: false
          }
        })
        
        try {
          await transporter.verify()
          console.log('[Email] Conexão SMTP (465) verificada com sucesso')
        } catch (err2: any) {
          // Se ainda falhar, retorna erro detalhado
          return NextResponse.json({ 
            error: `Falha na autenticação SMTP. Verifique usuário e senha. Detalhe: ${verifyError.message}` 
          }, { status: 500 })
        }
      } else {
        return NextResponse.json({ 
          error: `Falha na autenticação SMTP. Verifique usuário e senha. Detalhe: ${verifyError.message}` 
        }, { status: 500 })
      }
    }

    // Enviar email
    const info = await transporter.sendMail({
      from: `"${configMap['fromName'] || 'Sistema'}" <${configMap['fromEmail'] || configMap['smtpUser']}>`,
      to,
      cc: cc || undefined,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
      attachments
    })

    console.log('Email enviado:', info.messageId)

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId 
    })
  } catch (error: any) {
    console.error('Erro ao enviar email:', error)
    return NextResponse.json({ 
      error: error.message || 'Erro ao enviar e-mail' 
    }, { status: 500 })
  }
}
