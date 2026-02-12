import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * API de Rastreamento de Afiliados
 * Endpoint: GET /api/affiliate/track?ref=CODIGO
 * 
 * Funcionalidade:
 * 1. Recebe código de afiliado via query parameter (ref)
 * 2. Valida se o código existe e está ativo
 * 3. Salva cookie com código do afiliado (validade: 30 dias padrão)
 * 4. Registra o clique na tabela affiliate_click
 * 5. Retorna sucesso/erro
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const refCode = searchParams.get('ref')

    if (!refCode) {
      return NextResponse.json(
        { error: 'Código de afiliado não fornecido' },
        { status: 400 }
      )
    }

    // Buscar afiliado pelo código
    const affiliate = await prisma.affiliate.findUnique({
      where: { code: refCode.toUpperCase() },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        status: true,
        cookieDays: true
      }
    })

    if (!affiliate) {
      return NextResponse.json(
        { error: 'Código de afiliado inválido' },
        { status: 404 }
      )
    }

    if (!affiliate.isActive || affiliate.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Afiliado não está ativo' },
        { status: 403 }
      )
    }

    // Obter informações do visitante
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const referrer = request.headers.get('referer') || null
    const landingPage = searchParams.get('url') || request.url

    // Registrar clique
    await prisma.affiliateClick.create({
      data: {
        affiliateId: affiliate.id,
        ipAddress: ipAddress.split(',')[0].trim(), // Pega primeiro IP se houver múltiplos
        userAgent,
        referrer,
        landingPage,
        converted: false
      }
    })

    // Calcular data de expiração do cookie
    const cookieMaxAge = (affiliate.cookieDays || 30) * 24 * 60 * 60 // Converter dias para segundos
    const expiresDate = new Date()
    expiresDate.setDate(expiresDate.getDate() + (affiliate.cookieDays || 30))

    // Criar resposta com cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Rastreamento registrado com sucesso',
        affiliate: {
          code: affiliate.code,
          name: affiliate.name
        }
      },
      { status: 200 }
    )

    // Definir cookie com código do afiliado
    response.cookies.set('affiliate_ref', affiliate.code, {
      httpOnly: false, // Permitir acesso via JS para debug
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/'
    })

    // Cookie adicional com ID do afiliado (mais seguro)
    response.cookies.set('affiliate_id', affiliate.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Erro ao processar rastreamento de afiliado:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar rastreamento' },
      { status: 500 }
    )
  }
}

/**
 * POST: Converter clique em venda
 * Chamado após confirmação do pedido
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID do pedido não fornecido' },
        { status: 400 }
      )
    }

    // Obter código do afiliado do cookie
    const affiliateCode = request.cookies.get('affiliate_ref')?.value
    const affiliateId = request.cookies.get('affiliate_id')?.value

    if (!affiliateCode || !affiliateId) {
      return NextResponse.json(
        { success: false, message: 'Nenhum afiliado rastreado' },
        { status: 200 }
      )
    }

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        total: true,
        userId: true,
        buyerName: true,
        buyerEmail: true,
        status: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Buscar afiliado
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      select: {
        id: true,
        code: true,
        commissionRate: true,
        totalSales: true,
        totalCommission: true,
        availableBalance: true
      }
    })

    if (!affiliate) {
      return NextResponse.json(
        { error: 'Afiliado não encontrado' },
        { status: 404 }
      )
    }

    // Calcular comissão
    const commissionAmount = (order.total * affiliate.commissionRate) / 100

    // Criar registro de venda do afiliado
    const affiliateSale = await prisma.affiliateSale.create({
      data: {
        affiliateId: affiliate.id,
        orderId: order.id,
        customerId: order.userId,
        customerName: order.buyerName,
        customerEmail: order.buyerEmail,
        orderTotal: order.total,
        commissionRate: affiliate.commissionRate,
        commissionAmount: commissionAmount,
        status: 'PENDING' // Será confirmado quando pedido for entregue
      }
    })

    // Atualizar pedido com informações do afiliado
    await prisma.order.update({
      where: { id: orderId },
      data: {
        affiliateId: affiliate.id,
        affiliateCode: affiliate.code
      }
    })

    // Atualizar totais do afiliado (apenas totalSales, comissão fica pendente)
    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        totalSales: affiliate.totalSales + order.total
      }
    })

    // Marcar clique como convertido
    await prisma.affiliateClick.updateMany({
      where: {
        affiliateId: affiliate.id,
        converted: false,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 dias
        }
      },
      data: {
        converted: true,
        orderId: order.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Venda atribuída ao afiliado com sucesso',
      affiliateSale: {
        id: affiliateSale.id,
        commissionAmount,
        status: 'PENDING'
      }
    })

  } catch (error) {
    console.error('Erro ao converter venda de afiliado:', error)
    return NextResponse.json(
      { error: 'Erro ao processar conversão' },
      { status: 500 }
    )
  }
}
