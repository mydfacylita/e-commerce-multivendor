import cron from 'node-cron';
import { prisma } from './prisma';

interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  date_created: string;
  date_approved: string | null;
  payment_method_id: string;
  external_reference: string;
}

let isRunning = false;

async function getMercadoPagoToken(): Promise<string | null> {
  try {
    const gateway = await prisma.paymentGateway.findFirst({
      where: {
        gateway: 'MERCADOPAGO',
        isActive: true,
      },
    });

    if (!gateway || !gateway.config) {
      console.error('[SYNC-CRON] ❌ Credenciais do Mercado Pago não encontradas');
      return null;
    }

    // CRÍTICO: Prisma retorna config como STRING, precisa fazer parse
    let config = gateway.config
    if (typeof config === 'string') {
      console.log('[SYNC-CRON] ⚠️  Config é STRING, fazendo parse...')
      config = JSON.parse(config)
    }
    
    console.log('[SYNC-CRON] ✅ Token encontrado:', config.accessToken?.substring(0, 20) + '...')
    return config.accessToken || null;
  } catch (error) {
    console.error('[SYNC-CRON] ❌ Erro ao buscar credenciais:', error);
    return null;
  }
}

async function syncPendingPayments() {
  if (isRunning) {
    console.log('[SYNC-CRON] Sincronização anterior ainda em execução, pulando...');
    return;
  }

  isRunning = true;
  console.log('[SYNC-CRON] 🔄 Iniciando sincronização automática de pagamentos...');

  try {
    // Buscar token do Mercado Pago
    const MERCADOPAGO_ACCESS_TOKEN = await getMercadoPagoToken();
    
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      console.error('[SYNC-CRON] ❌ Token do Mercado Pago não disponível');
      return;
    }

    // Buscar TODOS os pedidos PENDING (últimos 2 dias) - com ou sem paymentId
    const pendingOrders: any[] = await prisma.$queryRaw`
      SELECT id, paymentId, buyerEmail, buyerName, total, createdAt
      FROM \`order\`
      WHERE status = 'PENDING' 
      AND createdAt >= DATE_SUB(NOW(), INTERVAL 2 DAY)
      ORDER BY createdAt DESC
      LIMIT 100
    `;

    if (pendingOrders.length === 0) {
      console.log('[SYNC-CRON] ✅ Nenhum pedido pendente para sincronizar');
      return;
    }

    console.log(`[SYNC-CRON] 📋 ${pendingOrders.length} pedidos pendentes encontrados`);

    let updated = 0;
    let duplicates = 0;
    let errors = 0;

    for (const order of pendingOrders) {
      try {
        // Se o pedido já tem paymentId, verificar direto no Mercado Pago
        if (order.paymentId) {
          // IMPORTANTE: Ignorar paymentIds inválidos (não numéricos)
          if (!/^\d+$/.test(order.paymentId)) {
            console.log(`[SYNC-CRON] ⚠️  Ignorando paymentId inválido: ${order.paymentId}`);
            continue;
          }
          
          const checkUrl = `https://api.mercadopago.com/v1/payments/${order.paymentId}`;
          const checkResponse = await fetch(checkUrl, {
            headers: {
              'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
            },
          });

          if (!checkResponse.ok) {
            console.error(`[SYNC-CRON] ❌ Erro ao verificar pagamento ${order.paymentId}: ${checkResponse.status}`);
            errors++;
            continue;
          }

          const payment: MercadoPagoPayment = await checkResponse.json();

          if (payment.status === 'approved') {
            // Atualizar pedido
            await prisma.$executeRaw`
              UPDATE \`order\`
              SET 
                paymentStatus = 'approved',
                paymentApprovedAt = ${new Date(payment.date_approved!)},
                status = 'PROCESSING',
                paymentDetails = ${JSON.stringify(payment)}
              WHERE id = ${order.id}
            `;

            updated++;
            console.log(`[SYNC-CRON] ✅ Pedido ${order.id} APROVADO: ${payment.payment_method_id} - R$ ${payment.transaction_amount}`);
          } else if (payment.status === 'rejected' || payment.status === 'cancelled' || payment.status === 'refunded') {
            // Pagamento rejeitado/cancelado - limpar paymentId para permitir nova tentativa
            await prisma.$executeRaw`
              UPDATE \`order\`
              SET 
                paymentStatus = ${payment.status},
                paymentId = NULL,
                paymentDetails = ${JSON.stringify(payment)}
              WHERE id = ${order.id}
            `;
            console.log(`[SYNC-CRON] ❌ Pedido ${order.id} REJEITADO: ${payment.status} (${payment.status_detail}) - paymentId limpo para nova tentativa`);
          } else {
            console.log(`[SYNC-CRON] ⏳ Pedido ${order.id} ainda ${payment.status} (${payment.status_detail})`);
          }
          
          continue;
        }

        // Se NÃO tem paymentId, buscar pagamentos no Mercado Pago por external_reference
        const searchUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${order.id}`;
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          },
        });

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error(`[SYNC-CRON] ❌ Erro ao buscar pagamento do pedido ${order.id}: ${searchResponse.status} - ${errorText}`);
          errors++;
          continue;
        }

        const searchData = await searchResponse.json();
        const payments: MercadoPagoPayment[] = searchData.results || [];

        if (payments.length === 0) {
          continue; // Sem pagamento ainda
        }

        // Filtrar apenas aprovados
        const approvedPayments = payments.filter(p => p.status === 'approved');

        if (approvedPayments.length === 0) {
          continue; // Nenhum aprovado ainda
        }

        // Detectar duplicatas
        if (approvedPayments.length > 1) {
          duplicates++;
          console.log(`[SYNC-CRON] ⚠️ DUPLICATA: Pedido ${order.id} tem ${approvedPayments.length} pagamentos aprovados`);
        }

        // Pegar o primeiro pagamento (mais antigo)
        const firstPayment = approvedPayments.sort((a, b) => 
          new Date(a.date_approved!).getTime() - new Date(b.date_approved!).getTime()
        )[0];

        // Atualizar pedido
        await prisma.$executeRaw`
          UPDATE \`order\`
          SET 
            paymentId = ${String(firstPayment.id)},
            paymentStatus = 'approved',
            paymentType = ${firstPayment.payment_method_id},
            paymentApprovedAt = ${new Date(firstPayment.date_approved!)},
            status = 'PROCESSING',
            paymentDetails = ${JSON.stringify(firstPayment)}
          WHERE id = ${order.id}
        `;

        updated++;
        console.log(`[SYNC-CRON] ✅ Pedido ${order.id} sincronizado: ${firstPayment.payment_method_id} - R$ ${firstPayment.transaction_amount}`);

      } catch (error) {
        console.error(`[SYNC-CRON] ❌ Erro ao processar pedido ${order.id}:`, error);
        errors++;
      }
    }

    console.log(`[SYNC-CRON] 📊 Resumo: ${updated} atualizados | ${duplicates} duplicatas | ${errors} erros`);

  } catch (error) {
    console.error('[SYNC-CRON] ❌ Erro na sincronização:', error);
  } finally {
    isRunning = false;
  }
}

export function startPaymentSyncCron() {
  // Executar a cada 2 minutos (mais agressivo)
  cron.schedule('*/2 * * * *', async () => {
    await syncPendingPayments();
  });

  console.log('[SYNC-CRON] ✅ Sincronização automática iniciada (a cada 2 minutos)');
  
  // Executar imediatamente na primeira vez
  setTimeout(() => {
    syncPendingPayments();
  }, 5000); // Aguardar 5 segundos após iniciar o servidor
}
