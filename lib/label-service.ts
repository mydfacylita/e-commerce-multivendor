/**
 * LabelService - Serviço de Geração de Etiquetas Multi-Transportadora
 * 
 * Suporta:
 * - Entrega própria (HTML)
 * - Correios (PLP/Etiqueta oficial)
 * - Jadlog (API)
 * - Melhor Envio (API)
 */

import { prisma } from '@/lib/prisma'
import { formatOrderNumber } from '@/lib/order'

export interface OrderData {
  id: string
  buyerName: string | null
  buyerPhone: string | null
  buyerDocument: string | null
  shippingAddress: string
  shippingMethod: string | null
  shippingService: string | null
  shippingCarrier: string | null
  shippingLabel: string | null
  trackingCode: string | null
  total: any
  items: Array<{
    quantity: number
    product: {
      name: string
      weight: number | null
    }
  }>
  packagingBoxId: string | null
}

export interface CompanyConfig {
  nome: string
  cnpj: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string
}

export interface CorreiosCredentials {
  enabled: boolean
  usuario: string
  senha: string
  codigoAdministrativo: string
  cartaoPostagem: string
  cnpj: string
  cepOrigem: string
}

export interface LabelResult {
  success: boolean
  type: 'html' | 'pdf' | 'url' | 'zpl'
  data: string | Buffer
  contentType: string
  trackingCode?: string
  error?: string
}

export class LabelService {
  
  /**
   * Gera etiqueta baseado no método de envio do pedido
   */
  static async generateLabel(orderId: string): Promise<LabelResult> {
    // Buscar pedido com campos de frete
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                weight: true
              }
            }
          }
        }
      }
    }) as any // Type cast para incluir campos dinâmicos

    if (!order) {
      return {
        success: false,
        type: 'html',
        data: '',
        contentType: 'text/html',
        error: 'Pedido não encontrado'
      }
    }

    // Determinar método de envio
    const shippingMethod = (order.shippingMethod || 'propria').toLowerCase()

    console.log('[LabelService] Gerando etiqueta para método:', shippingMethod)

    switch (shippingMethod) {
      case 'correios':
        return await this.generateCorreiosLabel(order as any)
      
      case 'jadlog':
        return await this.generateJadlogLabel(order as any)
      
      case 'melhorenvio':
        return await this.generateMelhorEnvioLabel(order as any)
      
      case 'propria':
      case 'local':
      case 'retirada':
      default:
        return await this.generateOwnLabel(order as any)
    }
  }

  /**
   * Gera etiqueta HTML para entrega própria
   */
  static async generateOwnLabel(order: OrderData): Promise<LabelResult> {
    // Buscar embalagem
    let packaging = null
    if (order.packagingBoxId) {
      packaging = await (prisma as any).packagingBox.findUnique({
        where: { id: order.packagingBoxId }
      })
    }

    // Buscar configurações da empresa
    const company = await this.getCompanyConfig()

    // Parse do endereço
    let destino: any = {}
    try {
      destino = JSON.parse(order.shippingAddress)
    } catch {
      destino = { street: order.shippingAddress }
    }

    // Calcular peso total
    const pesoTotal = order.items.reduce((acc, item) => {
      return acc + (item.product.weight || 0.3) * item.quantity
    }, 0)

    const html = this.renderOwnLabelHTML(order, company, destino, packaging, pesoTotal)

    return {
      success: true,
      type: 'html',
      data: html,
      contentType: 'text/html; charset=utf-8'
    }
  }

  /**
   * Gera etiqueta via API dos Correios
   * Se tem pré-postagem, usa o PDF oficial. Senão, gera etiqueta visual.
   */
  static async generateCorreiosLabel(order: OrderData): Promise<LabelResult> {
    try {
      // Verificar se tem ID da pré-postagem (etiqueta já foi gerada na API)
      if ((order as any).correiosIdPrePostagem) {
        console.log('[LabelService] Usando PDF oficial dos Correios')
        
        // Importar correiosCWS dinamicamente para evitar dependência circular
        const { correiosCWS } = await import('@/lib/correios-cws')
        
        const resultado = await correiosCWS.gerarEtiqueta(
          (order as any).correiosIdPrePostagem, 
          order.trackingCode || undefined
        )
        
        if (resultado.success && resultado.pdfBuffer) {
          return {
            success: true,
            type: 'pdf',
            data: resultado.pdfBuffer,
            contentType: 'application/pdf'
          }
        }
        
        console.log('[LabelService] Falha ao gerar PDF oficial, usando etiqueta visual:', resultado.error)
      }
      
      // Buscar credenciais Correios
      const correiosConfig = await this.getCorreiosCredentials()
      
      // Fallback: gera etiqueta visual HTML
      if (!correiosConfig.enabled) {
        console.log('[LabelService] Correios API desabilitada, usando etiqueta visual Correios')
      }

      // Gera etiqueta no padrão Correios (com ou sem código de rastreio)
      return await this.generateCorreiosStyleLabel(order)
      
    } catch (error) {
      console.error('[LabelService] Erro ao gerar etiqueta Correios:', error)
      return {
        success: false,
        type: 'html',
        data: '',
        contentType: 'text/html',
        error: 'Erro ao gerar etiqueta dos Correios'
      }
    }
  }

  /**
   * Gera etiqueta no padrão visual oficial dos Correios (100x125mm)
   */
  static async generateCorreiosStyleLabel(order: OrderData): Promise<LabelResult> {
    const company = await this.getCompanyConfig()
    let destino: any = {}
    try {
      destino = JSON.parse(order.shippingAddress)
    } catch {
      destino = { street: order.shippingAddress }
    }

    // Calcular peso total
    const pesoTotal = order.items.reduce((acc, item) => {
      return acc + (item.product.weight || 0.3) * item.quantity
    }, 0)

    // Buscar embalagem
    let packaging = null
    if (order.packagingBoxId) {
      packaging = await (prisma as any).packagingBox.findUnique({
        where: { id: order.packagingBoxId }
      })
    }

    // Buscar logo da empresa
    const logoConfig = await prisma.systemConfig.findFirst({
      where: { key: { in: ['app.logo', 'appearance.logo'] } }
    })
    const logoUrl = logoConfig?.value || '/logo.png'

    // Determinar serviço e cores
    const servico = (order.shippingService || 'PAC').toUpperCase()
    const isSedex = servico.includes('SEDEX')
    const servicoColor = isSedex ? '#7B1FA2' : '#1565C0' // Roxo para SEDEX, Azul para PAC

    // Formatar CEP
    const formatCep = (cep: string) => {
      if (!cep) return ''
      const clean = cep.replace(/\D/g, '')
      return clean.length === 8 ? `${clean.slice(0,5)}-${clean.slice(5)}` : cep
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiqueta Correios - ${order.trackingCode || formatOrderNumber(order.id)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      padding: 10mm;
      background: #f0f0f0;
    }
    .label {
      width: 100mm;
      height: 125mm;
      background: #fff;
      border: 1px solid #000;
      position: relative;
      overflow: hidden;
    }
    
    /* Header - 20mm altura */
    .header {
      height: 20mm;
      border-bottom: 1px solid #000;
      display: flex;
    }
    .header-left {
      width: 20mm;
      padding: 2mm;
      display: flex;
      align-items: center;
      justify-content: center;
      border-right: 1px solid #ccc;
    }
    .header-left img {
      max-width: 16mm;
      max-height: 16mm;
      object-fit: contain;
    }
    .header-center {
      width: 32mm;
      padding: 2mm;
      display: flex;
      align-items: center;
      justify-content: center;
      border-right: 1px solid #ccc;
    }
    .qr-placeholder {
      width: 16mm;
      height: 16mm;
      background: #f5f5f5;
      border: 1px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 6pt;
      color: #999;
    }
    .header-right {
      flex: 1;
      padding: 2mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .correios-badge {
      background: linear-gradient(135deg, #FFCC00 0%, #FFB300 100%);
      border-radius: 50%;
      width: 14mm;
      height: 14mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .correios-badge::before {
      content: "📮";
      font-size: 20pt;
    }
    .header-info {
      font-size: 7pt;
      line-height: 1.3;
    }
    .header-info .contrato {
      font-size: 6pt;
      color: #666;
    }
    .volume-info {
      position: absolute;
      right: 2mm;
      top: 2mm;
      font-size: 8pt;
      font-weight: bold;
    }

    /* Código de rastreio - 50mm */
    .tracking-section {
      height: 50mm;
      border-bottom: 1px solid #000;
      padding: 3mm;
      text-align: center;
    }
    .tracking-code {
      font-family: 'Courier New', monospace;
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 2px;
      margin-bottom: 2mm;
    }
    .barcode {
      height: 20mm;
      margin: 2mm auto;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .barcode-img {
      height: 100%;
    }
    .barcode-placeholder {
      width: 80mm;
      height: 18mm;
      background: repeating-linear-gradient(
        90deg,
        #000 0px, #000 2px,
        #fff 2px, #fff 4px,
        #000 4px, #000 5px,
        #fff 5px, #fff 8px,
        #000 8px, #000 10px,
        #fff 10px, #fff 11px
      );
    }
    .receiver-line {
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      margin-top: 2mm;
      padding-top: 2mm;
      border-top: 1px dotted #ccc;
    }
    .receiver-field {
      flex: 1;
      border-bottom: 1px solid #999;
      margin: 0 2mm;
      min-width: 20mm;
    }

    /* Destinatário - 40mm */
    .destinatario {
      height: 40mm;
      border-bottom: 1px solid #000;
      display: flex;
    }
    .dest-address {
      flex: 1;
      padding: 2mm 3mm;
    }
    .dest-title {
      background: #333;
      color: #fff;
      font-size: 8pt;
      font-weight: bold;
      padding: 1mm 2mm;
      margin-bottom: 1mm;
    }
    .dest-name {
      font-size: 10pt;
      font-weight: bold;
      margin-bottom: 1mm;
    }
    .dest-line {
      font-size: 8pt;
      line-height: 1.4;
    }
    .dest-cep {
      font-size: 11pt;
      font-weight: bold;
      margin-top: 1mm;
    }
    .dest-cep-barcode {
      height: 10mm;
      margin-top: 1mm;
    }
    .dest-cep-barcode svg {
      height: 100%;
      width: auto;
    }
    .dest-city {
      font-size: 9pt;
      font-weight: bold;
      margin-top: 1mm;
    }
    .dest-datamatrix {
      width: 18mm;
      padding: 2mm;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .datamatrix-box {
      width: 14mm;
      height: 14mm;
      background: #f5f5f5;
      border: 1px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 5pt;
      color: #999;
    }

    /* Remetente - 15mm */
    .remetente {
      height: 15mm;
      padding: 2mm 3mm;
      font-size: 7pt;
      line-height: 1.3;
      background: #fafafa;
    }
    .rem-title {
      font-weight: bold;
      font-size: 8pt;
    }
    .rem-cep {
      font-weight: bold;
    }

    /* Serviço badge */
    .servico-badge {
      position: absolute;
      top: 22mm;
      right: 3mm;
      background: ${servicoColor};
      color: #fff;
      padding: 1mm 3mm;
      font-size: 10pt;
      font-weight: bold;
      border-radius: 2px;
    }

    @media print {
      body { 
        padding: 0; 
        background: #fff; 
        margin: 0;
      }
      .no-print { display: none !important; }
      .label {
        border: none;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 10px;">
    <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #FFCC00; border: 2px solid #333; border-radius: 5px; font-weight: bold;">
      🖨️ Imprimir Etiqueta
    </button>
    <span style="margin-left: 10px; color: #666; font-size: 12px;">Tamanho: 100x125mm</span>
  </div>

  <div class="label">
    <!-- Serviço Badge -->
    <div class="servico-badge">${servico}</div>
    
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <img src="${logoUrl}" alt="MYDSHOP" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'font-size:8pt;font-weight:bold;color:#333;\\'>MYDSHOP</div>'">
      </div>
      <div class="header-center">
        <div class="qr-placeholder">QR Code</div>
      </div>
      <div class="header-right">
        <div class="correios-badge"></div>
      </div>
      <div class="volume-info">Volume: 1/1</div>
    </div>

    <!-- Tracking Section -->
    <div class="tracking-section">
      <div class="tracking-code">${order.trackingCode || 'AGUARDANDO POSTAGEM'}</div>
      <div class="barcode">
        ${order.trackingCode 
          ? `<div class="barcode-placeholder"></div>`
          : `<div style="color: #999; font-size: 10pt;">Código de barras será gerado na postagem</div>`
        }
      </div>
      <div class="receiver-line">
        <span>Recebedor:</span><span class="receiver-field"></span>
        <span>Assinatura:</span><span class="receiver-field"></span>
        <span>Doc:</span><span class="receiver-field" style="width: 15mm;"></span>
      </div>
    </div>

    <!-- Destinatário -->
    <div class="destinatario">
      <div class="dest-address">
        <div class="dest-title">DESTINATÁRIO</div>
        <div class="dest-name">${order.buyerName || 'Cliente'}</div>
        <div class="dest-line">${destino.street || ''}${destino.number ? ', ' + destino.number : ''}</div>
        <div class="dest-line">${destino.neighborhood || ''}</div>
        ${destino.complement ? `<div class="dest-line">${destino.complement}</div>` : ''}
        <div class="dest-cep">${formatCep(destino.zipCode)}</div>
        <div class="dest-cep-barcode">
          <svg id="barcode-cep"></svg>
        </div>
        <div class="dest-city">${destino.city || ''} / ${destino.state || ''}</div>
      </div>
      <div class="dest-datamatrix">
        <svg id="barcode-cep-vertical"></svg>
      </div>
    </div>

    <!-- Remetente -->
    <div class="remetente">
      <span class="rem-title">Remetente:</span> ${company.nome}<br>
      ${company.endereco}<br>
      <span class="rem-cep">${formatCep(company.cep)}</span> ${company.cidade}/${company.estado}
    </div>
  </div>

  <div class="no-print" style="margin-top: 10px; font-size: 11px; color: #666;">
    <strong>Pedido:</strong> ${formatOrderNumber(order.id)} | 
    <strong>Peso:</strong> ${pesoTotal.toFixed(2)} kg |
    ${packaging ? `<strong>Embalagem:</strong> ${packaging.code} |` : ''}
    <strong>Itens:</strong> ${order.items.reduce((acc, i) => acc + i.quantity, 0)}
  </div>

  <!-- JsBarcode CDN -->
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js"></script>
  <script>
    // Gerar código de barras do CEP (horizontal)
    try {
      JsBarcode("#barcode-cep", "${(destino.zipCode || '').replace(/\D/g, '')}", {
        format: "CODE128",
        width: 1.5,
        height: 30,
        displayValue: false,
        margin: 0
      });
    } catch(e) { console.log('Erro barcode CEP:', e); }

    // Gerar código de barras do CEP (vertical/datamatrix area)
    try {
      JsBarcode("#barcode-cep-vertical", "${(destino.zipCode || '').replace(/\D/g, '')}", {
        format: "CODE128",
        width: 1,
        height: 50,
        displayValue: false,
        margin: 0
      });
    } catch(e) { console.log('Erro barcode vertical:', e); }
  </script>
</body>
</html>
    `

    return {
      success: true,
      type: 'html',
      data: html,
      contentType: 'text/html; charset=utf-8',
      trackingCode: order.trackingCode || undefined
    }
  }

  /**
   * Gera etiqueta via API Jadlog (placeholder)
   */
  static async generateJadlogLabel(order: OrderData): Promise<LabelResult> {
    // TODO: Implementar integração com Jadlog
    console.log('[LabelService] Jadlog ainda não implementado, usando etiqueta própria estilizada')
    
    const company = await this.getCompanyConfig()
    let destino: any = {}
    try {
      destino = JSON.parse(order.shippingAddress)
    } catch {
      destino = { street: order.shippingAddress }
    }

    const pesoTotal = order.items.reduce((acc, item) => {
      return acc + (item.product.weight || 0.3) * item.quantity
    }, 0)

    let packaging = null
    if (order.packagingBoxId) {
      packaging = await (prisma as any).packagingBox.findUnique({
        where: { id: order.packagingBoxId }
      })
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiqueta Jadlog - ${formatOrderNumber(order.id)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      padding: 5mm;
      background: #f5f5f5;
    }
    .label {
      width: 100mm;
      height: 140mm;
      background: #fff;
      border: 2px solid #000;
      position: relative;
      page-break-after: always;
    }
    .jadlog-header {
      background: #e31e24;
      padding: 3mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
    }
    .jadlog-logo {
      font-size: 18pt;
      font-weight: bold;
      color: #fff;
    }
    .servico-badge {
      background: #fff;
      color: #e31e24;
      padding: 2mm 4mm;
      font-size: 12pt;
      font-weight: bold;
      border-radius: 3px;
    }
    .section {
      padding: 3mm;
      border-bottom: 1px solid #ccc;
    }
    .section-title {
      font-size: 8pt;
      font-weight: bold;
      color: #666;
      margin-bottom: 1mm;
    }
    .address {
      font-size: 10pt;
      line-height: 1.4;
    }
    .address .name {
      font-weight: bold;
      font-size: 12pt;
    }
    .address .cep {
      font-size: 16pt;
      font-weight: bold;
      color: #e31e24;
      margin-top: 2mm;
    }
    .destinatario {
      background: #fff8f8;
      min-height: 50mm;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 2mm 3mm;
      border-bottom: 1px solid #eee;
    }
    .info-item {
      text-align: center;
    }
    .info-item .label {
      font-size: 7pt;
      color: #666;
      width: auto;
      border: none;
      height: auto;
      background: none;
    }
    .info-item .value {
      font-size: 11pt;
      font-weight: bold;
    }
    .tracking-section {
      text-align: center;
      padding: 3mm;
      background: #f5f5f5;
    }
    .tracking-code {
      font-family: monospace;
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 3px;
    }
    .barcode-placeholder {
      height: 15mm;
      background: linear-gradient(90deg, #000 2px, transparent 2px);
      background-size: 4px 100%;
      margin: 2mm 0;
    }
    .footer-info {
      font-size: 7pt;
      color: #666;
      text-align: center;
      padding: 2mm;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom: 10px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #e31e24; color: #fff; border: none; border-radius: 5px;">
    🖨️ Imprimir Etiqueta Jadlog
  </button>

  <div class="label">
    <!-- Header Jadlog -->
    <div class="jadlog-header">
      <div class="jadlog-logo">🚚 JADLOG</div>
      <div class="servico-badge">${order.shippingService || 'EXPRESSO'}</div>
    </div>

    <!-- Remetente -->
    <div class="section">
      <div class="section-title">REMETENTE</div>
      <div class="address">
        <div>${company.nome}</div>
        <div>${company.endereco}</div>
        <div>${company.cidade} - ${company.estado}</div>
        <div>CEP: ${company.cep}</div>
      </div>
    </div>

    <!-- Destinatário -->
    <div class="section destinatario">
      <div class="section-title">DESTINATÁRIO</div>
      <div class="address">
        <div class="name">${order.buyerName || 'Cliente'}</div>
        <div>${destino.street || '-'}${destino.number ? ', ' + destino.number : ''}</div>
        ${destino.complement ? `<div>${destino.complement}</div>` : ''}
        <div>${destino.neighborhood || '-'}</div>
        <div>${destino.city || '-'} / ${destino.state || '-'}</div>
        <div class="cep">CEP: ${destino.zipCode || '-'}</div>
        ${order.buyerPhone ? `<div style="font-size: 9pt; color: #666;">Tel: ${order.buyerPhone}</div>` : ''}
      </div>
    </div>

    <!-- Info do pedido -->
    <div class="info-row">
      <div class="info-item">
        <div class="label">PEDIDO</div>
        <div class="value">${formatOrderNumber(order.id)}</div>
      </div>
      <div class="info-item">
        <div class="label">PESO</div>
        <div class="value">${pesoTotal.toFixed(2)} kg</div>
      </div>
      ${packaging ? `
      <div class="info-item">
        <div class="label">CAIXA</div>
        <div class="value">${packaging.code}</div>
      </div>
      ` : ''}
      <div class="info-item">
        <div class="label">VOLUMES</div>
        <div class="value">1/1</div>
      </div>
    </div>

    <!-- Código de rastreio -->
    ${order.trackingCode ? `
    <div class="tracking-section">
      <div style="font-size: 8pt; color: #666;">CÓDIGO DE RASTREIO</div>
      <div class="barcode-placeholder"></div>
      <div class="tracking-code">${order.trackingCode}</div>
    </div>
    ` : `
    <div class="tracking-section">
      <div style="color: #999; font-style: italic;">Código de rastreio será gerado na coleta</div>
    </div>
    `}

    <!-- Footer -->
    <div class="footer-info">
      Impresso em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
    </div>
  </div>
</body>
</html>
    `

    return {
      success: true,
      type: 'html',
      data: html,
      contentType: 'text/html; charset=utf-8'
    }
  }

  /**
   * Gera etiqueta via API Melhor Envio
   */
  static async generateMelhorEnvioLabel(order: OrderData): Promise<LabelResult> {
    try {
      // Buscar configuração do Melhor Envio
      const config = await prisma.systemConfig.findFirst({
        where: { key: 'melhorenvio.token' }
      })

      if (!config?.value) {
        console.log('[LabelService] Melhor Envio não configurado, usando etiqueta própria')
        return await this.generateOwnLabel(order)
      }

      // Verificar se já tem etiqueta gerada
      if (order.shippingLabel) {
        // Se é uma URL, retorna direto
        if (order.shippingLabel.startsWith('http')) {
          return {
            success: true,
            type: 'url',
            data: order.shippingLabel,
            contentType: 'application/pdf'
          }
        }
      }

      // TODO: Implementar chamada à API do Melhor Envio para gerar etiqueta
      console.log('[LabelService] API Melhor Envio pendente de implementação')
      return await this.generateOwnLabel(order)

    } catch (error) {
      console.error('[LabelService] Erro ao gerar etiqueta Melhor Envio:', error)
      return {
        success: false,
        type: 'html',
        data: '',
        contentType: 'text/html',
        error: 'Erro ao gerar etiqueta do Melhor Envio'
      }
    }
  }

  /**
   * Render HTML para etiqueta própria
   */
  static renderOwnLabelHTML(
    order: OrderData, 
    company: CompanyConfig, 
    destino: any, 
    packaging: any, 
    pesoTotal: number
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiqueta - Pedido ${formatOrderNumber(order.id)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 10mm; }
    .label { 
      width: 100mm; 
      border: 2px solid #000; 
      padding: 5mm;
      page-break-after: always;
    }
    .header { 
      text-align: center; 
      border-bottom: 2px solid #000; 
      padding-bottom: 3mm;
      margin-bottom: 3mm;
    }
    .header h1 { font-size: 14pt; }
    .header p { font-size: 8pt; color: #666; }
    .entrega-badge {
      display: inline-block;
      background: #10b981;
      color: #fff;
      padding: 2mm 4mm;
      font-size: 10pt;
      font-weight: bold;
      border-radius: 3px;
      margin-top: 2mm;
    }
    .section { margin-bottom: 4mm; }
    .section-title { 
      font-size: 8pt; 
      font-weight: bold; 
      background: #000; 
      color: #fff; 
      padding: 1mm 2mm;
      margin-bottom: 2mm;
    }
    .address { font-size: 10pt; line-height: 1.4; }
    .address .name { font-weight: bold; font-size: 12pt; }
    .address .cep { font-size: 14pt; font-weight: bold; }
    .info-grid { display: flex; justify-content: space-between; }
    .info-box { 
      border: 1px solid #000; 
      padding: 2mm; 
      text-align: center;
      flex: 1;
      margin: 0 1mm;
    }
    .info-box:first-child { margin-left: 0; }
    .info-box:last-child { margin-right: 0; }
    .info-box .label { font-size: 7pt; border: none; padding: 0; width: auto; }
    .info-box .value { font-size: 12pt; font-weight: bold; }
    .barcode { 
      text-align: center; 
      margin-top: 4mm;
      padding-top: 4mm;
      border-top: 1px dashed #000;
    }
    .barcode .code { font-family: monospace; font-size: 14pt; letter-spacing: 2px; }
    .items { font-size: 8pt; }
    .items table { width: 100%; border-collapse: collapse; }
    .items th, .items td { border: 1px solid #ccc; padding: 1mm; text-align: left; }
    .items th { background: #f0f0f0; }
    .footer { 
      text-align: center; 
      font-size: 8pt; 
      color: #666;
      margin-top: 3mm;
      padding-top: 3mm;
      border-top: 1px solid #ccc;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom: 10px; padding: 10px 20px; font-size: 16px; cursor: pointer;">
    🖨️ Imprimir Etiqueta
  </button>

  <div class="label">
    <div class="header">
      <h1>${company.nome || 'E-Commerce'}</h1>
      <p>CNPJ: ${company.cnpj || '-'} | Tel: ${company.telefone || '-'}</p>
      <div class="entrega-badge">🚚 ENTREGA PRÓPRIA</div>
    </div>

    <div class="section">
      <div class="section-title">REMETENTE</div>
      <div class="address">
        <div>${company.nome || 'Remetente'}</div>
        <div>${company.endereco || '-'}</div>
        <div>${company.cidade || '-'} - ${company.estado || '-'}</div>
        <div class="cep">CEP: ${company.cep || '-'}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">DESTINATÁRIO</div>
      <div class="address">
        <div class="name">${order.buyerName || 'Cliente'}</div>
        <div>${destino.street || '-'}${destino.number ? ', ' + destino.number : ''}</div>
        ${destino.complement ? `<div>${destino.complement}</div>` : ''}
        <div>${destino.neighborhood || '-'}</div>
        <div>${destino.city || '-'} - ${destino.state || '-'}</div>
        <div class="cep">CEP: ${destino.zipCode || '-'}</div>
        ${order.buyerPhone ? `<div>Tel: ${order.buyerPhone}</div>` : ''}
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <div class="label">PEDIDO</div>
        <div class="value">${formatOrderNumber(order.id)}</div>
      </div>
      <div class="info-box">
        <div class="label">PESO</div>
        <div class="value">${pesoTotal.toFixed(2)} kg</div>
      </div>
      ${packaging ? `
      <div class="info-box">
        <div class="label">EMBALAGEM</div>
        <div class="value">${packaging.code}</div>
      </div>
      ` : ''}
      <div class="info-box">
        <div class="label">ITENS</div>
        <div class="value">${order.items.reduce((acc, i) => acc + i.quantity, 0)}</div>
      </div>
    </div>

    ${order.trackingCode ? `
    <div class="barcode">
      <div>CÓDIGO DE RASTREIO</div>
      <div class="code">${order.trackingCode}</div>
    </div>
    ` : ''}

    <div class="section items" style="margin-top: 4mm;">
      <div class="section-title">CONTEÚDO</div>
      <table>
        <tr>
          <th>Produto</th>
          <th style="width: 30px;">Qtd</th>
        </tr>
        ${order.items.map(item => `
        <tr>
          <td>${item.product.name.substring(0, 40)}${item.product.name.length > 40 ? '...' : ''}</td>
          <td style="text-align: center;">${item.quantity}</td>
        </tr>
        `).join('')}
      </table>
    </div>

    <div class="footer">
      Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
    </div>
  </div>
</body>
</html>
    `
  }

  /**
   * Buscar configurações da empresa
   */
  static async getCompanyConfig(): Promise<CompanyConfig> {
    // Primeiro tentar buscar de companySettings (tabela principal)
    const companySettings = await prisma.companySettings.findFirst()
    
    if (companySettings) {
      // Buscar CEP de origem dos Correios se disponível (sobrescreve o da empresa)
      const cepConfig = await prisma.systemConfig.findFirst({
        where: { key: 'correios.cepOrigem' }
      })
      
      return {
        nome: companySettings.name || 'E-Commerce',
        cnpj: companySettings.cnpj || '',
        endereco: companySettings.address || '',
        cidade: companySettings.city || 'São Luís',
        estado: companySettings.state || 'MA',
        cep: cepConfig?.value || companySettings.zipCode || '65067-380',
        telefone: companySettings.phone || ''
      }
    }
    
    // Fallback para systemConfig (modo antigo)
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ['empresa.nome', 'empresa.cnpj', 'empresa.endereco', 'empresa.cidade', 
               'empresa.estado', 'empresa.cep', 'empresa.telefone', 'correios.cepOrigem']
        }
      }
    })

    const configMap: Record<string, string> = {}
    configs.forEach(c => {
      configMap[c.key] = c.value
    })

    return {
      nome: configMap['empresa.nome'] || 'E-Commerce',
      cnpj: configMap['empresa.cnpj'] || '',
      endereco: configMap['empresa.endereco'] || '',
      cidade: configMap['empresa.cidade'] || '',
      estado: configMap['empresa.estado'] || '',
      cep: configMap['correios.cepOrigem'] || configMap['empresa.cep'] || '',
      telefone: configMap['empresa.telefone'] || ''
    }
  }

  /**
   * Buscar credenciais Correios
   */
  static async getCorreiosCredentials(): Promise<CorreiosCredentials> {
    const config = await prisma.systemConfig.findFirst({
      where: { key: 'correios.config' }
    })

    if (config?.value) {
      try {
        return JSON.parse(config.value)
      } catch {
        // Retorna padrão desabilitado
      }
    }

    return {
      enabled: false,
      usuario: '',
      senha: '',
      codigoAdministrativo: '',
      cartaoPostagem: '',
      cnpj: '',
      cepOrigem: ''
    }
  }

  /**
   * Código do serviço Correios
   */
  static getCorreiosServiceCode(servico: string): string {
    const codes: Record<string, string> = {
      'SEDEX': '04014',
      'PAC': '04510',
      'SEDEX 10': '40215',
      'SEDEX 12': '40169',
      'SEDEX HOJE': '40290',
    }
    return codes[servico.toUpperCase()] || '04510'
  }
}
