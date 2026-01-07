import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { marketplace, action } = await request.json()

    if (!marketplace || !action) {
      return NextResponse.json(
        { message: 'Marketplace e action são obrigatórios' },
        { status: 400 }
      )
    }

    if (!['pause', 'activate'].includes(action)) {
      return NextResponse.json(
        { message: 'Action deve ser "pause" ou "activate"' },
        { status: 400 }
      )
    }

    // Busca a listagem
    const listing = await prisma.marketplaceListing.findUnique({
      where: {
        productId_marketplace: {
          productId: params.id,
          marketplace
        }
      }
    })

    if (!listing) {
      return NextResponse.json(
        { message: 'Anúncio não encontrado' },
        { status: 404 }
      )
    }

    // Pausa/ativa baseado no marketplace
    if (marketplace === 'mercadolivre') {
      const result = await toggleMercadoLivre(listing.listingId, action)
      
      if (!result.success) {
        return NextResponse.json(
          { message: result.message },
          { status: 400 }
        )
      }

      // Atualiza o status no banco
      await prisma.marketplaceListing.update({
        where: {
          productId_marketplace: {
            productId: params.id,
            marketplace
          }
        },
        data: {
          status: result.status
        }
      })

      return NextResponse.json({
        message: action === 'pause' ? 'Anúncio pausado com sucesso' : 'Anúncio ativado com sucesso',
        status: result.status
      })
    }

    return NextResponse.json(
      { message: 'Marketplace não suportado' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Toggle Listing] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao alterar status do anúncio' },
      { status: 500 }
    )
  }
}

async function toggleMercadoLivre(listingId: string, action: 'pause' | 'activate') {
  try {
    // Busca as credenciais do Mercado Livre
    const mlAuth = await prisma.mercadoLivreAuth.findFirst({
      where: {
        expiresAt: { gt: new Date() }
      }
    })

    if (!mlAuth) {
      return {
        success: false,
        message: 'Credenciais do Mercado Livre não encontradas ou expiradas. Reconecte sua conta.'
      }
    }

    const accessToken = mlAuth.accessToken
    const newStatus = action === 'pause' ? 'paused' : 'active'
    
    console.log(`[ML Toggle] ${action === 'pause' ? 'Pausando' : 'Ativando'} anúncio: ${listingId}`)
    console.log(`[ML Toggle] Novo status: ${newStatus}`)
    
    const response = await fetch(
      `https://api.mercadolibre.com/items/${listingId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      }
    )

    const data = await response.json()
    
    console.log('[ML Toggle] Response status:', response.status)
    console.log('[ML Toggle] Response data:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error('[ML Toggle] ❌ Erro da API ML:', data)
      
      // Mensagem mais específica
      let errorMsg = `Erro ao ${action === 'pause' ? 'pausar' : 'ativar'} anúncio`
      if (data.message) errorMsg += `: ${data.message}`
      if (data.error) errorMsg += ` (${data.error})`
      if (data.cause && data.cause.length > 0) {
        errorMsg += ` - ${data.cause.map((c: any) => c.message).join(', ')}`
      }
      
      return {
        success: false,
        message: errorMsg
      }
    }

    console.log(`[ML Toggle] ✅ Anúncio ${action === 'pause' ? 'pausado' : 'ativado'} com sucesso`)

    return {
      success: true,
      status: data.status,
      message: `Anúncio ${action === 'pause' ? 'pausado' : 'ativado'} com sucesso`
    }
  } catch (error) {
    console.error('[ML Toggle] Erro:', error)
    return {
      success: false,
      message: 'Erro ao alterar status: ' + String(error)
    }
  }
}
