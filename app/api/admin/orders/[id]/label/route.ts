import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('\n🏷️  [INÍCIO] GET /api/admin/orders/[id]/label')
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER') {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    let sellerId = null
    if (session.user.role === 'SELLER') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          seller: {
            include: { subscription: true }
          },
          workForSeller: {
            include: { subscription: true }
          }
        }
      })

      const seller = user?.seller || user?.workForSeller
      if (!seller || seller.status !== 'ACTIVE') {
        return NextResponse.json({ message: 'Vendedor inválido' }, { status: 403 })
      }

      if (!seller.subscription || !['ACTIVE', 'TRIAL'].includes(seller.subscription.status)) {
        return NextResponse.json({ message: 'Plano inválido' }, { status: 403 })
      }

      if (seller.subscription.endDate < new Date()) {
        return NextResponse.json({ message: 'Plano expirado' }, { status: 403 })
      }

      sellerId = seller.id
    }

    const whereCondition: any = { id: params.id }
    if (sellerId) {
      whereCondition.items = {
        some: {
          sellerId: sellerId
        }
      }
    }

    const order = await prisma.order.findFirst({
      where: whereCondition,
      include: {
        user: true,
        items: {
          where: sellerId ? { sellerId } : undefined,
          include: {
            product: true
          }
        },
        seller: true
      }
    })

    if (!order) {
      return NextResponse.json({ message: 'Pedido não encontrado' }, { status: 404 })
    }

    console.log('✅ Etiqueta gerada:', order.orderNumber)

    // Gerar HTML da etiqueta
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiqueta - Pedido #${order.orderNumber}</title>
  <style>
    @media print {
      @page { margin: 0; size: 10cm 15cm; }
      body { margin: 0; }
    }
    body {
      font-family: Arial, sans-serif;
      width: 10cm;
      height: 15cm;
      margin: 0;
      padding: 10mm;
      box-sizing: border-box;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 5mm;
      margin-bottom: 5mm;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #003366;
    }
    .section {
      margin-bottom: 5mm;
      border: 1px solid #ccc;
      padding: 3mm;
    }
    .section-title {
      font-size: 10px;
      font-weight: bold;
      background: #f0f0f0;
      padding: 2mm;
      margin: -3mm -3mm 2mm -3mm;
    }
    .address {
      font-size: 11px;
      line-height: 1.4;
    }
    .barcode {
      text-align: center;
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: bold;
      letter-spacing: 2px;
      margin: 5mm 0;
      padding: 3mm;
      border: 1px solid #000;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${order.seller?.storeName || 'MYDSHOP'}</div>
    <div style="font-size: 10px; margin-top: 2mm;">Pedido: ${order.orderNumber}</div>
  </div>

  <div class="section">
    <div class="section-title">DESTINATÁRIO</div>
    <div class="address">
      <strong>${order.user?.name || order.shippingName}</strong><br>
      ${order.shippingAddress || ''}<br>
      ${order.shippingCity || ''} - ${order.shippingState || ''}<br>
      CEP: ${order.shippingZipCode || ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">REMETENTE</div>
    <div class="address">
      <strong>${order.seller?.storeName || 'MYDSHOP'}</strong><br>
      ${order.seller?.endereco || ''}<br>
      ${order.seller?.cidade || ''} - ${order.seller?.estado || ''}<br>
      CEP: ${order.seller?.cep || ''}
    </div>
  </div>

  ${order.trackingCode ? `
  <div class="barcode">
    ${order.trackingCode}
  </div>
  ` : ''}

  <div style="margin-top: 5mm; font-size: 9px; text-align: center; color: #666;">
    Data: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}<br>
    Valor: R$ ${order.total.toFixed(2)}
  </div>

  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error: any) {
    console.error('💥 Erro ao gerar etiqueta:', error.message)
    return NextResponse.json({ message: 'Erro ao gerar etiqueta' }, { status: 500 })
  }
}
