import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Gerar guia de separação com todos os pedidos pendentes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending' // pending, separated, all
    const orderIds = searchParams.get('ids')?.split(',').filter(Boolean) || []

    // Buscar dados da empresa
    const company = await prisma.companySettings.findFirst()

    // Buscar logo
    const logoConfigs = await prisma.systemConfig.findMany({
      where: {
        key: { in: ['app.logo', 'appearance.logo'] }
      }
    })
    const logoConfig = logoConfigs.find(c => c.value)
    const logoUrl = logoConfig?.value || '/logo-animated.svg'

    // Construir filtro de pedidos
    let whereCondition: any = {
      status: 'PROCESSING'
    }

    // Filtrar por IDs específicos ou por status de separação
    if (orderIds.length > 0) {
      whereCondition.id = { in: orderIds }
    } else {
      switch (status) {
        case 'pending':
          whereCondition.separatedAt = null
          break
        case 'separated':
          whereCondition.separatedAt = { not: null }
          whereCondition.packedAt = null
          break
        case 'all':
          // Todos os pedidos em processamento
          break
      }
    }

    // Buscar pedidos com itens
    const orders = await prisma.order.findMany({
      where: whereCondition,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                supplierSku: true,
                images: true,
                weight: true,
                length: true,
                width: true,
                height: true,
                gtin: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Buscar embalagens para os pedidos que têm
    const packagingBoxIds = orders
      .map(o => o.packagingBoxId)
      .filter((id): id is string => id !== null)
    
    const packagingBoxes = packagingBoxIds.length > 0 
      ? await prisma.packagingBox.findMany({
          where: { id: { in: packagingBoxIds } }
        })
      : []
    
    const packagingBoxMap = new Map(packagingBoxes.map(p => [p.id, p]))

    // Adicionar embalagem aos pedidos
    const ordersWithPackaging = orders.map(order => ({
      ...order,
      packagingBox: order.packagingBoxId ? packagingBoxMap.get(order.packagingBoxId) : null
    }))

    if (ordersWithPackaging.length === 0) {
      return new NextResponse(generateEmptyGuide(company, logoUrl), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    // Gerar HTML da guia de separação
    const html = generateSeparationGuide(ordersWithPackaging, company, logoUrl)

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })

  } catch (error) {
    console.error('Erro ao gerar guia de separação:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function generateEmptyGuide(company: any, logoUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Guia de Separação - ${company?.name || 'MYDSHOP'}</title>
  <style>
    ${getStyles()}
  </style>
</head>
<body>
  <div class="page">
    ${generateHeader(company, logoUrl)}
    <div class="empty-message">
      <h2>Nenhum pedido pendente para separação</h2>
      <p>Todos os pedidos foram processados!</p>
    </div>
  </div>
</body>
</html>
`
}

function generateSeparationGuide(orders: any[], company: any, logoUrl: string): string {
  const now = new Date()
  const dataHora = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  
  // Calcular totais
  const totalPedidos = orders.length
  const totalItens = orders.reduce((acc, order) => 
    acc + order.items.reduce((sum: number, item: any) => sum + item.quantity, 0), 0)
  const totalValor = orders.reduce((acc, order) => acc + order.total, 0)
  
  // Agrupar produtos para conferência rápida
  const productSummary: { [key: string]: { name: string, sku: string, total: number, orders: string[] } } = {}
  orders.forEach(order => {
    order.items.forEach((item: any) => {
      const key = item.productId
      if (!productSummary[key]) {
        productSummary[key] = {
          name: item.product.name,
          sku: item.product.supplierSku || item.product.gtin || item.productId.slice(-8).toUpperCase(),
          total: 0,
          orders: []
        }
      }
      productSummary[key].total += item.quantity
      productSummary[key].orders.push(`#${order.id.slice(-8).toUpperCase()}`)
    })
  })

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Guia de Separação - ${company?.name || 'MYDSHOP'}</title>
  <style>
    ${getStyles()}
  </style>
</head>
<body>
  <div class="page">
    ${generateHeader(company, logoUrl)}
    
    <!-- Informações do Documento -->
    <div class="doc-info">
      <div class="doc-title">
        <h1>📋 GUIA DE SEPARAÇÃO</h1>
        <p class="doc-date">Gerado em: ${dataHora}</p>
      </div>
      <div class="doc-summary">
        <div class="summary-item">
          <span class="summary-value">${totalPedidos}</span>
          <span class="summary-label">Pedidos</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">${totalItens}</span>
          <span class="summary-label">Itens</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">R$ ${totalValor.toFixed(2)}</span>
          <span class="summary-label">Total</span>
        </div>
      </div>
    </div>

    <!-- Resumo de Produtos para Conferência -->
    <div class="section">
      <h2 class="section-title">📦 RESUMO DE PRODUTOS (Conferência Rápida)</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th style="width: 50px;">✓</th>
            <th>Produto</th>
            <th style="width: 100px;">SKU</th>
            <th style="width: 80px;">Qtd Total</th>
            <th>Pedidos</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(productSummary).map(prod => `
            <tr>
              <td class="check-cell">☐</td>
              <td>${prod.name}</td>
              <td class="center">${prod.sku}</td>
              <td class="center qty">${prod.total}</td>
              <td class="orders-list">${prod.orders.join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Lista Detalhada de Pedidos -->
    <div class="section page-break-before">
      <h2 class="section-title">📋 LISTA DETALHADA DE PEDIDOS</h2>
      
      ${orders.map((order, index) => {
        const address = parseAddress(order.shippingAddress)
        const pesoTotal = order.items.reduce((acc: number, item: any) => 
          acc + (item.product.weight || 0.3) * item.quantity, 0)
        const totalItensOrder = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
        
        return `
        <div class="order-card ${index > 0 ? 'page-break-before-maybe' : ''}">
          <div class="order-header">
            <div class="order-id">
              <span class="order-number">#${order.id.slice(-8).toUpperCase()}</span>
              <span class="order-status ${order.separatedAt ? 'separated' : 'pending'}">
                ${order.separatedAt ? '✓ Separado' : '⏳ Pendente'}
              </span>
            </div>
            <div class="order-meta">
              <span>📅 ${new Date(order.createdAt).toLocaleDateString('pt-BR')} ${new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              <span>📦 ${totalItensOrder} ${totalItensOrder === 1 ? 'item' : 'itens'}</span>
              <span>⚖️ ${pesoTotal.toFixed(2)}kg</span>
              <span>💰 R$ ${order.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="order-content">
            <!-- Destinatário -->
            <div class="customer-info">
              <h4>👤 DESTINATÁRIO</h4>
              <div class="customer-details">
                <p><strong>${order.buyerName}</strong></p>
                ${order.buyerPhone ? `<p>📱 ${order.buyerPhone}</p>` : ''}
                ${order.buyerEmail ? `<p>✉️ ${order.buyerEmail}</p>` : ''}
                <hr>
                <p>📍 ${address.street}, ${address.number || 'S/N'}</p>
                ${address.complement ? `<p>${address.complement}</p>` : ''}
                <p>${address.neighborhood || ''}</p>
                <p>${address.city || ''} - ${address.state || ''}</p>
                <p><strong>CEP: ${address.zipCode || ''}</strong></p>
              </div>
            </div>

            <!-- Produtos -->
            <div class="products-list">
              <h4>📦 PRODUTOS PARA SEPARAR</h4>
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 40px;">✓</th>
                    <th>Produto</th>
                    <th style="width: 70px;">SKU</th>
                    <th style="width: 50px;">Qtd</th>
                    <th style="width: 70px;">Tam/Cor</th>
                    <th style="width: 70px;">Unit.</th>
                    <th style="width: 70px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.items.map((item: any) => `
                    <tr>
                      <td class="check-cell">☐</td>
                      <td class="product-name">${item.product.name}</td>
                      <td class="center">${item.product.supplierSku || item.product.gtin || item.productId.slice(-8).toUpperCase()}</td>
                      <td class="center qty">${item.quantity}</td>
                      <td class="center">
                        ${item.selectedSize ? `${item.selectedSize}` : ''}
                        ${item.selectedSize && item.selectedColor ? ' / ' : ''}
                        ${item.selectedColor ? `${item.selectedColor}` : ''}
                        ${!item.selectedSize && !item.selectedColor ? '-' : ''}
                      </td>
                      <td class="center price">R$ ${(item.price || 0).toFixed(2)}</td>
                      <td class="center price"><strong>R$ ${((item.price || 0) * item.quantity).toFixed(2)}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr class="subtotal-row">
                    <td colspan="5"></td>
                    <td class="center"><strong>Subtotal:</strong></td>
                    <td class="center price"><strong>R$ ${order.items.reduce((sum: number, item: any) => sum + (item.price || 0) * item.quantity, 0).toFixed(2)}</strong></td>
                  </tr>
                  ${order.shippingCost ? `
                  <tr class="shipping-row">
                    <td colspan="5"></td>
                    <td class="center"><strong>Frete:</strong></td>
                    <td class="center price">R$ ${(order.shippingCost || 0).toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  ${order.discountAmount ? `
                  <tr class="discount-row">
                    <td colspan="5"></td>
                    <td class="center"><strong>Desconto:</strong></td>
                    <td class="center price discount">- R$ ${(order.discountAmount || 0).toFixed(2)}</td>
                  </tr>
                  ` : ''}
                  <tr class="total-row">
                    <td colspan="5"></td>
                    <td class="center"><strong>TOTAL:</strong></td>
                    <td class="center price total-value"><strong>R$ ${(order.total || 0).toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          ${order.packagingBox ? `
            <div class="packaging-info">
              📦 Embalagem: <strong>${order.packagingBox.code}</strong> - ${order.packagingBox.name || ''}
            </div>
          ` : ''}

          <div class="order-footer">
            <div class="signature-area">
              <div class="signature-line">
                <p>Separado por: _______________________</p>
                <p>Data/Hora: _______________________</p>
              </div>
              <div class="observation-area">
                <p>Observações:</p>
                <div class="obs-box"></div>
              </div>
            </div>
          </div>
        </div>
        `
      }).join('')}
    </div>

    <!-- Rodapé -->
    <div class="footer">
      <p>${company?.name || 'MYDSHOP'} | CNPJ: ${formatCNPJ(company?.cnpj) || '-'}</p>
      <p>${company?.address || ''} | Tel: ${formatPhone(company?.phone) || '-'} | Email: ${company?.email || '-'}</p>
      <p class="page-info">Guia de Separação - Gerado em ${dataHora}</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
`
}

function generateHeader(company: any, logoUrl: string): string {
  return `
    <div class="header">
      <div class="logo-section">
        <img src="${logoUrl}" alt="${company?.name || 'MYDSHOP'}" class="logo" onerror="this.style.display='none'">
        <div class="company-info">
          <h1 class="company-name">${company?.name || 'MYDSHOP'}</h1>
          ${company?.cnpj ? `<p>CNPJ: ${formatCNPJ(company.cnpj)}</p>` : ''}
        </div>
      </div>
      <div class="company-details">
        ${company?.address ? `<p>📍 ${company.address}</p>` : ''}
        ${company?.phone ? `<p>📱 ${formatPhone(company.phone)}</p>` : ''}
        ${company?.email ? `<p>✉️ ${company.email}</p>` : ''}
      </div>
    </div>
  `
}

function getStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      background: #fff;
    }
    
    .page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 10mm;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 15px;
      border-bottom: 3px solid #2563eb;
      margin-bottom: 20px;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .logo {
      height: 50px;
      max-width: 150px;
      object-fit: contain;
    }
    
    .company-info h1 {
      font-size: 20px;
      color: #1e40af;
      margin: 0;
    }
    
    .company-info p {
      font-size: 11px;
      color: #666;
    }
    
    .company-details {
      text-align: right;
      font-size: 10px;
      color: #666;
    }
    
    .company-details p {
      margin: 2px 0;
    }
    
    .doc-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #2563eb, #1e40af);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .doc-title h1 {
      font-size: 18px;
      margin: 0;
    }
    
    .doc-date {
      font-size: 11px;
      opacity: 0.9;
      margin-top: 3px;
    }
    
    .doc-summary {
      display: flex;
      gap: 25px;
    }
    
    .summary-item {
      text-align: center;
    }
    
    .summary-value {
      display: block;
      font-size: 20px;
      font-weight: bold;
    }
    
    .summary-label {
      font-size: 10px;
      opacity: 0.9;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 14px;
      color: #1e40af;
      padding: 8px 12px;
      background: #eff6ff;
      border-left: 4px solid #2563eb;
      margin-bottom: 12px;
    }
    
    .summary-table, .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    
    .summary-table th, .summary-table td,
    .items-table th, .items-table td {
      padding: 8px 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    
    .summary-table th, .items-table th {
      background: #f8fafc;
      font-weight: bold;
      color: #374151;
    }
    
    .summary-table tbody tr:nth-child(even),
    .items-table tbody tr:nth-child(even) {
      background: #fafafa;
    }
    
    .check-cell {
      text-align: center;
      font-size: 14px;
    }
    
    .center { text-align: center; }
    
    .qty {
      font-weight: bold;
      font-size: 12px;
      color: #2563eb;
    }
    
    .price {
      font-size: 10px;
      white-space: nowrap;
    }
    
    .discount {
      color: #dc2626;
    }
    
    .total-value {
      font-size: 12px;
      color: #059669;
    }
    
    .items-table tfoot tr {
      background: #f8fafc;
    }
    
    .items-table tfoot .subtotal-row {
      border-top: 2px solid #ddd;
    }
    
    .items-table tfoot .total-row {
      background: #1e40af;
      color: white;
    }
    
    .items-table tfoot .total-row td {
      border-color: #1e40af;
    }
    
    .items-table tfoot .total-row .total-value {
      color: white;
      font-size: 13px;
    }
    
    .orders-list {
      font-size: 9px;
      color: #666;
    }
    
    .order-card {
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    
    .order-header {
      background: #f8fafc;
      padding: 12px 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .order-id {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 5px;
    }
    
    .order-number {
      font-size: 16px;
      font-weight: bold;
      color: #1e40af;
    }
    
    .order-status {
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 20px;
    }
    
    .order-status.pending {
      background: #fef3c7;
      color: #92400e;
    }
    
    .order-status.separated {
      background: #d1fae5;
      color: #065f46;
    }
    
    .order-meta {
      display: flex;
      gap: 15px;
      font-size: 10px;
      color: #666;
    }
    
    .order-content {
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 15px;
      padding: 15px;
    }
    
    .customer-info h4, .products-list h4 {
      font-size: 11px;
      color: #374151;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .customer-details {
      font-size: 10px;
      background: #fafafa;
      padding: 10px;
      border-radius: 4px;
    }
    
    .customer-details p {
      margin: 3px 0;
    }
    
    .customer-details hr {
      border: none;
      border-top: 1px dashed #ddd;
      margin: 8px 0;
    }
    
    .product-name {
      font-weight: 500;
    }
    
    .packaging-info {
      background: #fef3c7;
      padding: 8px 15px;
      font-size: 11px;
      border-top: 1px solid #e5e7eb;
    }
    
    .order-footer {
      background: #f8fafc;
      padding: 12px 15px;
      border-top: 1px solid #e5e7eb;
    }
    
    .signature-area {
      display: flex;
      gap: 30px;
    }
    
    .signature-line p {
      font-size: 10px;
      margin: 5px 0;
      color: #666;
    }
    
    .observation-area {
      flex: 1;
    }
    
    .observation-area p {
      font-size: 10px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .obs-box {
      height: 30px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 9px;
      color: #666;
    }
    
    .footer p {
      margin: 2px 0;
    }
    
    .page-info {
      margin-top: 8px;
      font-style: italic;
    }
    
    .empty-message {
      text-align: center;
      padding: 50px;
      color: #666;
    }
    
    .empty-message h2 {
      font-size: 16px;
      margin-bottom: 10px;
    }
    
    .page-break-before {
      page-break-before: always;
    }
    
    .page-break-before-maybe {
      page-break-inside: avoid;
    }
    
    @media print {
      body { 
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .page {
        padding: 5mm;
      }
      
      .page-break-before {
        page-break-before: always;
      }
      
      .order-card {
        page-break-inside: avoid;
      }
    }
  `
}

function parseAddress(addressJson: string) {
  try {
    return JSON.parse(addressJson)
  } catch {
    return { street: addressJson }
  }
}

function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return ''
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return cnpj
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  }
  return phone
}
