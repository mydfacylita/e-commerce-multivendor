import { parseStringPromise } from 'xml2js'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { prisma } from './prisma'

/**
 * Gerador de DANFE conforme especificação oficial SEFAZ
 * Manual de Orientação ao Contribuinte - MOC
 * Layout A4 Retrato
 */

function formatarChaveAcesso(chave: string): string {
  // Formato: 9999 9999 9999 9999 9999 9999 9999 9999 9999 9999 9999
  return chave.match(/.{1,4}/g)?.join(' ') || chave
}

function formatarMoeda(valor: string | number): string {
  const num = typeof valor === 'string' ? parseFloat(valor) : valor
  return num.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  })
}

function formatarCNPJ(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function formatarCPF(cpf: string): string {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

function formatarData(data: string): string {
  // De 2026-01-18T22:54:05-03:00 para 18/01/2026 22:54:05
  const d = new Date(data)
  const dia = d.getDate().toString().padStart(2, '0')
  const mes = (d.getMonth() + 1).toString().padStart(2, '0')
  const ano = d.getFullYear()
  const hora = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  const seg = d.getSeconds().toString().padStart(2, '0')
  return `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`
}

async function gerarCodigoBarrasCode128(doc: jsPDF, chave: string, x: number, y: number, width: number, height: number): Promise<void> {
  try {
    // Tentar usar jsbarcode com canvas se disponível
    const JsBarcode = await import('jsbarcode')
    const { createCanvas } = await import('canvas')
    
    const canvas = createCanvas(600, 100)
    
    JsBarcode.default(canvas, chave, {
      format: 'CODE128C',
      width: 2,
      height: 100,
      displayValue: false,
      margin: 0
    })
    
    const barcodeImage = canvas.toDataURL('image/png')
    doc.addImage(barcodeImage, 'PNG', x, y, width, height)
  } catch (error) {
    // Se falhar, desenhar representação simples com retângulo
    console.warn('Código de barras CODE-128C não disponível, usando representação simples')
    doc.rect(x, y, width, height)
    doc.setFontSize(8)
    doc.text('[Código de Barras CODE-128C]', x + width/2, y + height/2, { align: 'center' })
  }
}

export async function gerarDanfePDF(xmlNfe: string): Promise<Buffer> {
  const nfe = await parseStringPromise(xmlNfe)
  const infNFe = nfe.nfeProc?.NFe?.[0]?.infNFe?.[0] || nfe.NFe?.infNFe?.[0]
  const protNFe = nfe.nfeProc?.protNFe?.[0]?.infProt?.[0]
  
  if (!infNFe) {
    throw new Error('XML da NFe inválido')
  }

  const ide = infNFe.ide[0]
  const emit = infNFe.emit[0]
  const dest = infNFe.dest[0]
  const det = infNFe.det || []
  const total = infNFe.total[0].ICMSTot[0]
  
  // Buscar logo das configurações
  let logoBase64: string | null = null
  try {
    // Primeiro tentar carregar logo.png diretamente do public
    const fs = await import('fs')
    const path = await import('path')
    const logoPngPath = path.join(process.cwd(), 'public', 'logo.png')
    
    if (fs.existsSync(logoPngPath)) {
      const fileBuffer = fs.readFileSync(logoPngPath)
      logoBase64 = `data:image/png;base64,${fileBuffer.toString('base64')}`
      console.log('Logo carregada de public/logo.png')
    } else {
      // Fallback: buscar das configurações do sistema
      const logoConfig = await prisma.systemConfig.findFirst({
        where: { key: 'appearance.logo' }
      })
      
      console.log('Logo config encontrado:', logoConfig?.value)
      
      if (logoConfig?.value) {
        const logoPath = logoConfig.value
        
        // Se já for base64, usar diretamente (exceto SVG)
        if (logoPath.startsWith('data:image') && !logoPath.includes('svg')) {
          logoBase64 = logoPath
        } 
        // Se for caminho de arquivo, tentar ler e converter (exceto SVG)
        else if (logoPath.startsWith('/') || logoPath.startsWith('./')) {
          try {
            // Caminho absoluto do arquivo
            const fullPath = path.join(process.cwd(), 'public', logoPath.replace(/^\//, ''))
            
            console.log('Tentando ler logo de:', fullPath)
            
            if (fs.existsSync(fullPath)) {
              const ext = path.extname(logoPath).toLowerCase()
              
              // jsPDF não suporta SVG - pular
              if (ext === '.svg') {
                console.log('SVG detectado - jsPDF não suporta SVG. Use PNG ou JPEG.')
              } else {
                const fileBuffer = fs.readFileSync(fullPath)
                const base64 = fileBuffer.toString('base64')
                
                // Detectar tipo MIME
                const mimeTypes: Record<string, string> = {
                  '.png': 'image/png',
                  '.jpg': 'image/jpeg',
                  '.jpeg': 'image/jpeg',
                  '.gif': 'image/gif'
                }
                const mimeType = mimeTypes[ext] || 'image/png'
                
                logoBase64 = `data:${mimeType};base64,${base64}`
                console.log('Logo convertida para base64:', mimeType)
              }
            } else {
              console.log('Arquivo de logo não encontrado:', fullPath)
            }
          } catch (err) {
            console.log('Erro ao ler arquivo de logo:', err)
          }
        }
      }
    }
  } catch (error) {
    console.log('Erro ao buscar logo:', error)
  }
  
  const chaveAcesso = infNFe.$.Id.replace('NFe', '')

  // Criar PDF conforme layout A4 retrato SEFAZ
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // Configurar fonte Times New Roman conforme especificação
  doc.setFont('times', 'normal')

  let y = 5

  // ==================== TOPO: RECEBEMOS DE ====================
  doc.rect(10, y, 150, 8)
  doc.rect(160, y, 40, 8)
  
  doc.setFontSize(7)
  doc.setFont('times', 'normal')
  doc.text(`RECEBEMOS DE ${emit.xNome[0]} OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO`, 12, y + 5, { maxWidth: 145 })
  
  doc.setFontSize(8)
  doc.setFont('times', 'bold')
  doc.text(`NF-e`, 180, y + 4, { align: 'center' })
  doc.text(`N° ${ide.nNF[0].padStart(9, '0')}`, 180, y + 7, { align: 'center' })

  y += 10

  // Segunda linha - Data e assinatura
  doc.rect(10, y, 50, 6)
  doc.rect(60, y, 140, 6)
  
  doc.setFontSize(6)
  doc.setFont('times', 'normal')
  doc.text('Data de recebimento', 12, y + 4)
  doc.text('Identificação e assinatura do recebedor', 62, y + 4)

  y += 8

  // Linha pontilhada de separação
  doc.setLineDash([2, 2])
  doc.line(10, y, 200, y)
  doc.setLineDash([])

  y += 2

  // ==================== QUADRO PRINCIPAL: CABEÇALHO ====================
  // Layout: [Logo/Emitente 70mm] | [DANFE 50mm] | [Código de Barras 70mm]
  const headerHeight = 50
  doc.rect(10, y, 190, headerHeight)

  // === SEÇÃO 1: LOGO + DADOS DO EMITENTE (10 a 80) ===
  // Linha vertical separadora
  doc.line(80, y, 80, y + headerHeight)
  
  // Logo MYDSHOP - proporção 260x70 = 3.71:1
  const logoWidth = 30
  const logoHeight = logoWidth / 3.71
  const logoX = 12
  const logoY = y + 3
  
  if (logoBase64) {
    try {
      let format = 'PNG'
      if (logoBase64.includes('image/png')) format = 'PNG'
      else if (logoBase64.includes('image/jpeg') || logoBase64.includes('image/jpg')) format = 'JPEG'
      doc.addImage(logoBase64, format, logoX, logoY, logoWidth, logoHeight, undefined, 'FAST')
    } catch (error) {
      doc.setFontSize(8)
      doc.setFont('times', 'bold')
      doc.text('LOGO', logoX + 15, logoY + 5, { align: 'center' })
    }
  }
  
  // Nome da empresa ao lado do logo
  doc.setFontSize(10)
  doc.setFont('times', 'bold')
  const enderEmit = emit.enderEmit[0]
  doc.text(emit.xNome[0].substring(0, 30), 44, y + 8, { maxWidth: 34 })
  
  // Endereço abaixo
  doc.setFontSize(7)
  doc.setFont('times', 'normal')
  doc.text(`${enderEmit.xLgr[0]}, ${enderEmit.nro[0]} - ${enderEmit.xBairro[0]},`, 12, y + 20, { maxWidth: 66 })
  doc.text(`${enderEmit.xMun[0]}, ${enderEmit.UF[0]} - CEP: ${enderEmit.CEP[0]} Fone:`, 12, y + 24, { maxWidth: 66 })
  doc.text(enderEmit.fone?.[0] || '', 12, y + 28)

  // === SEÇÃO 2: DANFE (80 a 130) ===
  doc.line(130, y, 130, y + headerHeight)
  
  doc.setFontSize(16)
  doc.setFont('times', 'bold')
  doc.text('DANFE', 105, y + 8, { align: 'center' })
  
  doc.setFontSize(7)
  doc.setFont('times', 'normal')
  doc.text('Documento Auxiliar da', 105, y + 13, { align: 'center' })
  doc.text('Nota Fiscal Eletrônica', 105, y + 17, { align: 'center' })
  
  // Entrada/Saída com checkbox
  doc.setFontSize(7)
  const tpNF = ide.tpNF[0]
  doc.text('0: Entrada', 85, y + 23)
  doc.text('1: Saída', 85, y + 27)
  
  // Checkbox
  doc.rect(108, y + 20, 4, 4)
  doc.rect(108, y + 24, 4, 4)
  if (tpNF === '0') {
    doc.text('X', 109, y + 23)
  } else {
    doc.text('X', 109, y + 27)
  }
  
  // Número e série
  doc.setFontSize(9)
  doc.setFont('times', 'bold')
  doc.text(`Nº ${ide.nNF[0].padStart(9, '0')}`, 105, y + 35, { align: 'center' })
  doc.text(`SÉRIE:${ide.serie[0].padStart(3, '0')}`, 105, y + 40, { align: 'center' })
  doc.text(`Folha  1  d  1`, 105, y + 45, { align: 'center' })

  // === SEÇÃO 3: CÓDIGO DE BARRAS E CHAVE (130 a 200) ===
  // Código de barras - maior (mais largo) e mais fino (menos alto)
  await gerarCodigoBarrasCode128(doc, chaveAcesso, 133, y + 3, 65, 12)
  
  // Texto CHAVE DE ACESSO
  doc.setFontSize(5)
  doc.setFont('times', 'bold')
  doc.text('CHAVE DE ACESSO', 165, y + 18, { align: 'center' })
  
  // Chave formatada
  doc.setFontSize(5)
  doc.setFont('times', 'normal')
  doc.text(formatarChaveAcesso(chaveAcesso), 165, y + 22, { align: 'center' })
  
  // Texto de consulta
  doc.setFontSize(5)
  doc.text('Consulta de autenticidade no portal nacional da NF-e', 165, y + 28, { align: 'center' })
  doc.text('www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora', 165, y + 32, { align: 'center' })

  y += headerHeight + 2

  // ==================== QUADRO: NATUREZA DA OPERAÇÃO ====================
  doc.rect(10, y, 105, 10)
  doc.rect(115, y, 85, 10)
  
  doc.setFontSize(6)
  doc.setFont('times', 'bold')
  doc.text('NATUREZA DA OPERAÇÃO', 12, y + 3)
  doc.text('PROTOCOLO DE AUTORIZAÇÃO DE USO', 117, y + 3)
  
  doc.setFontSize(8)
  doc.setFont('times', 'normal')
  doc.text(ide.natOp[0], 12, y + 8)
  
  // Verificar ambiente: 1=Produção, 2=Homologação
  const tpAmb = ide.tpAmb[0]
  
  if (protNFe && protNFe.nProt && protNFe.nProt[0]) {
    const dhRecbto = protNFe.dhRecbto?.[0] ? formatarData(protNFe.dhRecbto[0]) : ''
    doc.text(`${protNFe.nProt[0]}  ${dhRecbto}`, 117, y + 8)
  } else if (tpAmb === '2') {
    doc.setTextColor(255, 0, 0)
    doc.text('DOCUMENTO SEM VALOR FISCAL', 117, y + 8)
    doc.setTextColor(0, 0, 0)
  }

  y += 12

  // ==================== QUADRO: INSCRIÇÕES ====================
  doc.rect(10, y, 60, 10)
  doc.rect(70, y, 50, 10)
  doc.rect(120, y, 80, 10)
  
  doc.setFontSize(5)
  doc.setFont('times', 'bold')
  doc.text('INSCRIÇÃO ESTADUAL', 12, y + 3)
  doc.text('INSC. ESTADUAL DO SUBST. TRIBUTÁRIO', 72, y + 3)
  doc.text('CNPJ', 122, y + 3)
  
  doc.setFontSize(8)
  doc.setFont('times', 'normal')
  doc.text(emit.IE[0], 12, y + 8)
  doc.text('', 72, y + 8) // Subst. tributário geralmente vazio
  doc.text(formatarCNPJ(emit.CNPJ[0]), 122, y + 8)

  y += 12

  // ==================== QUADRO: DESTINATÁRIO / REMETENTE ====================
  doc.setFontSize(6)
  doc.setFont('times', 'bold')
  doc.text('DESTINATÁRIO / REMETENTE', 12, y + 3)
  
  y += 4
  
  // Linha 1: Nome, CNPJ/CPF, Data de Emissão
  doc.rect(10, y, 110, 10)  // Nome
  doc.rect(120, y, 45, 10)  // CNPJ/CPF
  doc.rect(165, y, 35, 10)  // Data Emissão
  
  doc.setFontSize(5)
  doc.setFont('times', 'bold')
  doc.text('NOME/RAZÃO SOCIAL', 12, y + 3)
  doc.text('C.N.P.J / C.P.F.', 122, y + 3)
  doc.text('DATA DA EMISSÃO', 182.5, y + 3, { align: 'center' })
  
  doc.setFontSize(8)
  doc.setFont('times', 'normal')
  doc.text(dest.xNome[0].substring(0, 55), 12, y + 8)
  const cpfCnpj = dest.CNPJ?.[0] ? formatarCNPJ(dest.CNPJ[0]) : (dest.CPF?.[0] ? formatarCPF(dest.CPF[0]) : '')
  doc.text(cpfCnpj, 122, y + 8)
  doc.text(formatarData(ide.dhEmi[0]).split(' ')[0], 182.5, y + 8, { align: 'center' })
  
  y += 10
  
  // Linha 2: Endereço, Bairro, CEP, Data Entrada/Saída
  const enderDest = dest.enderDest[0]
  doc.rect(10, y, 90, 10)   // Endereço
  doc.rect(100, y, 35, 10)  // Bairro
  doc.rect(135, y, 30, 10)  // CEP
  doc.rect(165, y, 35, 10)  // Data Entrada/Saída
  
  doc.setFontSize(5)
  doc.setFont('times', 'bold')
  doc.text('ENDEREÇO', 12, y + 3)
  doc.text('BAIRRO/DISTRITO', 102, y + 3)
  doc.text('CEP', 137, y + 3)
  doc.text('DATA DA ENTRADA / SAÍDA', 182.5, y + 3, { align: 'center' })
  
  doc.setFontSize(7)
  doc.setFont('times', 'normal')
  doc.text(`${enderDest.xLgr[0]}, ${enderDest.nro[0]}${enderDest.xCpl?.[0] ? ' - ' + enderDest.xCpl[0] : ''}`, 12, y + 8, { maxWidth: 86 })
  doc.text(enderDest.xBairro[0].substring(0, 18), 102, y + 8)
  doc.text(enderDest.CEP[0], 137, y + 8)
  doc.text(formatarData(ide.dhEmi[0]).split(' ')[0], 182.5, y + 8, { align: 'center' })
  
  y += 10
  
  // Linha 3: Município, Fone, UF, IE, Hora Saída
  doc.rect(10, y, 55, 10)   // Município
  doc.rect(65, y, 35, 10)   // Fone
  doc.rect(100, y, 15, 10)  // UF
  doc.rect(115, y, 50, 10)  // IE
  doc.rect(165, y, 35, 10)  // Hora Saída
  
  doc.setFontSize(5)
  doc.setFont('times', 'bold')
  doc.text('MUNICÍPIO', 12, y + 3)
  doc.text('FONE/FAX', 67, y + 3)
  doc.text('UF', 102, y + 3)
  doc.text('INSCRIÇÃO ESTADUAL', 117, y + 3)
  doc.text('HORA DE SAÍDA', 182.5, y + 3, { align: 'center' })
  
  doc.setFontSize(8)
  doc.setFont('times', 'normal')
  doc.text(enderDest.xMun[0].substring(0, 25), 12, y + 8)
  doc.text(enderDest.fone?.[0] || '', 67, y + 8)
  doc.text(enderDest.UF[0], 102, y + 8)
  doc.text(dest.IE?.[0] || '', 117, y + 8)
  const horaEmissao = formatarData(ide.dhEmi[0]).split(' ')[1] || ''
  doc.text(horaEmissao, 182.5, y + 8, { align: 'center' })

  y += 12

  // ==================== QUADRO 6: DADOS DOS PRODUTOS / SERVIÇOS ====================
  doc.setFontSize(6)
  doc.setFont('times', 'bold')
  doc.text('DADOS DOS PRODUTOS / SERVIÇOS', 12, y + 2)
  
  y += 3

  // Calcular altura fixa dos elementos do rodapé
  // Cálculo Imposto: 22mm + Transportador: 35mm + Dados Adicionais: 30mm + margem: 5mm = ~92mm
  const pageHeight = 297 // A4
  const footerHeight = 92
  const minTableEndY = pageHeight - footerHeight // Onde a tabela deve terminar no mínimo
  const minTableHeight = minTableEndY - y // Altura mínima que a tabela precisa ter

  const produtosTable = det.map((item: any, index: number) => {
    const prod = item.prod[0]
    const imposto = item.imposto[0]
    const icms = imposto.ICMS[0]
    const icmsKey = Object.keys(icms)[0]
    const icmsData = icms[icmsKey]?.[0] || icms[icmsKey] || {}
    
    // Usar GTIN se disponível, senão usar código do produto
    const gtin = prod.cEAN?.[0]
    const codigoProduto = (gtin && gtin !== 'SEM GTIN') ? gtin : prod.cProd[0]
    
    console.log(`📋 DANFE Item ${index + 1} - icmsKey: ${icmsKey}, icmsData:`, JSON.stringify(icmsData))
    
    return [
      codigoProduto,
      prod.xProd[0].substring(0, 50),
      prod.NCM[0],
      icmsData.CST?.[0] || icmsData.CSOSN?.[0] || '',
      prod.CFOP[0],
      prod.uCom[0],
      prod.qCom[0],
      formatarMoeda(prod.vUnCom[0]),
      formatarMoeda(prod.vProd[0]),
      formatarMoeda(icmsData.vBC?.[0] || '0'),
      formatarMoeda(icmsData.vICMS?.[0] || '0'),
      icmsData.pICMS?.[0] || '0'
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [[
      'CÓD.\nPROD',
      'DESCRIÇÃO DO PRODUTO / SERVIÇO',
      'NCM/SH',
      'CST',
      'CFOP',
      'UN',
      'QUANT',
      'VALOR\nUNIT',
      'VALOR\nTOTAL',
      'BC ICMS',
      'VALOR\nICMS',
      'ALÍQ\nICMS'
    ]],
    body: produtosTable,
    theme: 'grid',
    styles: { 
      fontSize: 6,
      cellPadding: 1,
      font: 'times',
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    },
    headStyles: { 
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 8
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },  // GTIN/CÓD - aumentado para caber GTIN
      1: { cellWidth: 43 },                     // Descrição - diminuído
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 8, halign: 'center' },
      6: { cellWidth: 12, halign: 'right' },
      7: { cellWidth: 15, halign: 'right' },
      8: { cellWidth: 15, halign: 'right' },
      9: { cellWidth: 15, halign: 'right' },
      10: { cellWidth: 15, halign: 'right' },
      11: { cellWidth: 8, halign: 'center' }
    },
    margin: { left: 10, right: 10 }
  })

  const tableEndY = (doc as any).lastAutoTable.finalY

  // Estender a tabela até a posição mínima (preencher espaço vazio)
  if (tableEndY < minTableEndY) {
    // Desenhar retângulo vazio para completar a área da tabela
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.1)
    
    // Desenhar bordas das colunas estendidas
    const colWidths = [22, 43, 15, 10, 12, 8, 12, 15, 15, 15, 15, 8]
    let colX = 10
    
    // Linha horizontal no topo da extensão
    doc.line(10, tableEndY, 200, tableEndY)
    
    // Linhas verticais para cada coluna
    for (let i = 0; i <= colWidths.length; i++) {
      doc.line(colX, tableEndY, colX, minTableEndY)
      if (i < colWidths.length) colX += colWidths[i]
    }
    
    // Linha horizontal na base
    doc.line(10, minTableEndY, 200, minTableEndY)
  }

  y = Math.max(tableEndY, minTableEndY) + 2

  // ==================== QUADRO 7: CÁLCULO DO IMPOSTO ====================
  doc.rect(10, y, 190, 20)
  
  doc.setFontSize(6)
  doc.setFont('times', 'bold')
  doc.text('CÁLCULO DO IMPOSTO', 12, y + 3)
  
  // Linha 1
  doc.text('BASE DE CÁLCULO DO ICMS', 12, y + 7)
  doc.text('VALOR DO ICMS', 50, y + 7)
  doc.text('BASE CÁLC. ICMS SUBST.', 88, y + 7)
  doc.text('VALOR ICMS SUBST.', 126, y + 7)
  doc.text('VALOR TOTAL PRODUTOS', 164, y + 7)
  
  doc.setFontSize(8)
  doc.setFont('times', 'normal')
  doc.text(formatarMoeda(total.vBC[0]), 12, y + 11)
  doc.text(formatarMoeda(total.vICMS[0]), 50, y + 11)
  doc.text(formatarMoeda(total.vBCST?.[0] || '0'), 88, y + 11)
  doc.text(formatarMoeda(total.vST?.[0] || '0'), 126, y + 11)
  doc.text(formatarMoeda(total.vProd[0]), 164, y + 11)
  
  // Linha 2
  doc.setFontSize(6)
  doc.setFont('times', 'bold')
  doc.text('VALOR DO FRETE', 12, y + 15)
  doc.text('VALOR DO SEGURO', 50, y + 15)
  doc.text('DESCONTO', 88, y + 15)
  doc.text('OUTRAS DESPESAS', 126, y + 15)
  doc.text('VALOR TOTAL DA NOTA', 164, y + 15)
  
  doc.setFontSize(8)
  doc.setFont('times', 'normal')
  doc.text(formatarMoeda(total.vFrete?.[0] || '0'), 12, y + 19)
  doc.text(formatarMoeda(total.vSeg?.[0] || '0'), 50, y + 19)
  doc.text(formatarMoeda(total.vDesc?.[0] || '0'), 88, y + 19)
  doc.text(formatarMoeda(total.vOutro?.[0] || '0'), 126, y + 19)
  
  doc.setFontSize(10)
  doc.setFont('times', 'bold')
  doc.text(formatarMoeda(total.vNF[0]), 164, y + 19)

  y += 22

  // ==================== QUADRO 8: TRANSPORTADOR ====================
  doc.rect(10, y, 190, 15)
  
  doc.setFontSize(6)
  doc.setFont('times', 'bold')
  doc.text('TRANSPORTADOR / VOLUMES TRANSPORTADOS', 12, y + 3)
  
  const transp = infNFe.transp?.[0]
  if (transp?.transporta?.[0]) {
    doc.text('NOME / RAZÃO SOCIAL', 12, y + 7)
    doc.text('FRETE POR CONTA', 90, y + 7)
    doc.text('PLACA DO VEÍCULO', 140, y + 7)
    doc.text('UF', 180, y + 7)
    
    doc.setFontSize(8)
    doc.setFont('times', 'normal')
    doc.text(transp.transporta[0].xNome?.[0] || '', 12, y + 11)
    
    const modFrete = transp.modFrete?.[0] || '9'
    const freteTexto = ['Emitente', 'Destinatário', 'Terceiros', 'Próprio/Emitente', 'Próprio/Dest', '', '', '', '', 'Sem Transporte'][parseInt(modFrete)]
    doc.text(freteTexto, 90, y + 11)
    
    doc.text(transp.veicTransp?.[0]?.placa?.[0] || '', 140, y + 11)
    doc.text(transp.veicTransp?.[0]?.UF?.[0] || '', 180, y + 11)
  }

  y += 17

  // ==================== QUADRO 9: INFORMAÇÕES COMPLEMENTARES ====================
  doc.rect(10, y, 120, 25)
  doc.rect(130, y, 70, 25)
  
  doc.setFontSize(6)
  doc.setFont('times', 'bold')
  doc.text('INFORMAÇÕES COMPLEMENTARES', 12, y + 3)
  doc.text('RESERVADO AO FISCO', 132, y + 3)
  
  doc.setFontSize(7)
  doc.setFont('times', 'normal')
  
  // Informações complementares
  const infCpl = infNFe.infAdic?.[0]?.infCpl?.[0]
  if (infCpl) {
    const lines = doc.splitTextToSize(infCpl, 105)
    doc.text(lines, 12, y + 7)
  }

  return Buffer.from(doc.output('arraybuffer'))
}
