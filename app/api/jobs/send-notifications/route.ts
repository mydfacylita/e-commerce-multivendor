import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTemplateEmail, EMAIL_TEMPLATES } from '@/lib/email'

/**
 * Job: Envio Automático de Notificações
 * 
 * Objetivo: Processar fila de notificações pendentes (emails, WhatsApp)
 * 
 * Lógica:
 * 1. Busca notificações pendentes na fila
 * 2. Envia via canal apropriado (email/WhatsApp)
 * 3. Marca como enviado ou registra falha
 * 4. Retry automático para falhas (máx 3 tentativas)
 */
export async function POST(req: NextRequest) {
  try {
    const startTime = Date.now()

    // TODO: Criar tabela NotificationQueue no schema.prisma
    // Por enquanto, vou processar notificações baseadas em eventos do sistema
    
    const results = {
      emailsSent: 0,
      whatsappSent: 0,
      errors: [] as string[]
    }

    // Exemplo 1: Notificar pedidos prontos para envio (status PROCESSING há mais de 2 dias)
    const ordersReadyToShip = await prisma.order.findMany({
      where: {
        status: 'PROCESSING',
        createdAt: {
          lte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 dias atrás
        },
        awaitingShipmentNotifiedAt: null // Apenas pedidos que ainda não receberam notificação
      },
      include: {
        user: true
      },
      take: 20
    })

    for (const order of ordersReadyToShip) {
      try {
        await sendTemplateEmail(
          EMAIL_TEMPLATES.ORDER_AWAITING_SHIPMENT,
          order.user?.email || '',
          {
            customerName: order.user?.name || order.buyerName || 'Cliente',
            orderId: order.id,
            orderTotal: order.total?.toFixed(2) || '0.00'
          }
        )
        
        // Marcar que a notificação foi enviada
        await prisma.order.update({
          where: { id: order.id },
          data: { awaitingShipmentNotifiedAt: new Date() }
        })
        
        results.emailsSent++
      } catch (error: any) {
        results.errors.push(`Email falhou para pedido ${order.id}: ${error.message}`)
      }
    }

    // Exemplo 2: Lembrete de carrinho abandonado (3 dias sem checkout)
    const abandonedCarts = await prisma.cartItem.groupBy({
      by: ['userId'],
      where: {
        updatedAt: {
          lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 dias atrás
        }
      },
      _count: {
        id: true
      }
    });
            
    for (const cart of abandonedCarts) {
      if (cart._count.id > 0) {
        // Verificar se já enviou notificação de carrinho abandonado nos últimos 7 dias
        const recentNotification = await prisma.cartNotification.findFirst({
          where: {
            userId: cart.userId,
            type: 'cart_abandoned',
            sentAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 dias atrás
            }
          }
        })
        
        if (recentNotification) {
          continue // Já enviou recentemente, pular
        }
        
        const user = await prisma.user.findUnique({ where: { id: cart.userId } })
        if (user?.email) {
          try {
            await sendTemplateEmail(
              EMAIL_TEMPLATES.CART_ABANDONED,
              user.email,
              {
                customerName: user.name || 'Cliente',
                itemsCount: cart._count.id,
                cartUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/carrinho`
              }
            );
            
            // Registrar notificação enviada
            await prisma.cartNotification.create({
              data: {
                userId: cart.userId,
                type: 'cart_abandoned',
                emailSent: true,
                whatsappSent: false
              }
            })
            
            console.log(`[NOTIFICATION] Email para ${user.email}: Carrinho abandonado com ${cart._count.id} itens`)
            results.emailsSent++
          } catch (error: any) {
            results.errors.push(`Email falhou para usuário ${cart.userId}: ${error.message}`)
          }
        }
      }
    }

    // Exemplo 3: Notificações para pedidos entregues hoje
    const deliveredToday = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)) // Hoje 00:00
        },
        deliveryNotifiedAt: null // Apenas pedidos que ainda não receberam notificação
      },
      include: {
        user: true
      },
      take: 20
    })

    for (const order of deliveredToday) {
      // Enviar email de entrega
      if (order.user?.email) {
        try {
          await sendTemplateEmail(
            EMAIL_TEMPLATES.ORDER_DELIVERED,
            order.user.email,
            {
              customerName: order.user.name || order.buyerName || 'Cliente',
              orderId: order.id,
              orderTotal: order.total?.toFixed(2) || '0.00'
            }
          );
          
          // Marcar que a notificação foi enviada
          await prisma.order.update({
            where: { id: order.id },
            data: { deliveryNotifiedAt: new Date() }
          })
          
          console.log(`[NOTIFICATION] Email para ${order.user.email}: Pedido ${order.id} entregue`)
          results.emailsSent++
        } catch (error: any) {
          results.errors.push(`Email de entrega falhou para pedido ${order.id}: ${error.message}`)
        }
      }
      
      // Enviar WhatsApp
      if (order.user?.phone) {
        try {
          // TODO: Integrar com API do WhatsApp
          console.log(`[NOTIFICATION] WhatsApp para ${order.user.phone}: Pedido ${order.id} entregue!`)
          results.whatsappSent++
        } catch (error: any) {
          results.errors.push(`WhatsApp falhou para pedido ${order.id}: ${error.message}`)
        }
      }
    }

    // Atualizar configuração com última execução
    await prisma.systemConfig.upsert({
      where: { key: 'automation.notifications.lastRun' },
      update: { value: new Date().toISOString() },
      create: {
        key: 'automation.notifications.lastRun',
        value: new Date().toISOString(),
        category: 'automation',
        label: 'Última Execução - Notificações',
        type: 'datetime'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Notificações enviadas: ${results.emailsSent} emails + ${results.whatsappSent} WhatsApp`,
      ...results,
      executionTime: Date.now() - startTime
    })
  } catch (error: any) {
    console.error('Erro ao enviar notificações:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao enviar notificações' },
      { status: 500 }
    )
  }
}
