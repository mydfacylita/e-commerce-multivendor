import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { WhatsAppService } from '@/lib/whatsapp'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/whatsapp/status
 * Verifica status da conexão com WhatsApp
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const config = await WhatsAppService.getConfig()
    
    if (!config) {
      return NextResponse.json({
        connected: false,
        provider: 'disabled',
        message: 'WhatsApp não configurado'
      })
    }

    // Para Cloud API, verificar conexão
    if (config.provider === 'cloud') {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${config.phoneNumberId}`,
          {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          return NextResponse.json({
            connected: true,
            provider: 'cloud',
            phoneNumber: data.display_phone_number,
            verifiedName: data.verified_name,
            message: 'Conectado à API do WhatsApp (Meta)'
          })
        } else {
          const error = await response.json()
          return NextResponse.json({
            connected: false,
            provider: 'cloud',
            message: error.error?.message || 'Erro ao verificar conexão'
          })
        }
      } catch (error: any) {
        return NextResponse.json({
          connected: false,
          provider: 'cloud',
          message: `Erro de conexão: ${error.message}`
        })
      }
    }

    // Para outros providers
    return NextResponse.json({
      connected: true,
      provider: config.provider,
      message: `Configurado com ${config.provider.toUpperCase()}`
    })

  } catch (error) {
    console.error('Erro ao verificar WhatsApp:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * POST /api/whatsapp/test
 * Envia mensagem de teste
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { phone } = await request.json()
    
    if (!phone) {
      return NextResponse.json({ error: 'Número não informado' }, { status: 400 })
    }

    const result = await WhatsAppService.sendMessage({
      to: phone,
      message: `✅ *Teste de WhatsApp - MYDSHOP*\n\nSe você recebeu esta mensagem, a integração está funcionando corretamente!\n\n🕐 ${new Date().toLocaleString('pt-BR')}`
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'Mensagem de teste enviada com sucesso!'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Erro ao enviar teste:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
