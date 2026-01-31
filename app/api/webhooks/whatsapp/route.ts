import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Token de verificação - deve ser o mesmo configurado no Meta
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'MYDSHOP_WHATSAPP_VERIFY_2026';

/**
 * GET - Verificação do Webhook pelo Meta (Facebook)
 * O Meta envia uma requisição GET para verificar se o endpoint está funcionando
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parâmetros enviados pelo Meta para verificação
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('🔔 WhatsApp Webhook Verification:', { mode, token, challenge });

    // Verifica se é uma requisição de verificação válida
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WhatsApp Webhook verificado com sucesso!');
      // Retorna o challenge para confirmar a verificação
      return new NextResponse(challenge, { status: 200 });
    }

    console.log('❌ WhatsApp Webhook verificação falhou - token inválido');
    return NextResponse.json({ error: 'Verificação falhou' }, { status: 403 });
  } catch (error) {
    console.error('Erro na verificação do webhook WhatsApp:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * POST - Receber mensagens e eventos do WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📩 WhatsApp Webhook recebido:', JSON.stringify(body, null, 2));

    // Verificar se é uma mensagem válida
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];
      
      for (const entry of entries) {
        const changes = entry.changes || [];
        
        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value;
            const messages = value.messages || [];
            const contacts = value.contacts || [];
            const statuses = value.statuses || [];
            
            // Processar mensagens recebidas
            for (const message of messages) {
              await processIncomingMessage(message, contacts, value.metadata);
            }
            
            // Processar status de mensagens (entregue, lida, etc)
            for (const status of statuses) {
              await processMessageStatus(status);
            }
          }
        }
      }
    }

    // Sempre retornar 200 OK para o Meta
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Erro ao processar webhook WhatsApp:', error);
    // Mesmo em caso de erro, retornar 200 para evitar reenvios do Meta
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

/**
 * Processa uma mensagem recebida
 */
async function processIncomingMessage(message: any, contacts: any[], metadata: any) {
  try {
    const from = message.from; // Número do remetente
    const messageId = message.id;
    const timestamp = message.timestamp;
    const type = message.type; // text, image, audio, document, etc
    
    // Encontrar informações do contato
    const contact = contacts.find((c: any) => c.wa_id === from);
    const contactName = contact?.profile?.name || 'Desconhecido';
    
    console.log(`📱 Mensagem de ${contactName} (${from}):`, message);

    // Conteúdo da mensagem baseado no tipo
    let content = '';
    if (type === 'text') {
      content = message.text?.body || '';
    } else if (type === 'image') {
      content = '[Imagem]';
    } else if (type === 'audio') {
      content = '[Áudio]';
    } else if (type === 'document') {
      content = `[Documento: ${message.document?.filename || 'arquivo'}]`;
    } else if (type === 'location') {
      content = `[Localização: ${message.location?.latitude}, ${message.location?.longitude}]`;
    } else if (type === 'button') {
      content = message.button?.text || '[Botão]';
    } else if (type === 'interactive') {
      content = message.interactive?.button_reply?.title || 
                message.interactive?.list_reply?.title || 
                '[Interativo]';
    }

    // Aqui você pode:
    // 1. Salvar a mensagem no banco de dados
    // 2. Notificar o vendedor/admin
    // 3. Processar comandos automatizados
    // 4. Responder automaticamente

    // Exemplo: Verificar se é uma consulta de pedido
    if (content.toLowerCase().includes('pedido') || content.toLowerCase().includes('rastrear')) {
      // TODO: Implementar resposta automática de rastreamento
      console.log('🔍 Consulta de pedido detectada');
    }

  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
}

/**
 * Processa status de mensagem (enviada, entregue, lida)
 */
async function processMessageStatus(status: any) {
  try {
    const messageId = status.id;
    const statusType = status.status; // sent, delivered, read, failed
    const recipientId = status.recipient_id;
    const timestamp = status.timestamp;

    console.log(`📊 Status da mensagem ${messageId}: ${statusType}`);

    // Aqui você pode atualizar o status da mensagem no banco de dados
    // Exemplo:
    // await prisma.whatsappMessage.update({
    //   where: { messageId },
    //   data: { status: statusType }
    // });

    if (statusType === 'failed') {
      const errors = status.errors || [];
      console.error('❌ Falha no envio:', errors);
    }

  } catch (error) {
    console.error('Erro ao processar status:', error);
  }
}
