/**
 * Script para processar reembolsos pendentes manualmente
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function processPendingRefunds() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 PROCESSANDO REEMBOLSOS PENDENTES')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Buscar token do Mercado Pago
  const gateway = await prisma.paymentGateway.findFirst({
    where: { gateway: 'MERCADOPAGO', isActive: true }
  })

  if (!gateway?.config) {
    console.error('❌ Gateway Mercado Pago não configurado')
    return
  }

  let config = gateway.config
  if (typeof config === 'string') {
    config = JSON.parse(config)
  }

  const accessToken = config.accessToken
  if (!accessToken) {
    console.error('❌ Token do Mercado Pago não encontrado')
    return
  }

  console.log('✅ Token encontrado')

  // Buscar reembolsos pendentes
  const pendingRefunds = await prisma.refund.findMany({
    where: { status: 'PENDING' },
    include: {
      order: {
        select: { id: true, paymentId: true, paymentStatus: true, buyerName: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  console.log(`\n📋 Encontrados ${pendingRefunds.length} reembolsos pendentes\n`)

  for (const refund of pendingRefunds) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📦 Refund: ${refund.id}`)
    console.log(`👤 Cliente: ${refund.order?.buyerName || 'N/A'}`)
    console.log(`💰 Valor: R$ ${refund.amount.toFixed(2)}`)
    console.log(`🆔 PaymentId: ${refund.paymentId}`)
    console.log(`📝 Motivo: ${refund.reason}`)

    // Verificar se paymentId é válido
    if (!refund.paymentId || !/^\d+$/.test(refund.paymentId)) {
      console.log('❌ PaymentId inválido - marcando como FAILED')
      await prisma.refund.update({
        where: { id: refund.id },
        data: { 
          status: 'FAILED',
          reason: (refund.reason || '') + ' | PaymentId inválido'
        }
      })
      continue
    }

    try {
      console.log('\n🔄 Tentando processar reembolso...')
      
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${refund.paymentId}/refunds`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': `refund-manual-${refund.id}-${Date.now()}`
          },
          body: JSON.stringify({
            amount: refund.amount
          })
        }
      )

      const data = await response.json()
      console.log('📡 Resposta da API:', JSON.stringify(data, null, 2))

      if (response.ok) {
        console.log(`✅ SUCESSO! Refund ID: ${data.id}`)
        
        await prisma.refund.update({
          where: { id: refund.id },
          data: { 
            status: 'APPROVED',
            refundId: String(data.id)
          }
        })

        await prisma.order.update({
          where: { id: refund.orderId },
          data: { paymentStatus: 'refunded' }
        })
      } else {
        const errorMsg = data.message || data.error || JSON.stringify(data)
        console.log(`❌ ERRO: ${errorMsg}`)

        // Verificar se já foi reembolsado
        if (errorMsg.includes('already') || errorMsg.includes('refunded')) {
          console.log('ℹ️ Pagamento já estava reembolsado - atualizando status')
          await prisma.refund.update({
            where: { id: refund.id },
            data: { 
              status: 'APPROVED',
              reason: (refund.reason || '') + ' | Já reembolsado'
            }
          })
        } else if (response.status === 400 || response.status === 404) {
          // Erro permanente
          await prisma.refund.update({
            where: { id: refund.id },
            data: { 
              status: 'FAILED',
              reason: (refund.reason || '') + ` | Erro: ${errorMsg}`
            }
          })
        }
      }
    } catch (error) {
      console.error('❌ Erro de conexão:', error.message)
    }

    // Aguardar entre requisições
    await new Promise(r => setTimeout(r, 1000))
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ PROCESSAMENTO CONCLUÍDO')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

processPendingRefunds()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
