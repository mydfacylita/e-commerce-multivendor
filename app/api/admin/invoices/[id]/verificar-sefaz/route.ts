import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readFileSync } from 'fs'
import { parseStringPromise } from 'xml2js'
import * as forge from 'node-forge'

export const dynamic = 'force-dynamic'

function getConsultaUrl(uf: string, ambiente: string): string {
  const prod: Record<string, string> = {
    AM: 'https://nfe.sefaz.am.gov.br/services2/services/NfeConsulta4',
    BA: 'https://nfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
    CE: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeConsultaProtocolo4',
    GO: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4',
    MG: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
    MS: 'https://nfe.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4',
    MT: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4',
    PE: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4',
    PR: 'https://nfe.fazenda.pr.gov.br/nfe/NFeConsultaProtocolo4',
    RS: 'https://nfe.sefazrs.rs.gov.br/webservices/NfeConsulta2/NfeConsulta2.asmx',
    SP: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsulta4.asmx',
  }
  const hom: Record<string, string> = {
    AM: 'https://nfe-homologacao.sefaz.am.gov.br/services2/services/NfeConsulta4',
    CE: 'https://nfeh.sefaz.ce.gov.br/nfe4/services/NFeConsultaProtocolo4',
    GO: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4',
    MG: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
    MS: 'https://homologacao.nfe.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4',
    MT: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4',
    PE: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4',
    PR: 'https://homologacao.nfe.fazenda.pr.gov.br/nfe/NFeConsultaProtocolo4',
    RS: 'https://nfe-homologacao.sefazrs.rs.gov.br/webservices/NfeConsulta2/NfeConsulta2.asmx',
    SP: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsulta4.asmx',
  }
  const svrs = {
    prod: 'https://nfe.svrs.rs.gov.br/ws/NfeCons/NfeCons4.asmx',
    hom: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeCons/NfeCons4.asmx',
  }
  const isProducao = ambiente === 'producao'
  return isProducao ? (prod[uf] || svrs.prod) : (hom[uf] || svrs.hom)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: params.id } })
    if (!invoice) {
      return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 })
    }

    if (!invoice.accessKey) {
      return NextResponse.json({ error: 'Nota sem chave de acesso — ainda não foi enviada ao SEFAZ' }, { status: 400 })
    }

    // Verificar se é protocolo simulado (nota nunca foi de fato ao SEFAZ)
    if (invoice.protocol?.startsWith('SIMULATED-')) {
      return NextResponse.json({
        found: false,
        status: 'NAO_ENCONTRADA',
        message: 'Esta nota possui protocolo simulado e nunca foi transmitida ao SEFAZ. Use "Reemitir" para enviar ao SEFAZ.',
        invoiceStatus: invoice.status,
        protocol: invoice.protocol,
        isSimulated: true,
      })
    }

    const configData = await prisma.systemConfig.findFirst({ where: { key: 'nfe_config' } })
    if (!configData) {
      return NextResponse.json({ error: 'Configuração SEFAZ não encontrada' }, { status: 400 })
    }
    const config = JSON.parse(configData.value)
    const ambiente = config.sefazAmbiente || config.ambiente || 'homologacao'
    const uf = (config.sefazEstado || config.emitenteEstado || 'MA').toUpperCase()

    const urlStr = getConsultaUrl(uf, ambiente)
    const tpAmb = ambiente === 'producao' ? '1' : '2'

    const ufCodigos: Record<string, string> = {
      MA: '21', SP: '35', RJ: '33', MG: '31', RS: '43',
      PR: '41', SC: '42', BA: '29', CE: '23', PE: '26',
      GO: '52', ES: '32', PA: '15', AM: '13', MT: '51',
      MS: '50', DF: '53', RO: '11', AC: '12', AP: '16',
      RR: '14', TO: '17', AL: '27', PB: '25', PI: '22',
      RN: '24', SE: '28',
    }
    const cUF = ufCodigos[uf] || '00'

    const consSitXml = `<consSitNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>${tpAmb}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${invoice.accessKey}</chNFe></consSitNFe>`

    const wsdlNs = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4'
    const soapXml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">`,
      '<soap:Header>',
      `<nfeCabecMsg xmlns="${wsdlNs}"><cUF>${cUF}</cUF><versaoDados>4.00</versaoDados></nfeCabecMsg>`,
      '</soap:Header>',
      '<soap:Body>',
      `<nfeDadosMsg xmlns="${wsdlNs}">${consSitXml}</nfeDadosMsg>`,
      '</soap:Body>',
      '</soap:Envelope>',
    ].join('')

    const pfxBuffer = readFileSync(config.certificadoArquivo)
    // Extrair cert/key via node-forge (evita incompatibilidade OpenSSL 3.x com PKCS12 legado)
    const pfxBase64 = pfxBuffer.toString('base64')
    const p12Asn1 = forge.asn1.fromDer(forge.util.decode64(pfxBase64))
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, config.certificadoSenha || '')
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const certBag = bags[forge.pki.oids.certBag]?.[0]
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
    if (!certBag?.cert || !keyBag?.key) throw new Error('Cert/key não encontrados no PFX')
    const certPem = forge.pki.certificateToPem(certBag.cert)
    const keyPem = forge.pki.privateKeyToPem(keyBag.key)
    const urlObj = new URL(urlStr)
    const https = await import('https')

    const result = await new Promise<any>((resolve) => {
      const options: any = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml;charset=utf-8;action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF"',
          'Accept': 'application/soap+xml',
          'Connection': 'keep-alive',
          'Content-Length': Buffer.byteLength(soapXml, 'utf8'),
        },
        pfx: undefined,
        passphrase: undefined,
        key: keyPem,
        cert: certPem,
        rejectUnauthorized: false,
        timeout: 20000,
      }

      const req2 = https.request(options, (res: any) => {
        let data = ''
        res.on('data', (chunk: Buffer) => { data += chunk.toString('utf8') })
        res.on('end', async () => {
          try {
            const parsed = await parseStringPromise(data, {
              explicitArray: false,
              tagNameProcessors: [(name: string) => name.replace(/^[^:]+:/, '')],
            })
            const body = parsed?.Envelope?.Body || {}
            const resultNode = body?.nfeConsultaNFResult || {}
            const retConsSitNFe = resultNode?.retConsSitNFe || {}
            const cStat = retConsSitNFe?.cStat || ''
            const xMotivo = retConsSitNFe?.xMotivo || ''
            const infProt = retConsSitNFe?.protNFe?.infProt || {}

            if (cStat === '100' || cStat === '150') {
              resolve({ found: true, status: 'AUTORIZADA', cStat, xMotivo, protocol: infProt?.nProt, dhRecbto: infProt?.dhRecbto })
            } else if (cStat === '217' || cStat === '101') {
              resolve({ found: true, status: 'CANCELADA', cStat, xMotivo })
            } else if (cStat === '204') {
              resolve({ found: false, status: 'NAO_ENCONTRADA', cStat, xMotivo: 'NF-e não encontrada na base da SEFAZ' })
            } else {
              resolve({ found: false, status: 'ERRO_CONSULTA', cStat, xMotivo })
            }
          } catch (e: any) {
            resolve({ found: false, status: 'ERRO_PARSE', cStat: '', xMotivo: e.message })
          }
        })
      })
      req2.on('error', (e: Error) => resolve({ found: false, status: 'ERRO_CONEXAO', cStat: '', xMotivo: e.message }))
      req2.on('timeout', () => { req2.destroy(); resolve({ found: false, status: 'TIMEOUT', cStat: '', xMotivo: 'Timeout ao consultar SEFAZ' }) })
      req2.write(soapXml, 'utf8')
      req2.end()
    })

    // Se SEFAZ confirmou autorização mas banco não tem protocolo real, atualizar
    if (result.found && result.status === 'AUTORIZADA' && result.protocol && invoice.status !== 'ISSUED') {
      await prisma.invoice.update({
        where: { id: params.id },
        data: { status: 'ISSUED', protocol: result.protocol, issuedAt: new Date(), errorMessage: null }
      })
    }

    return NextResponse.json({
      ...result,
      invoiceStatus: invoice.status,
      chaveAcesso: invoice.accessKey,
      ambiente,
    })
  } catch (error: any) {
    console.error('[verificar-sefaz]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
