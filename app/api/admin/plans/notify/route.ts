import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { planId, subject, message, targetAudience, includeChanges } = await req.json()

    // Buscar o plano
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    })

    if (!plan) {
      return NextResponse.json(
        { message: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    // Determinar vendedores a notificar baseado no público-alvo
    let sellers: any[] = []

    switch (targetAudience) {
      case 'plan_subscribers':
        // Apenas assinantes deste plano específico
        sellers = await prisma.seller.findMany({
          where: {
            subscriptions: {
              some: {
                planId: planId,
                status: { in: ['TRIAL', 'ACTIVE'] }
              }
            }
          },
          include: {
            user: {
              select: { email: true, name: true }
            },
            subscriptions: {
              where: { status: { in: ['ACTIVE', 'TRIAL'] } },
              include: { plan: true },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        })
        break

      case 'all_sellers':
        // Todos os vendedores
        sellers = await prisma.seller.findMany({
          include: {
            user: {
              select: { email: true, name: true }
            },
            subscriptions: {
              where: { status: { in: ['ACTIVE', 'TRIAL'] } },
              include: { plan: true },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        })
        break

      case 'active_only':
        // Apenas vendedores com assinaturas ativas
        sellers = await prisma.seller.findMany({
          where: {
            subscriptions: {
              some: { status: 'ACTIVE' }
            }
          },
          include: {
            user: {
              select: { email: true, name: true }
            },
            subscriptions: {
              where: { status: { in: ['ACTIVE', 'TRIAL'] } },
              include: { plan: true },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        })
        break
    }

    // Montar mensagem final
    let finalMessage = message

    if (includeChanges) {
      finalMessage += `

📋 DETALHES DO PLANO ATUAL:
• Nome: ${plan.name}
• Preço: R$ ${plan.price.toFixed(2)} (${getBillingCycleText(plan.billingCycle)})
• Comissão da Plataforma: ${plan.platformCommission}%
• Limites: 
  - Produtos: ${plan.maxProducts || '∞'}
  - Pedidos/mês: ${plan.maxOrders || '∞'}
  - Receita/mês: ${plan.maxRevenue ? `R$ ${plan.maxRevenue.toLocaleString()}` : '∞'}

🎯 RECURSOS INCLUSOS:
${plan.hasMarketplaceIntegration ? '✅ Integração com Marketplaces' : '❌ Integração com Marketplaces'}
${plan.hasDropshipping ? '✅ Dropshipping' : '❌ Dropshipping'}
${plan.hasAdvancedAnalytics ? '✅ Relatórios Avançados' : '❌ Relatórios Avançados'}
${plan.hasCustomBranding ? '✅ Marca Personalizada' : '❌ Marca Personalizada'}
${plan.hasPrioritySupport ? '✅ Suporte Prioritário' : '❌ Suporte Prioritário'}

${plan.hasFreeTrial ? `🆓 Trial gratuito de ${plan.trialDays} dias disponível para novos usuários.` : ''}

Para mais detalhes ou dúvidas, acesse seu painel de vendedor ou entre em contato conosco.
`
    }

    // Simular envio de emails (aqui você integraria com um serviço real como SendGrid, etc.)
    console.log('📧 Enviando notificação para vendedores:')
    console.log(`📋 Assunto: ${subject}`)
    console.log(`👥 Total de destinatários: ${sellers.length}`)
    console.log(`🎯 Público-alvo: ${targetAudience}`)
    console.log(`📝 Mensagem:\n${finalMessage}`)

    // Log de cada envio
    const notifications = sellers.map(seller => ({
      sellerId: seller.id,
      sellerName: seller.user.name,
      sellerEmail: seller.user.email,
      planName: seller.subscriptions?.[0]?.plan?.name || 'Sem plano',
      subject,
      message: finalMessage,
      sentAt: new Date()
    }))

    console.log('📬 Detalhes dos envios:', notifications)

    // Aqui você implementaria o envio real dos emails
    // Exemplo com SendGrid, Nodemailer, etc.
    
    /*
    for (const notification of notifications) {
      await sendEmail({
        to: notification.sellerEmail,
        subject: notification.subject,
        html: formatEmailTemplate(notification.message, notification.sellerName)
      })
    }
    */

    return NextResponse.json({
      message: 'Notificações enviadas com sucesso!',
      totalSent: sellers.length,
      details: {
        planName: plan.name,
        targetAudience,
        recipients: notifications.map(n => ({ name: n.sellerName, email: n.sellerEmail }))
      }
    })

  } catch (error) {
    console.error('Erro ao enviar notificações:', error)
    return NextResponse.json(
      { message: 'Erro ao enviar notificações' },
      { status: 500 }
    )
  }
}

function getBillingCycleText(cycle: string) {
  const cycles = {
    'MONTHLY': 'Mensal',
    'QUARTERLY': 'Trimestral',
    'SEMIANNUAL': 'Semestral',
    'ANNUAL': 'Anual'
  }
  return cycles[cycle as keyof typeof cycles] || cycle
}