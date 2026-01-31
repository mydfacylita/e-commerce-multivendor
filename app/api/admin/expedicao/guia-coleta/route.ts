import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET - Gerar guia de coleta com pedidos prontos para envio
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'packed' // packed = pronto para coleta, shipped = já despachados
    const orderIds = searchParams.get('ids')?.split(',').filter(Boolean) || []
    const carrier = searchParams.get('carrier') // Filtrar por transportadora específica

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
    let whereCondition: any = {}

    // Filtrar por IDs específicos ou por status
    if (orderIds.length > 0) {
      whereCondition.id = { in: orderIds }
    } else {
      switch (status) {
        case 'packed':
          // Pedidos embalados aguardando coleta
          whereCondition.packedAt = { not: null }
          whereCondition.shippedAt = null
          break
        case 'shipped':
          // Pedidos já despachados (para relatório)
          whereCondition.shippedAt = { not: null }
          break
        case 'ready':
          // Todos prontos (embalados + despachados)
          whereCondition.packedAt = { not: null }
          break
      }
    }

    // Filtrar por transportadora se especificada
    if (carrier) {
      whereCondition.OR = [
        { shippingCarrier: carrier },
        { shippingMethod: carrier }
      ]
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
                weight: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Buscar embalagens para os pedidos
    const packagingBoxIds = orders
      .map(o => (o as any).packagingBoxId)
      .filter((id): id is string => id !== null && id !== undefined)
    
    let packagingBoxes: any[] = []
    if (packagingBoxIds.length > 0) {
      packagingBoxes = await (prisma as any).packagingBox.findMany({
        where: { id: { in: packagingBoxIds } }
      })
    }
    
    const packagingBoxMap = new Map(packagingBoxes.map((p: any) => [p.id, p]))

    // Adicionar embalagem aos pedidos
    const ordersWithPackaging = orders.map(order => ({
      ...order,
      packagingBox: (order as any).packagingBoxId ? packagingBoxMap.get((order as any).packagingBoxId) : null
    }))

    if (ordersWithPackaging.length === 0) {
      return new NextResponse(generateEmptyGuide(company, logoUrl, carrier), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    // Gerar HTML da guia de coleta
    const html = generateCollectionGuide(ordersWithPackaging, company, logoUrl, carrier)

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })

  } catch (error) {
    console.error('Erro ao gerar guia de coleta:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function generateEmptyGuide(company: any, logoUrl: string, carrier: string | null): string {
  const carrierText = carrier ? ` - ${carrier}` : ''
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Guia de Coleta${carrierText} - ${company?.name || 'MYDSHOP'}</title>
  <style>
    ${getStyles()}
  </style>
</head>
<body>
  <div class="page">
    ${generateHeader(company, logoUrl)}
    <div class="empty-message">
      <h2>Nenhum pedido pronto para coleta${carrier ? ` (${carrier})` : ''}</h2>
      <p>Embale os pedidos separados para gerar a guia de coleta.</p>
    </div>
  </div>
</body>
</html>
`
}

function generateCollectionGuide(orders: any[], company: any, logoUrl: string, carrier: string | null): string {
  const now = new Date()
  const dataHora = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const carrierText = carrier ? ` - ${carrier}` : ''
  
  // Separar pedidos por status
  const pedidosParaColeta = orders.filter(o => !o.shippedAt)
  const pedidosDespachados = orders.filter(o => o.shippedAt)
  
  // Calcular totais
  const totalPedidos = pedidosParaColeta.length
  const totalPesoColeta = pedidosParaColeta.reduce((acc, order) => {
    const peso = order.items.reduce((sum: number, item: any) => 
      sum + (item.product.weight || 0.3) * item.quantity, 0)
    return acc + peso
  }, 0)
  const totalValorColeta = pedidosParaColeta.reduce((acc, order) => acc + order.total, 0)

  // Agrupar por CEP de destino para otimizar rota
  const byRegion: { [key: string]: any[] } = {}
  pedidosParaColeta.forEach(order => {
    const address = parseAddress(order.shippingAddress)
    const region = address.state || 'Outros'
    if (!byRegion[region]) byRegion[region] = []
    byRegion[region].push(order)
  })

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Guia de Coleta${carrierText} - ${company?.name || 'MYDSHOP'}</title>
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
        <h1>🚚 GUIA DE COLETA${carrier ? ` <span style="color: #059669; font-size: 0.8em;">(${carrier})</span>` : ''}</h1>
        <p class="doc-date">Gerado em: ${dataHora}</p>
      </div>
      <div class="doc-summary">
        <div class="summary-item">
          <span class="summary-value">${totalPedidos}</span>
          <span class="summary-label">Pacotes</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">${totalPesoColeta.toFixed(2)} kg</span>
          <span class="summary-label">Peso Total</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">R$ ${totalValorColeta.toFixed(2)}</span>
          <span class="summary-label">Valor Total</span>
        </div>
      </div>
    </div>

    <!-- Resumo para Conferência na Coleta -->
    <div class="section">
      <h2 class="section-title">📋 LISTA DE VOLUMES PARA COLETA</h2>
      <table class="collection-table">
        <thead>
          <tr>
            <th style="width: 40px;">Nº</th>
            <th style="width: 100px;">Pedido</th>
            <th>Destinatário</th>
            <th style="width: 120px;">Cidade/UF</th>
            <th style="width: 80px;">CEP</th>
            <th style="width: 80px;">Embalagem</th>
            <th style="width: 70px;">Peso</th>
            <th style="width: 40px;">✓</th>
          </tr>
        </thead>
        <tbody>
          ${pedidosParaColeta.map((order, index) => {
            const address = parseAddress(order.shippingAddress)
            const peso = order.items.reduce((sum: number, item: any) => 
              sum + (item.product.weight || 0.3) * item.quantity, 0)
            
            return `
            <tr>
              <td class="center">${index + 1}</td>
              <td class="order-id">#${order.id.slice(-8).toUpperCase()}</td>
              <td>${order.buyerName}</td>
              <td>${address.city || '-'}/${address.state || '-'}</td>
              <td class="center">${address.zipCode || '-'}</td>
              <td class="center emb-code">${order.packagingBox?.code || '-'}</td>
              <td class="center">${peso.toFixed(2)}kg</td>
              <td class="check-cell">☐</td>
            </tr>
            `
          }).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="6" class="text-right"><strong>TOTAL:</strong></td>
            <td class="center"><strong>${totalPesoColeta.toFixed(2)}kg</strong></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Detalhes por Região -->
    <div class="section page-break-before">
      <h2 class="section-title">📍 DETALHES POR REGIÃO</h2>
      
      ${Object.entries(byRegion).map(([region, regionOrders]) => `
        <div class="region-section">
          <h3 class="region-title">${region} (${regionOrders.length} ${regionOrders.length === 1 ? 'pacote' : 'pacotes'})</h3>
          <div class="packages-grid">
            ${regionOrders.map((order: any) => {
              const address = parseAddress(order.shippingAddress)
              const peso = order.items.reduce((sum: number, item: any) => 
                sum + (item.product.weight || 0.3) * item.quantity, 0)
              const dims = order.packagingBox 
                ? `${order.packagingBox.outerLength}x${order.packagingBox.outerWidth}x${order.packagingBox.outerHeight}cm`
                : '-'
              
              return `
              <div class="package-card">
                <div class="package-header">
                  <span class="package-id">#${order.id.slice(-8).toUpperCase()}</span>
                  <span class="package-emb">${order.packagingBox?.code || '-'}</span>
                </div>
                <div class="package-dest">
                  <strong>${order.buyerName}</strong>
                  <p>${address.street}, ${address.number || 'S/N'}</p>
                  ${address.complement ? `<p>${address.complement}</p>` : ''}
                  <p>${address.neighborhood || ''}</p>
                  <p>${address.city || ''} - ${address.state || ''}</p>
                  <p class="cep"><strong>CEP: ${address.zipCode || '-'}</strong></p>
                </div>
                <div class="package-info">
                  <span>📦 ${dims}</span>
                  <span>⚖️ ${peso.toFixed(2)}kg</span>
                  <span>💰 R$ ${order.total.toFixed(2)}</span>
                </div>
                ${order.trackingCode ? `
                  <div class="tracking-code">
                    🔖 ${order.trackingCode}
                  </div>
                ` : ''}
              </div>
              `
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Área de Assinaturas -->
    <div class="section signatures-section">
      <h2 class="section-title">✍️ CONFIRMAÇÃO DE COLETA</h2>
      <div class="signatures-grid">
        <div class="signature-box">
          <p class="sig-label">Responsável pela Entrega:</p>
          <div class="sig-line"></div>
          <p class="sig-info">Nome: _________________________________</p>
          <p class="sig-info">Data/Hora: ____________________________</p>
        </div>
        <div class="signature-box">
          <p class="sig-label">Transportadora/Correios:</p>
          <div class="sig-line"></div>
          <p class="sig-info">Nome: _________________________________</p>
          <p class="sig-info">Matrícula: _____________________________</p>
        </div>
      </div>
      <div class="obs-section">
        <p><strong>Observações:</strong></p>
        <div class="obs-lines">
          <div class="obs-line"></div>
          <div class="obs-line"></div>
          <div class="obs-line"></div>
        </div>
      </div>
    </div>

    <!-- Rodapé -->
    <div class="footer">
      <p>${company?.name || 'MYDSHOP'} | CNPJ: ${formatCNPJ(company?.cnpj) || '-'}</p>
      <p>${company?.address || ''} | Tel: ${formatPhone(company?.phone) || '-'} | Email: ${company?.email || '-'}</p>
      <p class="page-info">Guia de Coleta - Gerado em ${dataHora} - Total: ${totalPedidos} pacotes | ${totalPesoColeta.toFixed(2)}kg</p>
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
      border-bottom: 3px solid #16a34a;
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
      color: #15803d;
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
      background: linear-gradient(135deg, #16a34a, #15803d);
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
      color: #15803d;
      padding: 8px 12px;
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      margin-bottom: 12px;
    }
    
    .collection-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    
    .collection-table th, .collection-table td {
      padding: 8px 10px;
      border: 1px solid #ddd;
      text-align: left;
    }
    
    .collection-table th {
      background: #f0fdf4;
      font-weight: bold;
      color: #15803d;
    }
    
    .collection-table tbody tr:nth-child(even) {
      background: #fafafa;
    }
    
    .collection-table tbody tr:hover {
      background: #f0fdf4;
    }
    
    .order-id {
      font-weight: bold;
      color: #15803d;
      font-family: monospace;
    }
    
    .emb-code {
      font-weight: bold;
      color: #2563eb;
    }
    
    .check-cell {
      text-align: center;
      font-size: 16px;
    }
    
    .center { text-align: center; }
    .text-right { text-align: right; }
    
    .total-row {
      background: #f0fdf4 !important;
      font-weight: bold;
    }
    
    .region-section {
      margin-bottom: 20px;
    }
    
    .region-title {
      font-size: 12px;
      color: #374151;
      padding: 6px 10px;
      background: #e5e7eb;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    
    .packages-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    
    .package-card {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 10px;
      font-size: 9px;
      background: #fafafa;
    }
    
    .package-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .package-id {
      font-weight: bold;
      font-size: 11px;
      color: #15803d;
      font-family: monospace;
    }
    
    .package-emb {
      background: #dbeafe;
      color: #1d4ed8;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 10px;
    }
    
    .package-dest {
      margin-bottom: 8px;
    }
    
    .package-dest p {
      margin: 2px 0;
      color: #666;
    }
    
    .package-dest .cep {
      color: #15803d;
      margin-top: 4px;
    }
    
    .package-info {
      display: flex;
      gap: 8px;
      font-size: 9px;
      color: #666;
      padding-top: 6px;
      border-top: 1px dashed #e5e7eb;
    }
    
    .tracking-code {
      margin-top: 6px;
      padding: 4px 6px;
      background: #fef3c7;
      border-radius: 4px;
      font-family: monospace;
      font-size: 9px;
      color: #92400e;
    }
    
    .signatures-section {
      page-break-inside: avoid;
    }
    
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 20px;
    }
    
    .signature-box {
      padding: 15px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
    }
    
    .sig-label {
      font-weight: bold;
      color: #374151;
      margin-bottom: 30px;
    }
    
    .sig-line {
      border-bottom: 1px solid #000;
      height: 40px;
      margin-bottom: 10px;
    }
    
    .sig-info {
      font-size: 10px;
      color: #666;
      margin: 5px 0;
    }
    
    .obs-section {
      padding: 15px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
    }
    
    .obs-lines {
      margin-top: 10px;
    }
    
    .obs-line {
      border-bottom: 1px solid #e5e7eb;
      height: 25px;
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
      
      .package-card {
        page-break-inside: avoid;
      }
      
      .signatures-section {
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
