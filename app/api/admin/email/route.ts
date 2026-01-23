import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Imap from 'imap'
import { simpleParser } from 'mailparser'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface EmailMessage {
  id: string
  from: string
  fromName: string
  to: string
  subject: string
  body: string
  html?: string
  date: string
  read: boolean
  starred: boolean
  folder: string
  attachments: any[]
}

/**
 * Busca emails via IMAP
 */
async function fetchImapEmails(config: {
  host: string
  port: number
  user: string
  password: string
  tls: boolean
}, folder: string = 'INBOX', limit: number = 50): Promise<EmailMessage[]> {
  return new Promise((resolve, reject) => {
    const emails: EmailMessage[] = []
    
    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: { rejectUnauthorized: false }
    })

    imap.once('ready', () => {
      // Mapear nome da pasta
      const folderMap: Record<string, string> = {
        'inbox': 'INBOX',
        'sent': 'Sent',
        'drafts': 'Drafts',
        'trash': 'Trash',
        'spam': 'Spam'
      }
      const imapFolder = folderMap[folder] || 'INBOX'

      imap.openBox(imapFolder, true, (err, box) => {
        if (err) {
          imap.end()
          reject(err)
          return
        }

        if (!box.messages.total) {
          imap.end()
          resolve([])
          return
        }

        // Buscar últimos N emails
        const start = Math.max(1, box.messages.total - limit + 1)
        const end = box.messages.total
        const totalToFetch = end - start + 1
        
        const f = imap.seq.fetch(`${start}:${end}`, {
          bodies: '',
          struct: true
        })

        const parsePromises: Promise<void>[] = []

        f.on('message', (msg, seqno) => {
          let buffer = ''
          const uid = seqno.toString()
          let msgAttrs: any = null

          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8')
            })
          })

          msg.once('attributes', (attrs) => {
            msgAttrs = attrs
          })

          msg.once('end', () => {
            // Criar promise para processar o email
            const parsePromise = (async () => {
              try {
                const parsed = await simpleParser(buffer)
                const flags = msgAttrs?.flags || []
                const isRead = flags.includes('\\Seen')
                const isStarred = flags.includes('\\Flagged')
                
                emails.push({
                  id: msgAttrs?.uid?.toString() || uid,
                  from: parsed.from?.text || '',
                  fromName: parsed.from?.value?.[0]?.name || parsed.from?.text || '',
                  to: parsed.to?.text || '',
                  subject: parsed.subject || '(Sem assunto)',
                  body: parsed.text || '',
                  html: parsed.html || undefined,
                  date: parsed.date?.toISOString() || new Date().toISOString(),
                  read: isRead,
                  starred: isStarred,
                  folder: folder,
                  attachments: parsed.attachments?.map(att => ({
                    name: att.filename || 'arquivo',
                    size: att.size || 0,
                    type: att.contentType || 'application/octet-stream',
                    url: att.content ? `data:${att.contentType};base64,${att.content.toString('base64')}` : undefined
                  })) || []
                })
              } catch (parseErr) {
                console.error('Erro ao parsear email:', parseErr)
              }
            })()
            parsePromises.push(parsePromise)
          })
        })

        f.once('error', (fetchErr) => {
          console.error('Erro ao buscar emails:', fetchErr)
          imap.end()
          reject(fetchErr)
        })

        f.once('end', async () => {
          // Aguardar todas as promises de parse terminarem
          await Promise.all(parsePromises)
          imap.end()
          // Ordenar por data (mais recente primeiro)
          emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          resolve(emails)
        })
      })
    })

    imap.once('error', (err: Error) => {
      console.error('Erro IMAP:', err)
      reject(err)
    })

    imap.connect()
  })
}

/**
 * GET /api/admin/email
 * Busca emails via IMAP
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

    // Verificar se tem configuração IMAP
    const imapHost = configMap['imapHost'] || configMap['smtpHost']
    const imapPort = parseInt(configMap['imapPort'] || '993')
    const imapUser = configMap['imapUser'] || configMap['smtpUser']
    const imapPassword = configMap['imapPassword'] || configMap['smtpPassword']

    if (!imapHost || !imapUser || !imapPassword) {
      return NextResponse.json({ 
        emails: [],
        message: 'Configure o servidor de email (IMAP) em Configurações > E-mail' 
      })
    }

    try {
      const emails = await fetchImapEmails({
        host: imapHost,
        port: imapPort,
        user: imapUser,
        password: imapPassword,
        tls: imapPort === 993
      }, folder)

      // Mapear campos para o formato esperado pelo frontend
      const mappedEmails = emails.map(email => ({
        ...email,
        bodyHtml: email.html || null, // Frontend espera bodyHtml
      }))

      return NextResponse.json({ emails: mappedEmails })
    } catch (imapError: any) {
      console.error('Erro IMAP:', imapError)
      return NextResponse.json({ 
        emails: [],
        error: `Erro ao conectar: ${imapError.message}` 
      })
    }
  } catch (error) {
    console.error('Erro ao buscar emails:', error)
    return NextResponse.json({ 
      emails: [],
      error: 'Erro ao conectar com servidor de email' 
    })
  }
}
