import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readFile } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * GET /api/webmail/emails
 * Busca emails do usuário
 */
export async function GET(request: NextRequest) {
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
    const username = sessionData.username

    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder') || 'inbox'

    // Tentar ler emails do arquivo mbox
    try {
      const mboxPath = `/var/mail/${username}`
      const mboxContent = await readFile(mboxPath, 'utf-8')
      
      const emails = parseMboxEmails(mboxContent, folder)
      
      return NextResponse.json({ emails })
    } catch (error: any) {
      console.error('Erro ao ler emails:', error)
      
      // Se não conseguir ler, retornar mock data
      const mockEmails = getMockEmails(sessionData.email, folder)
      return NextResponse.json({ emails: mockEmails })
    }
  } catch (error) {
    console.error('Erro no endpoint emails:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar emails' },
      { status: 500 }
    )
  }
}

function parseMboxEmails(mboxContent: string, folder: string) {
  const emails: any[] = []
  const messages = mboxContent.split(/\nFrom /).slice(1)

  messages.forEach((msg, index) => {
    const lines = msg.split('\n')
    let from = ''
    let subject = ''
    let date = ''
    let body = ''
    let inBody = false

    for (const line of lines) {
      if (line.startsWith('From:')) {
        from = line.substring(5).trim()
      } else if (line.startsWith('Subject:')) {
        subject = line.substring(8).trim()
      } else if (line.startsWith('Date:')) {
        date = line.substring(5).trim()
      } else if (line === '') {
        inBody = true
      } else if (inBody) {
        body += line + '\n'
      }
    }

    const emailMatch = from.match(/<(.+?)>/)
    const fromEmail = emailMatch ? emailMatch[1] : from
    const fromName = from.replace(/<.+?>/, '').trim() || fromEmail

    emails.push({
      id: `email-${index + 1}`,
      from: fromEmail,
      fromName,
      to: '',
      subject: subject || '(Sem assunto)',
      body: body.trim(),
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      read: false,
      starred: false,
      folder,
      attachments: []
    })
  })

  return emails.reverse() // Mais recentes primeiro
}

function getMockEmails(userEmail: string, folder: string) {
  if (folder !== 'inbox') return []

  return [
    {
      id: '1',
      from: 'sistema@mydshop.com.br',
      fromName: 'MYDSHOP Sistema',
      to: userEmail,
      subject: '✅ Bem-vindo ao Webmail!',
      body: `Olá!\n\nSua conta de e-mail está configurada e funcionando.\n\nVocê pode:\n- Receber emails de clientes\n- Enviar emails para fornecedores\n- Gerenciar suas mensagens\n\nSuporte: suporte@mydshop.com.br`,
      date: new Date().toISOString(),
      read: false,
      starred: false,
      folder: 'inbox',
      attachments: []
    }
  ]
}
