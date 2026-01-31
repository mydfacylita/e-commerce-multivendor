import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/admin/config/email/test
 * Envia email de teste
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

    const { email, config } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 })
    }

    if (!config?.smtpHost || !config?.smtpUser) {
      return NextResponse.json({ error: 'Configure o servidor SMTP primeiro' }, { status: 400 })
    }

    // Criar transporter
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort || 587,
      secure: config.smtpSecure || false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    // Verificar conexão
    try {
      await transporter.verify()
    } catch (verifyError: any) {
      console.error('Erro na verificação SMTP:', verifyError)
      return NextResponse.json({ 
        success: false, 
        error: `Falha na conexão: ${verifyError.message}` 
      }, { status: 400 })
    }

    // Enviar email de teste
    const info = await transporter.sendMail({
      from: `"${config.fromName || 'Sistema'}" <${config.fromEmail || config.smtpUser}>`,
      to: email,
      subject: '✅ Teste de E-mail - Configuração OK',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3B82F6, #1D4ED8); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Teste Bem Sucedido!</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #334155;">
              Parabéns! Seu servidor de e-mail está configurado corretamente.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; color: #1e40af;">📧 Configurações Utilizadas:</h3>
              <table style="width: 100%; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Host:</td>
                  <td style="padding: 8px 0; color: #334155;">${config.smtpHost}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Porta:</td>
                  <td style="padding: 8px 0; color: #334155;">${config.smtpPort}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Usuário:</td>
                  <td style="padding: 8px 0; color: #334155;">${config.smtpUser}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Remetente:</td>
                  <td style="padding: 8px 0; color: #334155;">${config.fromName} &lt;${config.fromEmail || config.smtpUser}&gt;</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
              Enviado em ${new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      `
    })

    console.log('Email de teste enviado:', info.messageId)

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId 
    })
  } catch (error: any) {
    console.error('Erro ao enviar email de teste:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro ao enviar e-mail' 
    }, { status: 500 })
  }
}
