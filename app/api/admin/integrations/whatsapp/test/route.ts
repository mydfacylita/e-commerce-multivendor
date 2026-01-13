import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WhatsAppService } from '@/lib/whatsapp'

/**
 * POST /api/admin/integrations/whatsapp/test
 * Envia mensagem de teste via WhatsApp
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

    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
    }

    // Mensagem de teste
    const testMessage = `🧪 *Mensagem de Teste*

Sua integração com WhatsApp Business está funcionando!

_Enviado em ${new Date().toLocaleString('pt-BR')}_`

    // Enviar mensagem de teste
    const result = await WhatsAppService.sendMessage({
      to: phone,
      message: testMessage
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    console.error('Erro ao enviar teste WhatsApp:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
