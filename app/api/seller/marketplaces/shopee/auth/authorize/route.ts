import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SHOPEE_PROD_URL = 'https://partner.shopeemobile.com'
const SHOPEE_SANDBOX_URL = 'https://partner.uat.shopeemobile.com'

function shopeeBaseUrl(isSandbox: boolean) {
  return isSandbox ? SHOPEE_SANDBOX_URL : SHOPEE_PROD_URL
}

// GET - Gerar URL de autorização usando credenciais do admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Usar credenciais do ADMIN (não do vendedor)
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { shopeeAuth: true },
    })

    if (!adminUser?.shopeeAuth?.partnerId || !adminUser?.shopeeAuth?.partnerKey) {
      return NextResponse.json(
        { error: 'Shopee não configurada pelo administrador. Configure em Integrações → Shopee.' },
        { status: 400 }
      )
    }

    const { partnerId, partnerKey, isSandbox } = adminUser.shopeeAuth
    const timestamp = Math.floor(Date.now() / 1000)
    const path = '/api/v2/shop/auth_partner'

    // Encontrar o userId do vendedor para incluir no state
    const sellerUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })

    // O redirect DEVE usar o domínio registrado no Shopee Console (gerencial-sys)
    // O state é embutido na própria redirect URL pois a Shopee não devolve state separado
    const adminDomain = process.env.ADMIN_URL || 'https://gerencial-sys.mydshop.com.br'
    const state = `seller_${sellerUser?.id}`
    const redirectUri = `${adminDomain}/api/shopee/seller-callback?state=${state}`
    const redirectUrl = encodeURIComponent(redirectUri)

    const baseString = `${partnerId}${path}${timestamp}`
    const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex')

    const authUrl = `${shopeeBaseUrl(isSandbox ?? false)}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${redirectUrl}`

    return NextResponse.json({ authUrl, isSandbox: isSandbox ?? false })
  } catch (error) {
    console.error('Erro ao gerar URL de autorização Shopee (seller):', error)
    return NextResponse.json({ error: 'Erro ao gerar URL de autorização' }, { status: 500 })
  }
}
