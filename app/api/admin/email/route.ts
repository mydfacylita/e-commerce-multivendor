import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/email
 * Busca emails - Por enquanto retorna mock data
 * Para funcionar com IMAP real, instale: npm install imap mailparser @types/imap
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder') || 'inbox'

    // Buscar configurações de email
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'email.' } }
    })

    const configMap: Record<string, string> = {}
    configs.forEach((c: { key: string; value: string }) => {
      configMap[c.key.replace('email.', '')] = c.value
    })

    // TODO: Implementar busca IMAP real
    // Por enquanto, retorna instruções para o usuário
    if (!configMap['smtpHost'] || !configMap['smtpUser']) {
      return NextResponse.json({ 
        emails: [],
        message: 'Configure o servidor de email em Configurações > E-mail' 
      })
    }

    // Mock emails para demonstração
    // Em produção, conectar via IMAP
    const mockEmails = folder === 'inbox' ? [
      {
        id: '1',
        from: configMap['smtpUser'],
        fromName: 'Teste',
        to: configMap['smtpUser'],
        subject: '📧 Servidor de E-mail Configurado!',
        body: `Parabéns! Seu servidor de e-mail está configurado.\n\nHost: ${configMap['smtpHost']}\nUsuário: ${configMap['smtpUser']}\n\nPara receber e-mails reais via IMAP, execute:\nnpm install imap mailparser @types/imap\n\nE reinicie o servidor.`,
        date: new Date().toISOString(),
        read: false,
        starred: false,
        folder: 'inbox',
        attachments: []
      }
    ] : []

    return NextResponse.json({ emails: mockEmails })
  } catch (error) {
    console.error('Erro ao buscar emails:', error)
    return NextResponse.json({ 
      emails: [],
      error: 'Erro ao conectar com servidor de email' 
    })
  }
}
