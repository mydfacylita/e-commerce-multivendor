import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getActiveSubscription } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { paymentMethod } = await req.json();

    // Buscar seller e sua assinatura pendente
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id },
      include: {
        user: true,
        subscriptions: true
      }
    });

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    const subscription = await getActiveSubscription(seller.id);
    if (!subscription || subscription.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ 
        error: 'Nenhuma assinatura aguardando pagamento encontrada',
        currentStatus: subscription?.status || 'none'
      }, { status: 404 });
    }

    const amount = subscription.price || subscription.plan.price;

    // Buscar gateway do Mercado Pago
    const gateway = await prisma.paymentGateway.findFirst({
      where: { gateway: 'MERCADOPAGO', isActive: true }
    });

    if (!gateway?.config) {
      return NextResponse.json({ error: 'Gateway de pagamento não configurado' }, { status: 500 });
    }

    let config: any = gateway.config;
    if (typeof config === 'string') {
      config = JSON.parse(config);
    }
    const { accessToken } = config as { accessToken: string };

    // Gerar pagamento de acordo com o método
    if (paymentMethod === 'PIX') {
      // Gerar PIX real no Mercado Pago
      const paymentData = {
        transaction_amount: amount,
        description: `Assinatura ${subscription.plan.name} - MYDSHOP`,
        payment_method_id: 'pix',
        payer: {
          email: seller.user?.email || session.user.email,
          first_name: seller.nomeCompleto?.split(' ')[0] || 'Cliente',
          last_name: seller.nomeCompleto?.split(' ').slice(1).join(' ') || 'MYDSHOP',
          identification: {
            type: seller.cpf ? 'CPF' : 'CNPJ',
            number: (seller.cpf || seller.cnpj || '').replace(/\D/g, '')
          }
        },
        external_reference: subscription.id
      };

      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `pix-sub-${subscription.id}-${Date.now()}`
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Erro ao gerar PIX:', result);
        return NextResponse.json({ 
          error: result.message || 'Erro ao gerar PIX',
          details: result 
        }, { status: 400 });
      }

      const pixCode = result.point_of_interaction?.transaction_data?.qr_code || '';
      const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64 || '';

      return NextResponse.json({
        success: true,
        pixCode,
        qrCodeBase64: qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : null,
        paymentId: result.id,
        amount,
        expiresIn: '30 minutos'
      });
    }

    if (paymentMethod === 'BOLETO') {
      // Gerar Boleto real no Mercado Pago
      const payerName = seller.nomeCompleto || seller.razaoSocial || 'Cliente';
      const nameParts = payerName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'MYDSHOP';

      const paymentData = {
        transaction_amount: amount,
        description: `Assinatura ${subscription.plan.name} - MYDSHOP`,
        payment_method_id: 'bolbradesco',
        payer: {
          email: seller.user?.email || session.user.email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: seller.cpf ? 'CPF' : 'CNPJ',
            number: (seller.cpf || seller.cnpj || '').replace(/\D/g, '')
          },
          address: {
            zip_code: (seller.cep || '01310100').replace(/\D/g, ''),
            street_name: seller.endereco || 'Av Paulista',
            street_number: seller.numero || '1000',
            neighborhood: seller.bairro || 'Centro',
            city: seller.cidade || 'São Paulo',
            federal_unit: seller.estado || 'SP'
          }
        },
        external_reference: subscription.id
      };

      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `boleto-sub-${subscription.id}-${Date.now()}`
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Erro ao gerar boleto:', result);
        return NextResponse.json({ 
          error: result.message || 'Erro ao gerar boleto',
          details: result 
        }, { status: 400 });
      }

      const boletoUrl = result.transaction_details?.external_resource_url || '';

      return NextResponse.json({
        success: true,
        boletoUrl,
        paymentId: result.id,
        amount
      });
    }

    if (paymentMethod === 'CREDIT_CARD') {
      // Criar preferência de checkout do Mercado Pago
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      
      const preferenceData = {
        items: [{
          title: `Assinatura ${subscription.plan.name}`,
          description: subscription.plan.description || `Plano ${subscription.plan.name} - MYDSHOP`,
          quantity: 1,
          unit_price: amount,
          currency_id: 'BRL'
        }],
        payer: {
          email: seller.user?.email || session.user.email,
          name: seller.nomeCompleto || seller.razaoSocial || 'Cliente',
          identification: {
            type: seller.cpf ? 'CPF' : 'CNPJ',
            number: (seller.cpf || seller.cnpj || '').replace(/\D/g, '')
          }
        },
        external_reference: subscription.id,
        back_urls: {
          success: `${baseUrl}/vendedor/planos/sucesso`,
          failure: `${baseUrl}/vendedor/planos/pagamento`,
          pending: `${baseUrl}/vendedor/planos/pagamento`
        },
        auto_return: 'approved',
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' },  // Excluir boleto (já temos opção separada)
            { id: 'atm' }      // Excluir caixa eletrônico
          ],
          installments: 12  // Máximo de parcelas
        }
      };

      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferenceData)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Erro ao criar preferência:', result);
        return NextResponse.json({ 
          error: result.message || 'Erro ao criar checkout',
          details: result 
        }, { status: 400 });
      }

      // Usar sandbox_init_point em desenvolvimento, init_point em produção
      const isProd = process.env.NODE_ENV === 'production';
      const checkoutUrl = isProd ? result.init_point : result.sandbox_init_point;

      return NextResponse.json({
        success: true,
        checkoutUrl,
        preferenceId: result.id,
        amount
      });
    }

    return NextResponse.json({ error: 'Método de pagamento inválido' }, { status: 400 });

  } catch (error) {
    console.error('Erro ao gerar pagamento:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
