import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { auditLog } from './audit'

// Extrair domínio base para compartilhar cookies entre subdomínios
const getBaseDomain = () => {
  const url = process.env.NEXTAUTH_URL || ''
  try {
    const hostname = new URL(url).hostname
    // Se for localhost, não definir domínio de cookie
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return undefined
    }
    // Extrair domínio base (ex: mydshop.com.br de www.mydshop.com.br ou gerencial-sys.mydshop.com.br)
    const parts = hostname.split('.')
    if (parts.length >= 2) {
      // Pegar os últimos 2 ou 3 segmentos dependendo do TLD
      if (parts.length >= 3 && parts[parts.length - 2].length <= 3) {
        // TLD como .com.br, .co.uk
        return '.' + parts.slice(-3).join('.')
      }
      return '.' + parts.slice(-2).join('.')
    }
    return undefined
  } catch {
    return undefined
  }
}

const baseDomain = getBaseDomain()
const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        const ip = (req as any)?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
          || (req as any)?.headers?.['x-real-ip']
          || 'unknown'
        const userAgent = (req as any)?.headers?.['user-agent'] || 'unknown'

        if (!user || !user.password) {
          // Log tentativa com e-mail inexistente (registra userId vazio)
          await auditLog({
            userId: 'anonymous',
            action: 'LOGIN_FAILED',
            status: 'FAILURE',
            details: { email: credentials.email, reason: 'user_not_found' },
            ipAddress: ip,
            userAgent,
          })
          return null
        }

        // Verificar se o usuário está bloqueado
        if (user.isActive === false) {
          await auditLog({
            userId: user.id,
            action: 'LOGIN_FAILED',
            status: 'FAILURE',
            details: { reason: 'account_blocked' },
            ipAddress: ip,
            userAgent,
          })
          throw new Error('Sua conta foi bloqueada. Entre em contato com o suporte.')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          await auditLog({
            userId: user.id,
            action: 'LOGIN_FAILED',
            status: 'FAILURE',
            details: { reason: 'invalid_password' },
            ipAddress: ip,
            userAgent,
          })
          return null
        }

        // Login bem-sucedido
        await auditLog({
          userId: user.id,
          action: 'LOGIN_SUCCESS',
          status: 'SUCCESS',
          details: { role: user.role },
          ipAddress: ip,
          userAgent,
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          cpf: user.cpf || undefined,
          phone: user.phone || undefined,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.cpf = user.cpf
        token.phone = user.phone
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.cpf = token.cpf as string
        session.user.phone = token.phone as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    // Sessão expira em 8 horas — ISO 27001 A.9.4
    maxAge: 8 * 60 * 60, // 8 horas em segundos
  },
  // Configuração de cookies para compartilhar entre subdomínios
  cookies: baseDomain ? {
    sessionToken: {
      name: useSecureCookies ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: baseDomain,
      },
    },
    callbackUrl: {
      name: useSecureCookies ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: baseDomain,
      },
    },
    csrfToken: {
      name: useSecureCookies ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  } : undefined,
}
