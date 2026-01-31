import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { marketplace } = await request.json()

    if (!marketplace) {
      return NextResponse.json(
        { message: 'Marketplace não especificado' },
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

    // Deleta baseado no marketplace
    if (marketplace === 'mercadolivre') {
      const result = await deleteMercadoLivre(listing.listingId)
      
      if (!result.success) {
        return NextResponse.json(
          { message: result.message },
          { status: 400 }
        )
      }

      // Remove o registro do banco
      await prisma.marketplaceListing.delete({
        where: {
          productId_marketplace: {
            productId: params.id,
            marketplace
          }
        }
      })

      return NextResponse.json({
        message: 'Anúncio excluído com sucesso'
      })
    }

    return NextResponse.json(
      { message: 'Marketplace não suportado' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Delete Listing] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir anúncio' },
      { status: 500 }
    )
  }
}

async function deleteMercadoLivre(listingId: string) {
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
        message: 'Credenciais do Mercado Livre não encontradas ou expiradas'
      }
    }

    let accessToken = mlAuth.accessToken

    // Verifica se o token está próximo de expirar (menos de 1 hora)
    const expiresIn = mlAuth.expiresAt.getTime() - Date.now()
    if (expiresIn < 3600000) {
      console.log('[ML Delete] Token expirando, renovando...')

      const refreshResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.ML_CLIENT_ID!,
          client_secret: process.env.ML_CLIENT_SECRET!,
          refresh_token: mlAuth.refreshToken
        })
      })

      const refreshData = await refreshResponse.json()

      if (!refreshResponse.ok) {
        return {
          success: false,
          message: 'Erro ao renovar token do Mercado Livre'
        }
      }

      const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000))

      await prisma.mercadoLivreAuth.update({
        where: { id: mlAuth.id },
        data: {
          accessToken: refreshData.access_token,
          refreshToken: refreshData.refresh_token,
          expiresAt: newExpiresAt,
        }
      })

      accessToken = refreshData.access_token
      console.log('[ML Delete] Token renovado com sucesso')
    }

    // Primeiro pausa o anúncio, depois deleta
    console.log('[ML Delete] Pausando anúncio:', listingId)
    
    const pauseResponse = await fetch(
      `https://api.mercadolibre.com/items/${listingId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'paused' })
      }
    )

    if (!pauseResponse.ok) {
      const pauseData = await pauseResponse.json()
      console.log('[ML Delete] Aviso ao pausar:', pauseData.message)
      // Continua mesmo se falhar ao pausar
    }

    // Deleta o anúncio (fecha definitivamente)
    console.log('[ML Delete] Deletando anúncio:', listingId)
    
    const deleteResponse = await fetch(
      `https://api.mercadolibre.com/items/${listingId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'closed',
          deleted: true 
        })
      }
    )

    const data = await deleteResponse.json()

    if (!deleteResponse.ok) {
      console.error('[ML Delete] Erro da API:', data)
      return {
        success: false,
        message: data.message || 'Erro ao deletar anúncio no Mercado Livre'
      }
    }

    console.log('[ML Delete] ✅ Anúncio deletado com sucesso')

    return {
      success: true,
      message: 'Anúncio deletado com sucesso'
    }
  } catch (error) {
    console.error('[ML Delete] Erro:', error)
    return {
      success: false,
      message: 'Erro ao deletar anúncio: ' + String(error)
    }
  }
}
