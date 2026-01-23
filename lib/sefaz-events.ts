/**
 * Módulo de Eventos SEFAZ para NF-e
 * 
 * Implementa os eventos fiscais:
 * - 110110: Carta de Correção Eletrônica (CC-e)
 * - 110111: Cancelamento de NF-e
 * - 110112: Inutilização de numeração (não implementado ainda)
 * 
 * @see http://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04REtHT5B/w=
 */

import { prisma } from './prisma'
import { readFileSync } from 'fs'
import * as forge from 'node-forge'
import { SignedXml } from 'xml-crypto'
import { create } from 'xmlbuilder2'
import https from 'https'

// Endpoints SEFAZ para Eventos
const SEFAZ_EVENTOS_ENDPOINTS: Record<string, { producao: string; homologacao: string }> = {
  SP: {
    producao: 'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
    homologacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx'
  },
  MG: {
    producao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/RecepcaoEvento4',
    homologacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/RecepcaoEvento4'
  },
  RS: {
    producao: 'https://nfe.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
    homologacao: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx'
  },
  PR: {
    producao: 'https://nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4?wsdl',
    homologacao: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4?wsdl'
  },
  // SVAN (Sefaz Virtual Ambiente Nacional) - para estados sem webservice próprio
  SVAN: {
    producao: 'https://www.sefazvirtual.fazenda.gov.br/RecepcaoEvento4/RecepcaoEvento4.asmx',
    homologacao: 'https://hom.sefazvirtual.fazenda.gov.br/RecepcaoEvento4/RecepcaoEvento4.asmx'
  }
}

interface SefazEventResult {
  success: boolean
  protocolo?: string
  dataEvento?: string
  xmlUrl?: string
  error?: string
}

interface SefazConfig {
  estado: string
  ambiente: 'homologacao' | 'producao'
  certificadoPath: string
  certificadoSenha: string
}

/**
 * Obtém código IBGE do estado
 */
function getCodigoUF(uf: string): string {
  const codigos: Record<string, string> = {
    MA: '21', SP: '35', RJ: '33', MG: '31', RS: '43',
    PR: '41', SC: '42', BA: '29', CE: '23', PE: '26',
    GO: '52', ES: '32', PA: '15', AM: '13', MT: '51',
    MS: '50', DF: '53', RO: '11', AC: '12', AP: '16',
    RR: '14', TO: '17', AL: '27', PB: '25', PI: '22',
    RN: '24', SE: '28'
  }
  return codigos[uf] || '35'
}

/**
 * Assina XML de evento com certificado digital A1
 */
function assinarXMLEvento(xml: string, certificadoPath: string, senha: string, idEvento: string): string {
  try {
    console.log('[SEFAZ-EVENT] Assinando XML do evento...')
    
    // Ler arquivo .pfx
    const pfxBuffer = readFileSync(certificadoPath)
    const pfxBase64 = pfxBuffer.toString('base64')
    
    // Decodificar o .pfx com a senha
    const p12Asn1 = forge.asn1.fromDer(forge.util.decode64(pfxBase64))
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha)
    
    // Extrair chave privada e certificado
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const certBag = bags[forge.pki.oids.certBag]?.[0]
    if (!certBag) throw new Error('Certificado não encontrado no arquivo .pfx')
    
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
    if (!keyBag) throw new Error('Chave privada não encontrada no arquivo .pfx')
    
    const certificate = certBag.cert
    const privateKey = keyBag.key
    
    if (!certificate || !privateKey) throw new Error('Erro ao extrair certificado ou chave')
    
    // Converter para PEM
    const privateKeyPem = forge.pki.privateKeyToPem(privateKey)
    const certPem = forge.pki.certificateToPem(certificate)
    
    // Extrair certificado limpo (sem headers PEM)
    const certBase64 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\n/g, '')
      .trim()
    
    // Criar assinatura XML-DSig
    const sig = new SignedXml({
      privateKey: privateKeyPem,
      canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
      signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
      getKeyInfoContent: () => {
        return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`
      }
    })
    
    // Adicionar referência ao evento
    sig.addReference({
      xpath: `//*[@Id="${idEvento}"]`,
      transforms: [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
      ],
      digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1'
    })
    
    // Remover tag <Signature> placeholder se existir
    const xmlSemAssinatura = xml.replace(/<Signature[^>]*>[\s\S]*?<\/Signature>/g, '')
    
    // Assinar
    sig.computeSignature(xmlSemAssinatura, {
      prefix: '',
      location: { reference: `//*[local-name(.)='infEvento']`, action: 'after' }
    })
    
    const xmlAssinado = sig.getSignedXml()
    
    console.log('[SEFAZ-EVENT] XML do evento assinado com sucesso')
    return xmlAssinado
    
  } catch (error: any) {
    console.error('[SEFAZ-EVENT] Erro ao assinar XML:', error)
    throw new Error(`Erro ao assinar XML do evento: ${error.message}`)
  }
}

/**
 * Formata data/hora no padrão NF-e (ISO 8601 com timezone)
 */
function formatarDataHoraNFe(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '-03:00')
}

/**
 * Gera XML do evento de Cancelamento (tpEvento=110111)
 */
function gerarXMLCancelamento(
  chaveAcesso: string,
  justificativa: string,
  protocolo: string,
  config: SefazConfig,
  cnpj: string
): { xml: string; idEvento: string } {
  const cOrgao = getCodigoUF(config.estado)
  const tpAmb = config.ambiente === 'producao' ? '1' : '2'
  const dhEvento = formatarDataHoraNFe()
  const nSeqEvento = '1'
  const verEvento = '1.00'
  const tpEvento = '110111' // Cancelamento
  const idEvento = `ID${tpEvento}${chaveAcesso}${nSeqEvento.padStart(2, '0')}`
  
  const xml = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('envEvento', {
      xmlns: 'http://www.portalfiscal.inf.br/nfe',
      versao: '1.00'
    })
      .ele('idLote').txt(Date.now().toString()).up()
      .ele('evento', { versao: '1.00' })
        .ele('infEvento', { Id: idEvento })
          .ele('cOrgao').txt(cOrgao).up()
          .ele('tpAmb').txt(tpAmb).up()
          .ele('CNPJ').txt(cnpj.replace(/\D/g, '')).up()
          .ele('chNFe').txt(chaveAcesso).up()
          .ele('dhEvento').txt(dhEvento).up()
          .ele('tpEvento').txt(tpEvento).up()
          .ele('nSeqEvento').txt(nSeqEvento).up()
          .ele('verEvento').txt(verEvento).up()
          .ele('detEvento', { versao: '1.00' })
            .ele('descEvento').txt('Cancelamento').up()
            .ele('nProt').txt(protocolo).up()
            .ele('xJust').txt(justificativa).up()
          .up()
        .up()
      .up()
    .up()
    .end({ prettyPrint: false })

  return { xml, idEvento }
}

/**
 * Gera XML do evento de Carta de Correção (tpEvento=110110)
 */
function gerarXMLCartaCorrecao(
  chaveAcesso: string,
  correcao: string,
  nSeqEvento: number,
  config: SefazConfig,
  cnpj: string
): { xml: string; idEvento: string } {
  const cOrgao = getCodigoUF(config.estado)
  const tpAmb = config.ambiente === 'producao' ? '1' : '2'
  const dhEvento = formatarDataHoraNFe()
  const verEvento = '1.00'
  const tpEvento = '110110' // Carta de Correção
  const idEvento = `ID${tpEvento}${chaveAcesso}${nSeqEvento.toString().padStart(2, '0')}`
  
  // Condição de uso obrigatória na CC-e
  const xCondUso = 'A Carta de Correção é disciplinada pelo § 1º-A do art. 7º do Convênio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularização de erro ocorrido na emissão de documento fiscal, desde que o erro não esteja relacionado com: I - as variáveis que determinam o valor do imposto tais como: base de cálculo, alíquota, diferença de preço, quantidade, valor da operação ou da prestação; II - a correção de dados cadastrais que implique mudança do remetente ou do destinatário; III - a data de emissão ou de saída.'
  
  const xml = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('envEvento', {
      xmlns: 'http://www.portalfiscal.inf.br/nfe',
      versao: '1.00'
    })
      .ele('idLote').txt(Date.now().toString()).up()
      .ele('evento', { versao: '1.00' })
        .ele('infEvento', { Id: idEvento })
          .ele('cOrgao').txt(cOrgao).up()
          .ele('tpAmb').txt(tpAmb).up()
          .ele('CNPJ').txt(cnpj.replace(/\D/g, '')).up()
          .ele('chNFe').txt(chaveAcesso).up()
          .ele('dhEvento').txt(dhEvento).up()
          .ele('tpEvento').txt(tpEvento).up()
          .ele('nSeqEvento').txt(nSeqEvento.toString()).up()
          .ele('verEvento').txt(verEvento).up()
          .ele('detEvento', { versao: '1.00' })
            .ele('descEvento').txt('Carta de Correcao').up()
            .ele('xCorrecao').txt(correcao).up()
            .ele('xCondUso').txt(xCondUso).up()
          .up()
        .up()
      .up()
    .up()
    .end({ prettyPrint: false })

  return { xml, idEvento }
}

/**
 * Envia evento para Web Service SEFAZ via SOAP
 */
async function enviarEventoSefaz(
  xmlAssinado: string,
  config: SefazConfig,
  certificadoPath: string,
  certificadoSenha: string
): Promise<any> {
  // Ler certificado para autenticação mútua SSL
  const pfxBuffer = readFileSync(certificadoPath)
  
  // Obter endpoint
  const endpoint = SEFAZ_EVENTOS_ENDPOINTS[config.estado] || SEFAZ_EVENTOS_ENDPOINTS.SVAN
  const url = config.ambiente === 'producao' ? endpoint.producao : endpoint.homologacao
  
  console.log(`[SEFAZ-EVENT] Enviando para: ${url}`)
  
  // Criar envelope SOAP
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
      ${xmlAssinado}
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`

  return new Promise((resolve, reject) => {
    const urlParsed = new URL(url)
    
    const options: https.RequestOptions = {
      hostname: urlParsed.hostname,
      port: 443,
      path: urlParsed.pathname,
      method: 'POST',
      pfx: pfxBuffer,
      passphrase: certificadoSenha,
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(soapEnvelope)
      },
      rejectUnauthorized: true
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        console.log('[SEFAZ-EVENT] Resposta SEFAZ:', data.substring(0, 500))
        
        // Parsear resposta
        const cStatMatch = data.match(/<cStat>(\d+)<\/cStat>/)
        const xMotivoMatch = data.match(/<xMotivo>([^<]+)<\/xMotivo>/)
        const nProtMatch = data.match(/<nProt>(\d+)<\/nProt>/)
        
        const cStat = cStatMatch ? cStatMatch[1] : null
        const xMotivo = xMotivoMatch ? xMotivoMatch[1] : null
        const nProt = nProtMatch ? nProtMatch[1] : null
        
        // 128 = Lote de Evento Processado
        // 135 = Evento registrado e vinculado a NF-e
        if (cStat === '128' || cStat === '135') {
          resolve({
            success: true,
            protocolo: nProt,
            cStat,
            xMotivo,
            xmlRetorno: data
          })
        } else {
          resolve({
            success: false,
            cStat,
            xMotivo,
            error: `${cStat} - ${xMotivo}`,
            xmlRetorno: data
          })
        }
      })
    })
    
    req.on('error', (error) => {
      console.error('[SEFAZ-EVENT] Erro na requisição:', error)
      reject(error)
    })
    
    req.write(soapEnvelope)
    req.end()
  })
}

/**
 * Cancela NF-e na SEFAZ
 */
export async function cancelarNFeSefaz(
  invoiceId: string,
  justificativa: string
): Promise<SefazEventResult> {
  try {
    console.log(`[SEFAZ-EVENT] Iniciando cancelamento da NF-e ${invoiceId}`)
    
    // Buscar nota fiscal
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    })
    
    if (!invoice) {
      return { success: false, error: 'Nota fiscal não encontrada' }
    }
    
    if (!invoice.accessKey) {
      return { success: false, error: 'Nota fiscal sem chave de acesso' }
    }
    
    if (!invoice.protocol) {
      return { success: false, error: 'Nota fiscal sem protocolo de autorização' }
    }
    
    // Buscar configuração SEFAZ
    const configData = await prisma.systemConfig.findFirst({
      where: { key: 'nfe_config' }
    })
    
    if (!configData) {
      return { success: false, error: 'Configuração SEFAZ não encontrada' }
    }
    
    const nfeConfig = JSON.parse(configData.value)
    
    if (!nfeConfig.certificadoArquivo || !nfeConfig.certificadoSenha) {
      return { success: false, error: 'Certificado digital não configurado' }
    }
    
    const config: SefazConfig = {
      estado: nfeConfig.sefazEstado || nfeConfig.emitenteEstado || 'SP',
      ambiente: nfeConfig.sefazAmbiente || nfeConfig.ambiente || 'homologacao',
      certificadoPath: nfeConfig.certificadoArquivo,
      certificadoSenha: nfeConfig.certificadoSenha
    }
    
    // Gerar XML do evento
    const { xml, idEvento } = gerarXMLCancelamento(
      invoice.accessKey,
      justificativa,
      invoice.protocol,
      config,
      invoice.emitenteCnpj || nfeConfig.emitenteCnpj
    )
    
    console.log('[SEFAZ-EVENT] XML de cancelamento gerado')
    
    // Assinar XML
    const xmlAssinado = assinarXMLEvento(
      xml,
      config.certificadoPath,
      config.certificadoSenha,
      idEvento
    )
    
    // Enviar para SEFAZ
    const resultado = await enviarEventoSefaz(
      xmlAssinado,
      config,
      config.certificadoPath,
      config.certificadoSenha
    )
    
    if (resultado.success) {
      console.log(`[SEFAZ-EVENT] NF-e cancelada com sucesso. Protocolo: ${resultado.protocolo}`)
      return {
        success: true,
        protocolo: resultado.protocolo,
        dataEvento: new Date().toISOString()
      }
    } else {
      console.error(`[SEFAZ-EVENT] Erro ao cancelar: ${resultado.error}`)
      return {
        success: false,
        error: resultado.error
      }
    }
    
  } catch (error: any) {
    console.error('[SEFAZ-EVENT] Erro ao cancelar NF-e:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Envia Carta de Correção Eletrônica (CC-e) para SEFAZ
 */
export async function enviarCartaCorrecao(
  invoiceId: string,
  correcao: string,
  nSeqEvento: number = 1
): Promise<SefazEventResult> {
  try {
    console.log(`[SEFAZ-EVENT] Iniciando CC-e para NF-e ${invoiceId}, sequência ${nSeqEvento}`)
    
    // Buscar nota fiscal
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    })
    
    if (!invoice) {
      return { success: false, error: 'Nota fiscal não encontrada' }
    }
    
    if (!invoice.accessKey) {
      return { success: false, error: 'Nota fiscal sem chave de acesso' }
    }
    
    // Buscar configuração SEFAZ
    const configData = await prisma.systemConfig.findFirst({
      where: { key: 'nfe_config' }
    })
    
    if (!configData) {
      return { success: false, error: 'Configuração SEFAZ não encontrada' }
    }
    
    const nfeConfig = JSON.parse(configData.value)
    
    if (!nfeConfig.certificadoArquivo || !nfeConfig.certificadoSenha) {
      return { success: false, error: 'Certificado digital não configurado' }
    }
    
    const config: SefazConfig = {
      estado: nfeConfig.sefazEstado || nfeConfig.emitenteEstado || 'SP',
      ambiente: nfeConfig.sefazAmbiente || nfeConfig.ambiente || 'homologacao',
      certificadoPath: nfeConfig.certificadoArquivo,
      certificadoSenha: nfeConfig.certificadoSenha
    }
    
    // Gerar XML do evento
    const { xml, idEvento } = gerarXMLCartaCorrecao(
      invoice.accessKey,
      correcao,
      nSeqEvento,
      config,
      invoice.emitenteCnpj || nfeConfig.emitenteCnpj
    )
    
    console.log('[SEFAZ-EVENT] XML de CC-e gerado')
    
    // Assinar XML
    const xmlAssinado = assinarXMLEvento(
      xml,
      config.certificadoPath,
      config.certificadoSenha,
      idEvento
    )
    
    // Enviar para SEFAZ
    const resultado = await enviarEventoSefaz(
      xmlAssinado,
      config,
      config.certificadoPath,
      config.certificadoSenha
    )
    
    if (resultado.success) {
      console.log(`[SEFAZ-EVENT] CC-e enviada com sucesso. Protocolo: ${resultado.protocolo}`)
      return {
        success: true,
        protocolo: resultado.protocolo,
        dataEvento: new Date().toISOString()
      }
    } else {
      console.error(`[SEFAZ-EVENT] Erro ao enviar CC-e: ${resultado.error}`)
      return {
        success: false,
        error: resultado.error
      }
    }
    
  } catch (error: any) {
    console.error('[SEFAZ-EVENT] Erro ao enviar CC-e:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Consulta situação da NF-e na SEFAZ
 */
export async function consultarNFeSefaz(invoiceId: string): Promise<SefazEventResult> {
  try {
    console.log(`[SEFAZ-EVENT] Consultando NF-e ${invoiceId}`)
    
    // Buscar nota fiscal
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    })
    
    if (!invoice) {
      return { success: false, error: 'Nota fiscal não encontrada' }
    }
    
    if (!invoice.accessKey) {
      return { success: false, error: 'Nota fiscal sem chave de acesso' }
    }
    
    // TODO: Implementar chamada ao Web Service de consulta
    // NfeConsulta4.asmx
    
    return {
      success: true,
      protocolo: invoice.protocol || undefined
    }
    
  } catch (error: any) {
    console.error('[SEFAZ-EVENT] Erro ao consultar NF-e:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
