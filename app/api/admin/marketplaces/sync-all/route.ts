import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * API para sincronização automática de todos os produtos publicados em marketplaces
 * Pode ser executada manualmente ou via cron job
 */
export async function POST(request: NextRequest) {
  try {
    // Busca todas as listagens ativas com sync habilitado
    const listings = await prisma.marketplaceListing.findMany({
      where: {
        syncEnabled: true,
        status: { in: ['active', 'paused'] }
      },
      include: {
        product: true
      }
    })

    if (listings.length === 0) {
      return NextResponse.json({
        message: 'Nenhuma listagem para sincronizar',
        synced: 0,
        errors: 0
      })
    }

    const results = {
      synced: 0,
      errors: 0,
      details: [] as any[]
    }

    // Sincroniza cada listagem
    for (const listing of listings) {
      try {
        if (listing.marketplace === 'mercadolivre') {
          const result = await syncMercadoLivre(listing)
          
          if (result.success) {
            await prisma.marketplaceListing.update({
              where: { id: listing.id },
              data: {
                price: result.price,
                stock: result.stock,
                status: result.status,
                lastSyncAt: new Date(),
                errorMessage: null
              }
            })
            results.synced++
            results.details.push({
              productId: listing.productId,
              marketplace: listing.marketplace,
              status: 'success'
            })
          } else {
            await prisma.marketplaceListing.update({
              where: { id: listing.id },
              data: {
                errorMessage: result.message,
                lastSyncAt: new Date()
              }
            })
            results.errors++
            results.details.push({
              productId: listing.productId,
              marketplace: listing.marketplace,
              status: 'error',
              message: result.message
            })
          }
        }
        
        // Aguarda 1 segundo entre requisições para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('[Auto Sync] Erro ao sincronizar:', listing.id, error)
        results.errors++
        results.details.push({
          productId: listing.productId,
          marketplace: listing.marketplace,
          status: 'error',
          message: String(error)
        })
      }
    }

    return NextResponse.json({
      message: 'Sincronização concluída',
      total: listings.length,
      synced: results.synced,
      errors: results.errors,
      details: results.details
    })
  } catch (error) {
    console.error('[Auto Sync] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao executar sincronização', error: String(error) },
      { status: 500 }
    )
  }
}

async function syncMercadoLivre(listing: any) {
  try {
    const mlAuth = await prisma.mercadoLivreAuth.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!mlAuth) {
      return {
        success: false,
        message: 'Conta do Mercado Livre não conectada'
      }
    }

    // Verifica se o token expirou e renova se necessário
    const now = new Date()
    let accessToken = mlAuth.accessToken

    if (mlAuth.expiresAt && now >= mlAuth.expiresAt) {
      console.log('[ML Auto Sync] Token expirado, renovando...')
      
      const credentials = await (prisma as any).mercadoLivreCredentials.findFirst()
      
      if (!credentials || !mlAuth.refreshToken) {
        return {
          success: false,
          message: 'Token expirado. Reconecte sua conta do Mercado Livre'
        }
      }

      const refreshResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          refresh_token: mlAuth.refreshToken,
        }),
      })

      if (!refreshResponse.ok) {
        return {
          success: false,
          message: 'Erro ao renovar token'
        }
      }

      const refreshData = await refreshResponse.json()
      
      const newExpiresAt = new Date()
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in)

      await prisma.mercadoLivreAuth.update({
        where: { id: mlAuth.id },
        data: {
          accessToken: refreshData.access_token,
          refreshToken: refreshData.refresh_token,
          expiresAt: newExpiresAt,
        }
      })

      accessToken = refreshData.access_token
      console.log('[ML Auto Sync] Token renovado com sucesso')
    }

    // Garante que o preço tenha exatamente 2 casas decimais (ML não aceita mais que isso para BRL)
    const finalPrice = Number(listing.product.price.toFixed(2))
    console.log('[ML Auto Sync] Preço original:', listing.product.price, '→ Preço final:', finalPrice)

    const updateData = {
      price: finalPrice,
      available_quantity: listing.product.stock
    }

    const response = await fetch(
      `https://api.mercadolibre.com/items/${listing.listingId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('[ML Sync] Erro da API:', data)
      return {
        success: false,
        message: data.message || 'Erro ao sincronizar com Mercado Livre'
      }
    }

    return {
      success: true,
      price: data.price,
      stock: data.available_quantity,
      status: data.status
    }
  } catch (error) {
    console.error('[ML Sync] Erro:', error)
    return {
      success: false,
      message: 'Erro ao sincronizar: ' + String(error)
    }
  }
}

/**
 * GET endpoint para verificar status da sincronização
 */
export async function GET() {
  try {
    const stats = await prisma.marketplaceListing.groupBy({
      by: ['marketplace', 'status'],
      _count: {
        _all: true
      }
    })

    const lastSync = await prisma.marketplaceListing.findFirst({
      orderBy: { lastSyncAt: 'desc' },
      select: { lastSyncAt: true }
    })

    return NextResponse.json({
      stats,
      lastSync: lastSync?.lastSyncAt,
      message: 'Status da sincronização'
    })
  } catch (error) {
    console.error('[Sync Status] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao buscar status', error: String(error) },
      { status: 500 }
    )
  }
}
