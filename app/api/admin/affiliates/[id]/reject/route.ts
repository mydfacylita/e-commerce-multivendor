import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendTemplateEmail, EMAIL_TEMPLATES } from '@/lib/email'
import { WhatsAppService } from '@/lib/whatsapp'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const affiliateId = params.id
    const body = await request.json()
    const { reason } = body

    // Rejeitar afiliado
    const affiliate = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        status: 'REJECTED',
        isActive: false,
        notes: reason || 'Rejeitado pelo administrador'
      }
    })

    // Enviar e-mail de rejeição
    try {
      await sendTemplateEmail(EMAIL_TEMPLATES.AFFILIATE_REJECTED, affiliate.email, {
        affiliateName: affiliate.name,
        reason: reason || ''
      })
    } catch (emailErr) {
      console.error('[Affiliate Reject] Erro ao enviar e-mail:', emailErr)
    }

    // Enviar WhatsApp de rejeição (se tiver telefone)
    if (affiliate.phone) {
      try {
        await WhatsAppService.sendAffiliateRejected(affiliate.phone, {
          affiliateName: affiliate.name,
          reason: reason || undefined
        })
      } catch (waErr) {
        console.error('[Affiliate Reject] Erro ao enviar WhatsApp:', waErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Afiliado rejeitado',
      affiliate
    })

  } catch (error) {
    console.error('Erro ao rejeitar afiliado:', error)
    return NextResponse.json(
      { error: 'Erro ao rejeitar afiliado' },
      { status: 500 }
    )
  }
}
