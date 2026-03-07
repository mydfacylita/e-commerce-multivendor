import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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
    const from = message.from; // Número do remetente (ex: 5598991269315)
    const messageId = message.id;
    const type = message.type; // text, image, audio, document, etc

    // Encontrar informações do contato
    const contact = contacts.find((c: any) => c.wa_id === from);
    const contactName = contact?.profile?.name || 'Cliente';

    console.log(`📱 Mensagem recebida de ${contactName} (${from}):`, type);

    // Conteúdo da mensagem baseado no tipo
    let content = '';
    // Dados de mídia (para download posterior)
    let attachmentsJson: string | undefined = undefined;
    if (type === 'text') {
      content = message.text?.body || '';
    } else if (type === 'image') {
      const caption = message.image?.caption ? ` — ${message.image.caption}` : '';
      content = `📷 Imagem${caption}`;
      if (message.image?.id) attachmentsJson = JSON.stringify({ mediaId: message.image.id, mimeType: message.image.mime_type || 'image/jpeg', filename: `imagem_${messageId}.jpg` });
    } else if (type === 'audio' || type === 'voice') {
      content = '🎤 Áudio';
      if (message.audio?.id) attachmentsJson = JSON.stringify({ mediaId: message.audio.id, mimeType: message.audio.mime_type || 'audio/ogg', filename: `audio_${messageId}.ogg` });
      else if (message.voice?.id) attachmentsJson = JSON.stringify({ mediaId: message.voice.id, mimeType: message.voice.mime_type || 'audio/ogg', filename: `audio_${messageId}.ogg` });
    } else if (type === 'video') {
      const caption = message.video?.caption ? ` — ${message.video.caption}` : '';
      content = `🎥 Vídeo${caption}`;
      if (message.video?.id) attachmentsJson = JSON.stringify({ mediaId: message.video.id, mimeType: message.video.mime_type || 'video/mp4', filename: `video_${messageId}.mp4` });
    } else if (type === 'document') {
      const fname = message.document?.filename || 'arquivo';
      content = `📄 Documento: ${fname}`;
      if (message.document?.id) attachmentsJson = JSON.stringify({ mediaId: message.document.id, mimeType: message.document.mime_type || 'application/octet-stream', filename: fname });
    } else if (type === 'sticker') {
      content = '😊 Sticker';
      if (message.sticker?.id) attachmentsJson = JSON.stringify({ mediaId: message.sticker.id, mimeType: message.sticker.mime_type || 'image/webp', filename: `sticker_${messageId}.webp` });
    } else if (type === 'location') {
      content = `📍 Localização: ${message.location?.latitude}, ${message.location?.longitude}`;
    } else if (type === 'contacts') {
      const names = (message.contacts || []).map((c: any) => c.name?.formatted_name || '?').join(', ')
      content = `👤 Contato: ${names || 'compartilhado'}`;
    } else if (type === 'reaction') {
      content = `${message.reaction?.emoji || '👍'} (reação à mensagem)`;
    } else if (type === 'button') {
      content = message.button?.text || '🔘 Botão';
    } else if (type === 'interactive') {
      content = message.interactive?.button_reply?.title ||
                message.interactive?.list_reply?.title ||
                '🔘 Mensagem interativa';
    } else if (type === 'order') {
      content = '🛒 Pedido via WhatsApp';
    } else if (type === 'unsupported') {
      const errorTitle = message.errors?.[0]?.title || ''
      const errorDetail = message.errors?.[0]?.error_data?.details || ''
      const subtype = message.unsupported?.type || ''
      const detail = [errorTitle, errorDetail, subtype ? `(sub-type: ${subtype})` : ''].filter(Boolean).join(' — ')
      content = `⚠️ Mensagem não suportada pelo WhatsApp Business API${detail ? ': ' + detail : ''}`;
    } else {
      content = `📨 Mensagem do tipo: ${type}`;
    }

    if (!content) return;

    // ── Integração SAC ──────────────────────────────────────────────
    // O WhatsApp manda o número SEM máscara: "5598991269315"
    // O ticket pode ter qualquer formato: "(98) 99126-9315", "55989..."
    // Estratégia: comparar apenas os últimos 9 dígitos (número local sem DDD 55)
    const digitsOnly = from.replace(/\D/g, '')
    // Últimos 9 dígitos do número recebido (compatível com celular BR 9 dígitos)
    const last9 = digitsOnly.slice(-9)
    // Últimos 11 dígitos (DDD + número)
    const last11 = digitsOnly.slice(-11)

    console.log(`🔍 Buscando ticket para: from=${from} last9=${last9} last11=${last11}`)

    // Últimos 8 dígitos — resolve o problema do 9° dígito BR (celulares antigos sem o "9" extra)
    const last8 = digitsOnly.slice(-8)

    // Buscar todos os tickets abertos e filtrar por telefone em JS
    // (necessário por causa das diferentes máscaras salvas no banco)
    const openTickets = await prisma.serviceTicket.findMany({
      where: {
        status: { notIn: ['CLOSED'] },
        buyerPhone: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    })

    const ticket = openTickets.find(t => {
      if (!t.buyerPhone) return false
      const ticketDigits = t.buyerPhone.replace(/\D/g, '')
      // last9 e last11: comparação exata
      // last8: resolve o problema do 9º dígito (BR) — "99126-9315" vs "9126-9315"
      return ticketDigits.endsWith(last9) ||
             ticketDigits.endsWith(last11) ||
             ticketDigits.endsWith(last8)
    }) || null

    if (ticket) {
      // Salvar mensagem recebida no ticket
      await prisma.ticketMessage.create({
        data: {
          ticketId:    ticket.id,
          channel:     'whatsapp',
          direction:   'in',
          from:        contactName,
          content,
          externalId:  messageId,
          attachments: attachmentsJson || null,
          status:      'sent',
        },
      });

      // Atualizar ticket para IN_PROGRESS se estava OPEN
      await prisma.serviceTicket.update({
        where: { id: ticket.id },
        data: {
          status:    ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Mensagem do cliente salva no ticket ${ticket.id}`);
    } else {
      // Sem ticket aberto — criar automaticamente com número normalizado (só dígitos com 55)
      const normalizedPhone = digitsOnly.startsWith('55') ? digitsOnly : `55${digitsOnly}`
      const newTicket = await prisma.serviceTicket.create({
        data: {
          buyerPhone: normalizedPhone,
          buyerName:  contactName,
          subject:    `Contato recebido via WhatsApp de ${contactName}`,
          status:     'OPEN',
          category:   'OUTRO',
          priority:   'NORMAL',
        },
      });

      await prisma.ticketMessage.create({
        data: {
          ticketId:    newTicket.id,
          channel:     'whatsapp',
          direction:   'in',
          from:        contactName,
          content,
          externalId:  messageId,
          attachments: attachmentsJson || null,
          status:      'sent',
        },
      });

      console.log(`🆕 Novo ticket criado automaticamente: ${newTicket.id}`);
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
    const messageId   = status.id;
    const statusType  = status.status; // sent, delivered, read, failed
    const timestamp   = status.timestamp;

    console.log(`📊 Status da mensagem ${messageId}: ${statusType}`);

    // Atualizar status da mensagem no ticket
    if (['delivered', 'read', 'failed'].includes(statusType)) {
      await prisma.ticketMessage.updateMany({
        where: { externalId: messageId },
        data:  { status: statusType === 'failed' ? 'failed' : statusType },
      });
    }

    if (statusType === 'failed') {
      const errors = status.errors || [];
      console.error('❌ Falha no envio WhatsApp:', errors);
    }

  } catch (error) {
    console.error('Erro ao processar status:', error);
  }
}
