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
  data: string
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
   */
  static async generateCorreiosLabel(order: OrderData): Promise<LabelResult> {
    try {
      // Buscar credenciais Correios
      const correiosConfig = await this.getCorreiosCredentials()
      
      if (!correiosConfig.enabled) {
        console.log('[LabelService] Correios desabilitado, usando etiqueta própria')
        return await this.generateOwnLabel(order)
      }

      // Se não tem código de rastreio, precisa gerar um range
      if (!order.trackingCode) {
        // Em produção: solicitar range de etiquetas via API Correios
        // Por ora, retorna erro para que o usuário gere manualmente
        console.log('[LabelService] Pedido sem código de rastreio, gerando etiqueta própria')
        return await this.generateCorreiosStyleLabel(order)
      }

      // Gera etiqueta no padrão Correios
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
   * Gera etiqueta no padrão visual dos Correios
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

    // Determinar serviço
    const servico = order.shippingService || 'PAC'
    const servicoCode = this.getCorreiosServiceCode(servico)

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Etiqueta Correios - #${order.id.slice(-8).toUpperCase()}</title>
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
    .correios-header {
      background: #ffd700;
      padding: 3mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
    }
    .correios-logo {
      font-size: 18pt;
      font-weight: bold;
      color: #003a70;
    }
    .servico-badge {
      background: #003a70;
      color: #fff;
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
      color: #003a70;
      margin-top: 2mm;
    }
    .destinatario {
      background: #fffef0;
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
    .nf-info {
      background: #e8f4e8;
      padding: 2mm 3mm;
      font-size: 8pt;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom: 10px; padding: 10px 20px; font-size: 16px; cursor: pointer; background: #ffd700; border: 2px solid #003a70; border-radius: 5px;">
    🖨️ Imprimir Etiqueta Correios
  </button>

  <div class="label">
    <!-- Header Correios -->
    <div class="correios-header">
      <div class="correios-logo">📮 CORREIOS</div>
      <div class="servico-badge">${servico}</div>
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
        <div class="value">#${order.id.slice(-8).toUpperCase()}</div>
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
      <div style="color: #999; font-style: italic;">Código de rastreio será gerado na postagem</div>
    </div>
    `}

    <!-- NF info -->
    <div class="nf-info">
      <strong>Conteúdo:</strong> ${order.items.length} item(s) - 
      ${order.items.map(i => `${i.product.name.substring(0, 20)} x${i.quantity}`).join(', ').substring(0, 80)}...
    </div>

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
  <title>Etiqueta Jadlog - #${order.id.slice(-8).toUpperCase()}</title>
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
        <div class="value">#${order.id.slice(-8).toUpperCase()}</div>
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
  <title>Etiqueta - Pedido #${order.id.slice(-8).toUpperCase()}</title>
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
        <div class="value">#${order.id.slice(-8).toUpperCase()}</div>
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
