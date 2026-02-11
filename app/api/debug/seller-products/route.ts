import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('=== DEBUG SESSION ===')
    console.log('Session:', JSON.stringify(session, null, 2))
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado', session: null })
    }
    
    // Buscar seller
    const seller = await prisma.seller.findUnique({
      where: { userId: session.user.id }
    })
    
    console.log('Seller found:', seller?.id)
    
    // Buscar produtos desse seller
    const products = await prisma.product.findMany({
      where: { sellerId: seller?.id },
      select: {
        id: true,
        name: true,
        sellerId: true,
        active: true,
        isDropshipping: true
      }
    })
    
    return NextResponse.json({
      session: {
        user: session.user,
        expires: session.expires
      },
      seller: seller ? {
        id: seller.id,
        storeName: seller.storeName,
        userId: seller.userId,
        status: seller.status
      } : null,
      products: {
        count: products.length,
        items: products
      }
    })
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
