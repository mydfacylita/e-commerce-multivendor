import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { seller: true, workForSeller: true }
    });

    const seller = user?.seller || user?.workForSeller;

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 });
    }

    // Buscar pedido
    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        sellerId: seller.id
      },
      include: {
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Gerar HTML da etiqueta padrão Correios
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiqueta - Pedido #${order.id.slice(0, 8)}</title>
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
      border: 2px solid #000;
    }
    .order-info {
      font-size: 10px;
      text-align: center;
      margin-top: 5mm;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">CORREIOS</div>
    <div style="font-size: 10px;">PAC / SEDEX</div>
  </div>

  <div class="section">
    <div class="section-title">REMETENTE</div>
    <div class="address">
      <strong>${seller.storeName}</strong><br>
      ${seller.endereco || 'Endereço não cadastrado'}<br>
      ${seller.cidade ? `${seller.cidade} - ${seller.estado}` : ''}<br>
      ${seller.cep ? `CEP: ${seller.cep}` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">DESTINATÁRIO</div>
    <div class="address">
      <strong>${order.user?.name || 'Cliente'}</strong><br>
      ${order.shippingAddress}<br>
    </div>
  </div>

  ${order.trackingCode ? `
  <div class="barcode">
    ${order.trackingCode}
  </div>
  ` : ''}

  <div class="order-info">
    Pedido: #${order.id.slice(0, 8)}<br>
    Data: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}<br>
    Volumes: 1 / Peso: 1kg
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar etiqueta:', error);
    return NextResponse.json({ error: 'Erro ao gerar etiqueta' }, { status: 500 });
  }
}
