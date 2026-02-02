import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { checkRateLimit, getClientIP } from '@/lib/api-security'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema de validação
const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido').max(255)
})

// Rate limit específico para recuperação de senha (3 tentativas por minuto)
const AUTH_RATE_LIMIT = 3

export async function POST(request: NextRequest) {
  try {
    // 1️⃣ RATE LIMITING - Proteção contra brute force
    const clientIP = getClientIP(request)
    const rateLimitKey = `forgot-password:${clientIP}`
    const rateLimit = checkRateLimit(rateLimitKey)
    
    // Rate limit mais restritivo para esta API (3/min em vez de 60/min)
    if (!rateLimit.allowed || rateLimit.remaining < (60 - AUTH_RATE_LIMIT)) {
      console.warn(`[SECURITY] Rate limit excedido para forgot-password: ${clientIP}`)
      return NextResponse.json(
        { message: 'Muitas tentativas. Aguarde alguns minutos.' },
        { status: 429 }
      )
    }

    // 2️⃣ VALIDAÇÃO DE INPUT
    const body = await request.json()
    const validation = forgotPasswordSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Email inválido' },
        { status: 400 }
      )
    }
    
    const { email } = validation.data

    // Buscar usuário (não revelar se existe ou não por segurança)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (user) {
      // Gerar token único
      const token = randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

      // Salvar token no banco (usando VerificationToken que já existe no schema)
      await prisma.verificationToken.create({
        data: {
          identifier: email.toLowerCase().trim(),
          token,
          expires: expiresAt,
        }
      })

      // Enviar email
      const resetUrl = `${process.env.NEXTAUTH_URL}/redefinir-senha?token=${token}`
      
      try {
        // Buscar configurações de email (chaves separadas no banco)
        const emailConfigs = await prisma.systemConfig.findMany({
          where: {
            key: {
              in: [
                'email.smtpHost', 'email.smtpPort', 'email.smtpUser', 
                'email.smtpPassword', 'email.fromName', 'email.fromEmail',
                'email.smtpSecure', 'email_config'
              ]
            }
          }
        })
        
        // Converter array para objeto
        const configMap: Record<string, string> = {}
        emailConfigs.forEach(c => {
          configMap[c.key] = c.value
        })
        
        // Tentar JSON primeiro, depois chaves individuais
        let config: any = {}
        if (configMap['email_config']) {
          try {
            config = JSON.parse(configMap['email_config'])
          } catch {}
        }
        
        // Sobrescrever/adicionar com chaves individuais
        config.smtpHost = config.smtpHost || configMap['email.smtpHost']
        config.smtpPort = config.smtpPort || configMap['email.smtpPort']
        config.smtpUser = config.smtpUser || configMap['email.smtpUser']
        config.smtpPass = config.smtpPass || configMap['email.smtpPassword']
        config.fromName = config.fromName || configMap['email.fromName']
        config.fromEmail = config.fromEmail || configMap['email.fromEmail']
        config.smtpSecure = config.smtpSecure || configMap['email.smtpSecure']
        
        if (config.smtpHost && config.smtpUser && config.smtpPass) {
          // Usar nodemailer para enviar
          const nodemailer = require('nodemailer')
          
          const transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: parseInt(config.smtpPort) || 587,
            secure: config.smtpSecure === 'true' || config.smtpPort === '465',
            auth: {
              user: config.smtpUser,
              pass: config.smtpPass,
            },
            tls: {
              // Aceitar certificados auto-assinados
              rejectUnauthorized: false
            }
          })

          // Buscar logo e nome da empresa
          const siteConfigs = await prisma.systemConfig.findMany({
            where: {
              key: { in: ['app.logo', 'appearance.logo', 'app.name', 'site.name'] }
            }
          })
          const siteConfigMap: Record<string, string> = {}
          siteConfigs.forEach(c => { siteConfigMap[c.key] = c.value })
          
          const siteUrl = process.env.NEXTAUTH_URL || 'https://mydshop.com.br'
          const siteName = siteConfigMap['app.name'] || siteConfigMap['site.name'] || 'MYDSHOP'
          
          // Construir URL completa da logo
          let logoPath = siteConfigMap['app.logo'] || siteConfigMap['appearance.logo'] || ''
          const logoUrl = logoPath ? `https://mydshop.com.br${logoPath}` : ''

          await transporter.sendMail({
            from: `"${config.fromName || siteName}" <${config.fromEmail || config.smtpUser}>`,
            to: email,
            subject: `Recuperação de Senha - ${siteName}`,
            html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e0e0e0;">
          
          <!-- Header com Logo -->
          <tr>
            <td style="background-color: #ffffff; padding: 30px 40px 20px; text-align: center; border-bottom: 3px solid #667eea;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${siteName}" style="max-height: 70px; max-width: 220px; display: block; margin: 0 auto;">` : `<h1 style="color: #667eea; margin: 0; font-size: 28px; font-weight: bold;">${siteName}</h1>`}
            </td>
          </tr>
          
          <!-- Banner Roxo -->
          <tr>
            <td style="background-color: #667eea; padding: 20px 40px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">
                Recuperação de Senha
              </h2>
            </td>
          </tr>
          
          <!-- Conteúdo Principal -->
          <tr>
            <td style="padding: 35px 50px 40px; background-color: #ffffff;">
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin: 0 0 15px;">
                Olá <strong style="color: #1a1a2e;">${user.name || 'Cliente'}</strong>,
              </p>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin: 0 0 25px;">
                Recebemos uma solicitação para redefinir a senha da sua conta. Não se preocupe, estamos aqui para ajudar! Clique no botão abaixo para criar uma nova senha segura:
              </p>
              
              <!-- Botão Principal -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 15px 0 30px;">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 16px 45px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                      Redefinir Minha Senha
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Info Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                      <strong>Atenção:</strong> Este link é válido por apenas <strong>1 hora</strong>. Após esse período, será necessário solicitar um novo link.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 25px 0 0; text-align: center;">
                Se você não solicitou esta alteração, pode ignorar este email com segurança. Sua senha permanecerá a mesma.
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 50px;">
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;">
            </td>
          </tr>
          
          <!-- Link Alternativo -->
          <tr>
            <td style="padding: 25px 50px;">
              <p style="color: #a0aec0; font-size: 12px; text-align: center; margin: 0 0 10px;">
                Problemas com o botão? Copie e cole o link abaixo no seu navegador:
              </p>
              <p style="text-align: center; margin: 0;">
                <a href="${resetUrl}" style="color: #667eea; font-size: 12px; word-break: break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 30px 50px; text-align: center;">
              <p style="color: #a0aec0; font-size: 14px; margin: 0 0 10px;">
                Precisa de ajuda? Entre em contato conosco
              </p>
              <p style="margin: 0 0 20px;">
                <a href="${siteUrl}" style="color: #667eea; text-decoration: none; font-size: 14px;">${siteUrl.replace('https://', '').replace('http://', '')}</a>
              </p>
              <p style="color: #4a5568; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${siteName}. Todos os direitos reservados.
              </p>
              <p style="color: #4a5568; font-size: 11px; margin: 10px 0 0;">
                Este é um email automático, por favor não responda.
              </p>
            </td>
          </tr>
          
        </table>
        
        <!-- Segurança Info -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="color: #a0aec0; font-size: 11px; margin: 0;">
                🔒 Este email foi enviado de forma segura por ${siteName}
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
            `,
          })
          
          console.log('Email de recuperação enviado para:', email)
        } else {
          console.log('Configuração de email não encontrada. Token:', token)
        }
      } catch (emailError) {
        console.error('Erro ao enviar email de recuperação:', emailError)
        // Continua mesmo se o email falhar (não revelar ao usuário)
      }
    }

    // Sempre retorna sucesso (não revelar se email existe)
    return NextResponse.json({ 
      success: true,
      message: 'Se o email existir, você receberá um link de recuperação.' 
    })

  } catch (error) {
    console.error('Erro ao processar recuperação de senha:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}
