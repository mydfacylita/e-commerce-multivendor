import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

async function getMercadoPagoToken(): Promise<string | null> {
  try {
    const gateway = await prisma.paymentGateway.findFirst({
      where: {
        gateway: 'MERCADOPAGO',
        isActive: true,
      },
    });

    if (!gateway || !gateway.config) {
      return null;
    }

    const config = gateway.config as any;
    return config.accessToken || null;
  } catch (error) {
    console.error('[SYNC] Erro ao buscar credenciais:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Buscar token do Mercado Pago
    const MERCADOPAGO_ACCESS_TOKEN = await getMercadoPagoToken();
    
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Credenciais do Mercado Pago não configuradas' },
        { status: 400 }
      );
    }

    // Buscar todos os pedidos PENDING sem paymentId (usando raw query)
    const pendingOrders: any[] = await prisma.$queryRaw`
      SELECT id, buyerEmail, buyerName, total, createdAt
      FROM \`order\`
      WHERE status = 'PENDING' 
      AND (paymentId IS NULL OR paymentId = '')
      ORDER BY createdAt DESC
    `;

    console.log(`[SYNC] Encontrados ${pendingOrders.length} pedidos PENDING sem paymentId`);

    const results = {
      total: pendingOrders.length,
      updated: 0,
      duplicates: 0,
      errors: 0,
      details: [] as any[],
    };

    // Para cada pedido, buscar pagamentos no Mercado Pago
    for (const order of pendingOrders) {
      try {
        console.log(`[SYNC] Verificando pedido ${order.id}...`);

        // Buscar pagamentos por external_reference
        const searchUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${order.id}`;
        const searchResponse = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          },
        });

        if (!searchResponse.ok) {
          console.error(`[SYNC] Erro ao buscar pagamentos do pedido ${order.id}`);
          results.errors++;
          results.details.push({
            orderId: order.id,
            status: 'error',
            message: 'Erro ao consultar Mercado Pago',
          });
          continue;
        }

        const searchData = await searchResponse.json();
        const payments: MercadoPagoPayment[] = searchData.results || [];

        console.log(`[SYNC] Pedido ${order.id}: ${payments.length} pagamento(s) encontrado(s)`);

        if (payments.length === 0) {
          results.details.push({
            orderId: order.id,
            status: 'no_payment',
            message: 'Nenhum pagamento encontrado',
          });
          continue;
        }

        // Filtrar apenas pagamentos aprovados
        const approvedPayments = payments.filter(p => p.status === 'approved');

        if (approvedPayments.length === 0) {
          results.details.push({
            orderId: order.id,
            status: 'not_approved',
            message: `${payments.length} pagamento(s) encontrado(s), mas nenhum aprovado`,
            payments: payments.map(p => ({
              id: p.id,
              status: p.status,
              amount: p.transaction_amount,
            })),
          });
          continue;
        }

        // Se tem mais de 1 pagamento aprovado = DUPLICATA
        const isDuplicate = approvedPayments.length > 1;
        if (isDuplicate) {
          results.duplicates++;
          console.log(`[SYNC] ⚠️ DUPLICATA DETECTADA no pedido ${order.id}: ${approvedPayments.length} pagamentos aprovados`);
        }

        // Pegar o primeiro pagamento aprovado (mais antigo)
        const firstPayment = approvedPayments.sort((a, b) => 
          new Date(a.date_approved!).getTime() - new Date(b.date_approved!).getTime()
        )[0];

        // Atualizar o pedido com o paymentId e status PROCESSING (usando raw query)
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

        results.updated++;
        results.details.push({
          orderId: order.id,
          status: 'updated',
          paymentId: firstPayment.id,
          amount: firstPayment.transaction_amount,
          isDuplicate,
          totalPayments: approvedPayments.length,
          message: isDuplicate 
            ? `✅ Atualizado com ${approvedPayments.length} pagamentos (DUPLICATA DETECTADA)`
            : '✅ Atualizado com sucesso',
          payments: approvedPayments.map(p => ({
            id: p.id,
            amount: p.transaction_amount,
            date_approved: p.date_approved,
          })),
        });

        console.log(`[SYNC] ✅ Pedido ${order.id} atualizado: paymentId=${firstPayment.id}, status=PROCESSING`);

      } catch (error) {
        console.error(`[SYNC] Erro ao processar pedido ${order.id}:`, error);
        results.errors++;
        results.details.push({
          orderId: order.id,
          status: 'error',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    console.log(`[SYNC] Finalizado: ${results.updated} atualizados, ${results.duplicates} duplicatas, ${results.errors} erros`);

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída: ${results.updated} pedidos atualizados`,
      ...results,
    });

  } catch (error) {
    console.error('[SYNC] Erro geral:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao sincronizar pagamentos',
      },
      { status: 500 }
    );
  }
}
