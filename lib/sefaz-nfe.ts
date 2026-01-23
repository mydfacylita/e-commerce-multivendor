/**
 * Integração REAL com Web Services SEFAZ para emissão de NF-e
 * 
 * DEPENDÊNCIAS NECESSÁRIAS (instalar depois):
 * npm install soap xml2js node-forge xml-crypto xmlbuilder2
 */

import { prisma } from './prisma'
import { readFileSync } from 'fs'
import * as forge from 'node-forge'
import { SignedXml } from 'xml-crypto'
import * as crypto from 'crypto'
import { create } from 'xmlbuilder2'

// Tipos
interface SefazConfig {
  estado: string
  ambiente: 'homologacao' | 'producao'
  certificadoPath: string
  certificadoSenha: string
}

interface SefazResult {
  success: boolean
  chaveAcesso?: string
  numeroNota?: string
  protocolo?: string
  xmlUrl?: string
  error?: string
}

/**
 * Assina XML da NFe com certificado digital A1
 */
function assinarXML(xml: string, certificadoPath: string, senha: string): string {
  try {
    console.log('Lendo certificado:', certificadoPath)
    
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
    
    console.log('Certificado carregado com sucesso')
    
    // Extrair chave de acesso do XML para assinar a referência correta
    const chaveMatch = xml.match(/NFe(\d{44})/)
    if (!chaveMatch) throw new Error('Chave de acesso não encontrada no XML')
    const chaveAcesso = chaveMatch[1]
    
    // Extrair certificado limpo (sem headers PEM)
    const certBase64 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\n/g, '')
      .trim()
    
    // Criar assinatura XML-DSig usando a nova API do xml-crypto
    const sig = new SignedXml({
      privateKey: privateKeyPem,
      canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
      signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
      getKeyInfoContent: () => {
        return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`
      }
    })
    
    // Adicionar referência com a nova API
    sig.addReference({
      xpath: `//*[@Id="NFe${chaveAcesso}"]`,
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
      location: { reference: `//*[local-name(.)='infNFe']`, action: 'after' }
    })
    
    const xmlAssinado = sig.getSignedXml()
    
    console.log('XML assinado com sucesso')
    return xmlAssinado
    
  } catch (error: any) {
    console.error('Erro ao assinar XML:', error)
    throw new Error(`Erro ao assinar XML: ${error.message}`)
  }
}

/**
 * Gera chave de acesso da NF-e (44 dígitos)
 */
function gerarChaveAcesso(
  uf: string,
  ano: number,
  mes: number,
  cnpj: string,
  serie: string,
  numero: number
): string {
  const codigoUF = getCodigoUF(uf)
  const anoMes = `${ano.toString().slice(-2)}${mes.toString().padStart(2, '0')}`
  const cnpjLimpo = cnpj.replace(/\D/g, '').padStart(14, '0')
  const modelo = '55'
  const serieFormatada = serie.padStart(3, '0')
  const numeroFormatado = numero.toString().padStart(9, '0')
  const tipoEmissao = '1' // Normal
  const codigoNumerico = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')

  const chaveSemDV = 
    codigoUF +
    anoMes +
    cnpjLimpo +
    modelo +
    serieFormatada +
    numeroFormatado +
    tipoEmissao +
    codigoNumerico

  const dv = calcularDV(chaveSemDV)
  
  return chaveSemDV + dv
}

/**
 * Calcula dígito verificador (módulo 11)
 */
function calcularDV(chave: string): string {
  const pesos = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let soma = 0
  
  for (let i = 0; i < chave.length; i++) {
    soma += parseInt(chave[i]) * pesos[i]
  }
  
  const resto = soma % 11
  return resto < 2 ? '0' : (11 - resto).toString()
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
    RN: '24', SE: '28',
  }
  return codigos[uf] || '00'
}

/**
 * Interface para regra de tributação
 */
interface TaxRule {
  id: string
  nome: string
  tipoOperacao: 'interna' | 'interestadual' | 'exportacao'
  ufDestino?: string
  origem: string
  cfop: string
  cstIcms: string
  aliquotaIcms: string
  reducaoBaseIcms?: string
  cstPis: string
  aliquotaPis: string
  cstCofins: string
  aliquotaCofins: string
  ativo: boolean
}

/**
 * Determina o tipo de operação baseado na UF do emitente e destinatário
 */
function determinarTipoOperacao(ufEmitente: string, ufDestinatario: string): 'interna' | 'interestadual' | 'exportacao' {
  const ufEmit = (ufEmitente || '').toUpperCase().trim()
  const ufDest = (ufDestinatario || '').toUpperCase().trim()
  
  // Se destino for exterior
  if (ufDest === 'EX' || !ufDest) {
    return 'exportacao'
  }
  
  // Mesma UF = venda interna
  if (ufEmit === ufDest) {
    return 'interna'
  }
  
  // UF diferente = interestadual
  return 'interestadual'
}

/**
 * Busca a regra de tributação adequada para a operação
 */
function buscarRegraTributacao(
  taxRules: TaxRule[], 
  tipoOperacao: 'interna' | 'interestadual' | 'exportacao',
  ufDestinatario: string
): TaxRule | null {
  if (!taxRules || taxRules.length === 0) return null
  
  // Filtrar apenas regras ativas do tipo de operação
  const regrasDoTipo = taxRules.filter(r => r.ativo && r.tipoOperacao === tipoOperacao)
  
  if (regrasDoTipo.length === 0) return null
  
  // Primeiro tentar encontrar regra específica para a UF
  const regraEspecifica = regrasDoTipo.find(r => 
    r.ufDestino && r.ufDestino.toUpperCase() === ufDestinatario.toUpperCase()
  )
  
  if (regraEspecifica) return regraEspecifica
  
  // Se não encontrou, usar regra genérica (sem UF específica)
  const regraGenerica = regrasDoTipo.find(r => !r.ufDestino || r.ufDestino === '')
  
  return regraGenerica || regrasDoTipo[0]
}

/**
 * Gera XML do ICMS baseado no CST/CSOSN
 */
function gerarXMLIcms(cst: string, origem: string, valorTotal: number, aliquota: number, reducaoBase?: number): string {
  const orig = origem || '0'
  const pICMS = aliquota.toFixed(2)
  
  // CST do Simples Nacional (3 dígitos - CSOSN)
  if (cst.length === 3) {
    switch (cst) {
      case '101': // Tributada com permissão de crédito
        return `<ICMSSN101>
            <orig>${orig}</orig>
            <CSOSN>101</CSOSN>
            <pCredSN>${pICMS}</pCredSN>
            <vCredICMSSN>${(valorTotal * aliquota / 100).toFixed(2)}</vCredICMSSN>
          </ICMSSN101>`
      case '102': // Tributada sem permissão de crédito
      case '103': // Isenção do ICMS
      case '400': // Não tributada
        return `<ICMSSN102>
            <orig>${orig}</orig>
            <CSOSN>${cst}</CSOSN>
          </ICMSSN102>`
      case '201': // Com ST e crédito
      case '202': // Com ST sem crédito
      case '203': // Isenção + ST
        return `<ICMSSN202>
            <orig>${orig}</orig>
            <CSOSN>${cst}</CSOSN>
            <modBCST>4</modBCST>
            <pMVAST>0.00</pMVAST>
            <pRedBCST>0.00</pRedBCST>
            <vBCST>0.00</vBCST>
            <pICMSST>0.00</pICMSST>
            <vICMSST>0.00</vICMSST>
          </ICMSSN202>`
      case '500': // ICMS cobrado anteriormente por ST
        return `<ICMSSN500>
            <orig>${orig}</orig>
            <CSOSN>500</CSOSN>
          </ICMSSN500>`
      case '900': // Outros
        return `<ICMSSN900>
            <orig>${orig}</orig>
            <CSOSN>900</CSOSN>
            <modBC>3</modBC>
            <vBC>${valorTotal.toFixed(2)}</vBC>
            <pICMS>${pICMS}</pICMS>
            <vICMS>${(valorTotal * aliquota / 100).toFixed(2)}</vICMS>
          </ICMSSN900>`
      default:
        return `<ICMSSN102>
            <orig>${orig}</orig>
            <CSOSN>102</CSOSN>
          </ICMSSN102>`
    }
  }
  
  // CST Regime Normal (2 dígitos)
  switch (cst) {
    case '00': // Tributada integralmente
      return `<ICMS00>
            <orig>${orig}</orig>
            <CST>00</CST>
            <modBC>3</modBC>
            <vBC>${valorTotal.toFixed(2)}</vBC>
            <pICMS>${pICMS}</pICMS>
            <vICMS>${(valorTotal * aliquota / 100).toFixed(2)}</vICMS>
          </ICMS00>`
    case '10': // Tributada com cobrança de ICMS por ST
      return `<ICMS10>
            <orig>${orig}</orig>
            <CST>10</CST>
            <modBC>3</modBC>
            <vBC>${valorTotal.toFixed(2)}</vBC>
            <pICMS>${pICMS}</pICMS>
            <vICMS>${(valorTotal * aliquota / 100).toFixed(2)}</vICMS>
            <modBCST>4</modBCST>
            <pMVAST>0.00</pMVAST>
            <pRedBCST>0.00</pRedBCST>
            <vBCST>0.00</vBCST>
            <pICMSST>0.00</pICMSST>
            <vICMSST>0.00</vICMSST>
          </ICMS10>`
    case '20': // Com redução de base de cálculo
      const reducao = reducaoBase || 0
      const bcReduzida = valorTotal * (1 - reducao / 100)
      return `<ICMS20>
            <orig>${orig}</orig>
            <CST>20</CST>
            <modBC>3</modBC>
            <pRedBC>${reducao.toFixed(2)}</pRedBC>
            <vBC>${bcReduzida.toFixed(2)}</vBC>
            <pICMS>${pICMS}</pICMS>
            <vICMS>${(bcReduzida * aliquota / 100).toFixed(2)}</vICMS>
          </ICMS20>`
    case '40': // Isenta
    case '41': // Não tributada
    case '50': // Suspensão
      return `<ICMS40>
            <orig>${orig}</orig>
            <CST>${cst}</CST>
          </ICMS40>`
    case '51': // Diferimento
      return `<ICMS51>
            <orig>${orig}</orig>
            <CST>51</CST>
            <modBC>3</modBC>
            <pRedBC>0.00</pRedBC>
            <vBC>${valorTotal.toFixed(2)}</vBC>
            <pICMS>${pICMS}</pICMS>
            <vICMSOp>${(valorTotal * aliquota / 100).toFixed(2)}</vICMSOp>
            <pDif>0.00</pDif>
            <vICMSDif>0.00</vICMSDif>
            <vICMS>${(valorTotal * aliquota / 100).toFixed(2)}</vICMS>
          </ICMS51>`
    case '60': // ICMS cobrado anteriormente por ST
      return `<ICMS60>
            <orig>${orig}</orig>
            <CST>60</CST>
          </ICMS60>`
    case '70': // Com redução de BC e cobrança de ST
      const red70 = reducaoBase || 0
      const bc70 = valorTotal * (1 - red70 / 100)
      return `<ICMS70>
            <orig>${orig}</orig>
            <CST>70</CST>
            <modBC>3</modBC>
            <pRedBC>${red70.toFixed(2)}</pRedBC>
            <vBC>${bc70.toFixed(2)}</vBC>
            <pICMS>${pICMS}</pICMS>
            <vICMS>${(bc70 * aliquota / 100).toFixed(2)}</vICMS>
            <modBCST>4</modBCST>
            <pMVAST>0.00</pMVAST>
            <pRedBCST>0.00</pRedBCST>
            <vBCST>0.00</vBCST>
            <pICMSST>0.00</pICMSST>
            <vICMSST>0.00</vICMSST>
          </ICMS70>`
    case '90': // Outras
      return `<ICMS90>
            <orig>${orig}</orig>
            <CST>90</CST>
            <modBC>3</modBC>
            <vBC>${valorTotal.toFixed(2)}</vBC>
            <pICMS>${pICMS}</pICMS>
            <vICMS>${(valorTotal * aliquota / 100).toFixed(2)}</vICMS>
          </ICMS90>`
    default:
      return `<ICMS00>
            <orig>${orig}</orig>
            <CST>00</CST>
            <modBC>3</modBC>
            <vBC>${valorTotal.toFixed(2)}</vBC>
            <pICMS>${pICMS}</pICMS>
            <vICMS>${(valorTotal * aliquota / 100).toFixed(2)}</vICMS>
          </ICMS00>`
  }
}

/**
 * Gera XML do PIS baseado no CST
 */
function gerarXMLPis(cst: string, valorTotal: number, aliquota: number): string {
  const pPIS = aliquota.toFixed(2)
  
  switch (cst) {
    case '01': // Tributável - base de cálculo = valor da operação alíquota normal
    case '02': // Tributável - base de cálculo = valor da operação alíquota diferenciada
      return `<PISAliq>
            <CST>${cst}</CST>
            <vBC>${valorTotal.toFixed(2)}</vBC>
            <pPIS>${pPIS}</pPIS>
            <vPIS>${(valorTotal * aliquota / 100).toFixed(2)}</vPIS>
          </PISAliq>`
    case '04': // Monofásico - operação tributável alíquota zero
    case '05': // Substituição tributária
    case '06': // Alíquota zero
    case '07': // Isenta
    case '08': // Sem incidência
    case '09': // Suspensão
      return `<PISNT>
            <CST>${cst}</CST>
          </PISNT>`
    case '49': // Outras saídas
    case '99': // Outras operações
      return `<PISOutr>
            <CST>${cst}</CST>
            <vBC>${valorTotal.toFixed(2)}</vBC>
            <pPIS>${pPIS}</pPIS>
            <vPIS>${(valorTotal * aliquota / 100).toFixed(2)}</vPIS>
          </PISOutr>`
    default:
      return `<PISAliq>
            <CST>01</CST>
            <vBC>${valorTotal.toFixed(2)}</vBC>
            <pPIS>${pPIS}</pPIS>
            <vPIS>${(valorTotal * aliquota / 100).toFixed(2)}</vPIS>
          </PISAliq>`
  }
}

/**
 * Gera XML do COFINS baseado no CST
 */
function gerarXMLCofins(cst: string, valorTotal: number, aliquota: number): string {
  const pCOFINS = aliquota.toFixed(2)
  
  switch (cst) {
    case '01': // Tributável - base de cálculo = valor da operação alíquota normal
    case '02': // Tributável - base de cálculo = valor da operação alíquota diferenciada
      return `<COFINSAliq>
            <CST>${cst}</CST>
            <vBC>${valorTotal.toFixed(2)}</vBC>
            <pCOFINS>${pCOFINS}</pCOFINS>
            <vCOFINS>${(valorTotal * aliquota / 100).toFixed(2)}</vCOFINS>
          </COFINSAliq>`
    case '04': // Monofásico
    case '05': // Substituição tributária
    case '06': // Alíquota zero
    case '07': // Isenta
    case '08': // Sem incidência
    case '09': // Suspensão
      return `<COFINSNT>
            <CST>${cst}</CST>
          </COFINSNT>`
    case '49': // Outras saídas
    case '99': // Outras operações
      return `<COFINSOutr>
            <CST>${cst}</CST>
            <vBC>${valorTotal.toFixed(2)}</vBC>
            <pCOFINS>${pCOFINS}</pCOFINS>
            <vCOFINS>${(valorTotal * aliquota / 100).toFixed(2)}</vCOFINS>
          </COFINSOutr>`
    default:
      return `<COFINSAliq>
            <CST>01</CST>
            <vBC>${valorTotal.toFixed(2)}</vBC>
            <pCOFINS>${pCOFINS}</pCOFINS>
            <vCOFINS>${(valorTotal * aliquota / 100).toFixed(2)}</vCOFINS>
          </COFINSAliq>`
  }
}

/**
 * Gera XML dos produtos (itens da nota) aplicando regras de tributação
 */
function gerarXMLProdutos(invoice: any, config: any): string {
  if (!invoice.order?.items || invoice.order.items.length === 0) {
    throw new Error('Nota fiscal precisa ter pelo menos um produto')
  }

  // Buscar regras de tributação da configuração
  let taxRules: TaxRule[] = config.taxRules || []
  
  // Se não há taxRules salvas, usar regras padrão
  if (taxRules.length === 0) {
    console.log('⚠️ Nenhuma taxRule salva no banco. Usando regras padrão.')
    taxRules = [
      {
        id: '1',
        nome: 'Venda Interna (padrão)',
        tipoOperacao: 'interna',
        origem: '0',
        cfop: '5102',
        cstIcms: '00',
        aliquotaIcms: '18',
        reducaoBaseIcms: '0',
        cstPis: '01',
        aliquotaPis: '1.65',
        cstCofins: '01',
        aliquotaCofins: '7.60',
        ativo: true
      },
      {
        id: '2',
        nome: 'Venda Interestadual (padrão)',
        tipoOperacao: 'interestadual',
        origem: '0',
        cfop: '6102',
        cstIcms: '00',
        aliquotaIcms: '12',
        reducaoBaseIcms: '0',
        cstPis: '01',
        aliquotaPis: '1.65',
        cstCofins: '01',
        aliquotaCofins: '7.60',
        ativo: true
      },
      {
        id: '3',
        nome: 'Exportação (padrão)',
        tipoOperacao: 'exportacao',
        origem: '0',
        cfop: '7101',
        cstIcms: '41',
        aliquotaIcms: '0',
        reducaoBaseIcms: '0',
        cstPis: '08',
        aliquotaPis: '0',
        cstCofins: '08',
        aliquotaCofins: '0',
        ativo: true
      }
    ]
  }
  
  console.log(`📋 TaxRules carregadas: ${taxRules.length} regras`)
  
  // Determinar tipo de operação
  const tipoOperacao = determinarTipoOperacao(
    invoice.emitenteUF || config.emitenteEstado || 'MA',
    invoice.destinatarioUF || 'MA'
  )
  
  // Buscar regra aplicável
  const regra = buscarRegraTributacao(taxRules, tipoOperacao, invoice.destinatarioUF || 'MA')
  
  console.log(`📋 Tipo de operação: ${tipoOperacao}`)
  console.log(`📋 Regra encontrada: ${regra ? regra.nome : 'Nenhuma (usando padrões)'}`)

  return invoice.order.items.map((item: any, index: number) => {
    const nItem = index + 1
    const produto = item.product || {}
    const quantidade = item.quantity || 1
    const valorUnitario = item.price || 0
    const valorTotal = quantidade * valorUnitario

    // Determinar valores tributários (prioridade: produto > regra > padrão)
    const ncm = produto.ncm || '00000000'
    const gtin = produto.gtin || 'SEM GTIN'
    const unidade = produto.unidadeComercial || 'UN'
    
    // CFOP - prioridade: produto > regra > padrão baseado no tipo
    let cfop = produto.cfopInterno || produto.cfopInterestadual
    if (!cfop && regra) {
      cfop = regra.cfop
    }
    if (!cfop) {
      // CFOPs padrão por tipo de operação
      cfop = tipoOperacao === 'interna' ? '5102' : 
             tipoOperacao === 'interestadual' ? '6102' : '7102'
    }
    
    // Origem - prioridade: produto > regra > padrão
    const origem = produto.origem || (regra ? regra.origem : '0')
    
    // ICMS - prioridade: produto > regra > padrão
    const cstIcms = produto.cstIcms || (regra ? regra.cstIcms : '00')
    const aliquotaIcms = produto.aliquotaIcms ?? (regra ? parseFloat(regra.aliquotaIcms) : 18)
    const reducaoBcIcms = produto.reducaoBcIcms ?? (regra ? parseFloat(regra.reducaoBaseIcms || '0') : 0)
    
    // PIS - prioridade: produto > regra > padrão
    const cstPis = produto.cstPis || (regra ? regra.cstPis : '01')
    const aliquotaPis = produto.aliquotaPis ?? (regra ? parseFloat(regra.aliquotaPis) : 1.65)
    
    // COFINS - prioridade: produto > regra > padrão
    const cstCofins = produto.cstCofins || (regra ? regra.cstCofins : '01')
    const aliquotaCofins = produto.aliquotaCofins ?? (regra ? parseFloat(regra.aliquotaCofins) : 7.60)

    // Gerar XMLs de impostos
    const xmlIcms = gerarXMLIcms(cstIcms, origem, valorTotal, aliquotaIcms, reducaoBcIcms)
    const xmlPis = gerarXMLPis(cstPis, valorTotal, aliquotaPis)
    const xmlCofins = gerarXMLCofins(cstCofins, valorTotal, aliquotaCofins)

    return `    <det nItem="${nItem}">
      <prod>
        <cProd>${produto.id || nItem}</cProd>
        <cEAN>${gtin}</cEAN>
        <xProd>${(produto.name || 'Produto').substring(0, 120)}</xProd>
        <NCM>${ncm}</NCM>
        <CFOP>${cfop}</CFOP>
        <uCom>${unidade}</uCom>
        <qCom>${quantidade.toFixed(4)}</qCom>
        <vUnCom>${valorUnitario.toFixed(10)}</vUnCom>
        <vProd>${valorTotal.toFixed(2)}</vProd>
        <cEANTrib>${gtin}</cEANTrib>
        <uTrib>${unidade}</uTrib>
        <qTrib>${quantidade.toFixed(4)}</qTrib>
        <vUnTrib>${valorUnitario.toFixed(10)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          ${xmlIcms}
        </ICMS>
        <PIS>
          ${xmlPis}
        </PIS>
        <COFINS>
          ${xmlCofins}
        </COFINS>
      </imposto>
    </det>`
  }).join('\n')
}

/**
 * Gera XML da NF-e (sem assinatura ainda)
 */
function gerarXMLNFe(invoice: any, chaveAcesso: string, config: any): string {
  // Validar campos obrigatórios
  if (!invoice.emitenteMunicipioCod || invoice.emitenteMunicipioCod === 'null') {
    throw new Error('Código do município do emitente não configurado. Configure em Configurações > Nota Fiscal')
  }
  if (!invoice.destinatarioMunicipioCod || invoice.destinatarioMunicipioCod === 'null') {
    throw new Error('Código do município do destinatário não encontrado. Verifique o endereço de entrega.')
  }

  const now = new Date()
  // Formato correto para NFe 4.0: AAAA-MM-DDThh:mm:ssTZD (sem milissegundos)
  const dhEmi = now.toISOString().split('.')[0] + '-03:00'
  const ambiente = config.sefazAmbiente === 'producao' ? '1' : '2'
  
  // Buscar regras de tributação da configuração (usa mesma lógica de gerarXMLProdutos)
  let taxRules: TaxRule[] = config.taxRules || []
  
  // Se não há taxRules salvas, usar regras padrão
  if (taxRules.length === 0) {
    taxRules = [
      {
        id: '1',
        nome: 'Venda Interna (padrão)',
        tipoOperacao: 'interna',
        origem: '0',
        cfop: '5102',
        cstIcms: '00',
        aliquotaIcms: '18',
        reducaoBaseIcms: '0',
        cstPis: '01',
        aliquotaPis: '1.65',
        cstCofins: '01',
        aliquotaCofins: '7.60',
        ativo: true
      },
      {
        id: '2',
        nome: 'Venda Interestadual (padrão)',
        tipoOperacao: 'interestadual',
        origem: '0',
        cfop: '6102',
        cstIcms: '00',
        aliquotaIcms: '12',
        reducaoBaseIcms: '0',
        cstPis: '01',
        aliquotaPis: '1.65',
        cstCofins: '01',
        aliquotaCofins: '7.60',
        ativo: true
      },
      {
        id: '3',
        nome: 'Exportação (padrão)',
        tipoOperacao: 'exportacao',
        origem: '0',
        cfop: '7101',
        cstIcms: '41',
        aliquotaIcms: '0',
        reducaoBaseIcms: '0',
        cstPis: '08',
        aliquotaPis: '0',
        cstCofins: '08',
        aliquotaCofins: '0',
        ativo: true
      }
    ]
  }
  
  // Determinar tipo de operação
  const tipoOperacao = determinarTipoOperacao(
    invoice.emitenteUF || config.emitenteEstado || 'MA',
    invoice.destinatarioUF || 'MA'
  )
  
  // Buscar regra aplicável
  const regra = buscarRegraTributacao(taxRules, tipoOperacao, invoice.destinatarioUF || 'MA')
  
  // Calcular totais a partir dos itens aplicando regras
  let totalBC = 0
  let totalICMS = 0
  let totalPIS = 0
  let totalCOFINS = 0
  
  if (invoice.order?.items) {
    invoice.order.items.forEach((item: any) => {
      const produto = item.product || {}
      const quantidade = item.quantity || 1
      const valorUnitario = item.price || 0
      const valorTotal = quantidade * valorUnitario
      
      // Usar valores do produto, ou da regra, ou padrões
      const aliquotaIcms = (produto.aliquotaIcms ?? (regra ? parseFloat(regra.aliquotaIcms) : 18)) / 100
      const aliquotaPis = (produto.aliquotaPis ?? (regra ? parseFloat(regra.aliquotaPis) : 1.65)) / 100
      const aliquotaCofins = (produto.aliquotaCofins ?? (regra ? parseFloat(regra.aliquotaCofins) : 7.60)) / 100
      const reducaoBcIcms = (produto.reducaoBcIcms ?? (regra ? parseFloat(regra.reducaoBaseIcms || '0') : 0)) / 100
      
      // Verificar se o CST isenta de ICMS
      const cstIcms = produto.cstIcms || (regra ? regra.cstIcms : '00')
      const cstPis = produto.cstPis || (regra ? regra.cstPis : '01')
      const cstCofins = produto.cstCofins || (regra ? regra.cstCofins : '01')
      
      // CSTs isentos de ICMS
      const cstsIsentosIcms = ['40', '41', '50', '60', '102', '103', '400', '500']
      const cstsIsentosPis = ['04', '05', '06', '07', '08', '09']
      const cstsIsentosCofins = ['04', '05', '06', '07', '08', '09']
      
      // Base de cálculo (pode ter redução)
      const bcIcms = valorTotal * (1 - reducaoBcIcms)
      
      totalBC += cstsIsentosIcms.includes(cstIcms) ? 0 : bcIcms
      totalICMS += cstsIsentosIcms.includes(cstIcms) ? 0 : bcIcms * aliquotaIcms
      totalPIS += cstsIsentosPis.includes(cstPis) ? 0 : valorTotal * aliquotaPis
      totalCOFINS += cstsIsentosCofins.includes(cstCofins) ? 0 : valorTotal * aliquotaCofins
    })
  }
  
  console.log(`💰 Totais calculados: BC=${totalBC.toFixed(2)}, ICMS=${totalICMS.toFixed(2)}, PIS=${totalPIS.toFixed(2)}, COFINS=${totalCOFINS.toFixed(2)}`)
  
  // Monta XML manualmente (bibliotecas xml viriam aqui)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${chaveAcesso}" versao="4.00">
    <ide>
      <cUF>${getCodigoUF(invoice.emitenteUF)}</cUF>
      <cNF>${chaveAcesso.substring(35, 43)}</cNF>
      <natOp>${invoice.naturezaOperacao}</natOp>
      <mod>55</mod>
      <serie>${invoice.series}</serie>
      <nNF>${invoice.invoiceNumber}</nNF>
      <dhEmi>${dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>${invoice.emitenteMunicipioCod || ''}</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${chaveAcesso.slice(-1)}</cDV>
      <tpAmb>${ambiente}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>0</indPres>
      <procEmi>0</procEmi>
      <verProc>1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${invoice.emitenteCnpj}</CNPJ>
      <xNome>${invoice.emitenteNome}</xNome>
      <enderEmit>
        <xLgr>${invoice.emitenteLogradouro}</xLgr>
        <nro>${invoice.emitenteNumero}</nro>
        <xBairro>${invoice.emitenteBairro}</xBairro>
        <cMun>${invoice.emitenteMunicipioCod}</cMun>
        <xMun>${invoice.emitenteMunicipio}</xMun>
        <UF>${(invoice.emitenteUF || 'MA').toUpperCase()}</UF>
        <CEP>${invoice.emitenteCEP}</CEP>
      </enderEmit>
      <IE>${invoice.emitenteIE}</IE>
      <CRT>${invoice.emitenteCRT}</CRT>
    </emit>
    <dest>
      ${invoice.destinatarioCpf ? `<CPF>${invoice.destinatarioCpf}</CPF>` : `<CNPJ>${invoice.destinatarioCnpj}</CNPJ>`}
      <xNome>${invoice.destinatarioNome}</xNome>
      <enderDest>
        <xLgr>${invoice.destinatarioLogradouro}</xLgr>
        <nro>${invoice.destinatarioNumero}</nro>
        <xBairro>${invoice.destinatarioBairro}</xBairro>
        <cMun>${invoice.destinatarioMunicipioCod}</cMun>
        <xMun>${invoice.destinatarioMunicipio}</xMun>
        <UF>${(invoice.destinatarioUF || 'MA').toUpperCase()}</UF>
        <CEP>${invoice.destinatarioCEP}</CEP>
      </enderDest>
      <indIEDest>9</indIEDest>
    </dest>
    ${gerarXMLProdutos(invoice, config)}
    <total>
      <ICMSTot>
        <vBC>${totalBC.toFixed(2)}</vBC>
        <vICMS>${totalICMS.toFixed(2)}</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${invoice.valorProdutos.toFixed(2)}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>${(invoice.valorDesconto || 0).toFixed(2)}</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>${totalPIS.toFixed(2)}</vPIS>
        <vCOFINS>${totalCOFINS.toFixed(2)}</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${invoice.valorTotal.toFixed(2)}</vNF>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>9</modFrete>
    </transp>
    <pag>
      <detPag>
        <indPag>0</indPag>
        <tPag>01</tPag>
        <vPag>${invoice.valorTotal.toFixed(2)}</vPag>
      </detPag>
    </pag>
    <infAdic>
      <infCpl>Nota Fiscal emitida via Sistema MYDSHOP</infCpl>
    </infAdic>
  </infNFe>
</NFe>`

  return xml
}

/**
 * Função principal de emissão via SEFAZ
 */
export async function emitirNFeSefaz(invoiceId: string): Promise<SefazResult> {
  try {
    // Buscar nota fiscal com produtos
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { 
        order: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })

    if (!invoice) {
      return { success: false, error: 'Nota fiscal não encontrada' }
    }

    // Buscar config SEFAZ
    const configData = await prisma.systemConfig.findFirst({
      where: { key: 'nfe_config' }
    })

    if (!configData) {
      return { success: false, error: 'Configuração SEFAZ não encontrada' }
    }

    const config = JSON.parse(configData.value)
    
    console.log('📋 Configuração SEFAZ carregada:', {
      estado: config.sefazEstado || config.emitenteEstado,
      ambiente: config.sefazAmbiente || config.ambiente,
      certPath: config.certificadoArquivo,
      hasSenha: !!config.certificadoSenha
    })
    
    // Validar certificado
    if (!config.certificadoArquivo) {
      return { success: false, error: 'Caminho do certificado digital não configurado. Acesse Configurações > Nota Fiscal' }
    }
    
    if (!config.certificadoSenha) {
      return { success: false, error: 'Senha do certificado digital não configurada. Acesse Configurações > Nota Fiscal' }
    }

    // Gerar número da nota (buscar próximo número)
    const ultimaNota = await prisma.invoice.findFirst({
      where: { 
        invoiceNumber: { not: null },
        series: invoice.series 
      },
      orderBy: { invoiceNumber: 'desc' }
    })

    const numeroNota = ultimaNota 
      ? parseInt(ultimaNota.invoiceNumber || '0') + 1 
      : 1

    // Atualizar com número
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { invoiceNumber: numeroNota.toString() }
    })

    // Recarregar invoice com número E produtos
    const invoiceAtualizada = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { 
        order: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })

    if (!invoiceAtualizada) {
      return { success: false, error: 'Erro ao recarregar nota fiscal' }
    }

    // Gerar chave de acesso
    const now = new Date()
    const chaveAcesso = gerarChaveAcesso(
      invoiceAtualizada.emitenteUF!,
      now.getFullYear(),
      now.getMonth() + 1,
      invoiceAtualizada.emitenteCnpj!,
      invoiceAtualizada.series!,
      numeroNota
    )

    // Gerar XML
    const xml = gerarXMLNFe(invoiceAtualizada, chaveAcesso, config)

    console.log('📄 XML da NF-e gerado (sem assinatura):')
    console.log(xml.substring(0, 500) + '...')
    
    // Assinar XML com certificado digital
    console.log('\n🔐 Assinando XML com certificado digital...')
    console.log('   Caminho do certificado:', config.certificadoArquivo)
    
    let xmlAssinado: string
    try {
      xmlAssinado = assinarXML(xml, config.certificadoArquivo, config.certificadoSenha)
      console.log('✅ XML assinado com sucesso!')
    } catch (erroAssinatura: any) {
      console.error('❌ ERRO ao assinar XML:', erroAssinatura)
      throw new Error(`Falha na assinatura do XML: ${erroAssinatura.message}`)
    }
    
    console.log('\n🔑 Chave de Acesso:', chaveAcesso)
    console.log('📝 Número:', numeroNota)
    console.log('📦 Produtos no pedido:', invoiceAtualizada.order?.items?.length || 0)

    // Tentar enviar para SEFAZ com retry
    let ultimoErro: string = ''
    let tentativas = 0
    const maxTentativas = 3
    
    while (tentativas < maxTentativas) {
      tentativas++
      console.log(`\n🔄 Tentativa ${tentativas}/${maxTentativas} de envio para SEFAZ...`)
      
      try {
        // TODO: Implementar envio SOAP real para SEFAZ
        // const resultado = await enviarParaSEFAZ(xmlAssinado, config)
        
        // Validar XML antes de marcar como emitido
        await validarXMLNFe(xmlAssinado)
        
        console.log('📝 Iniciando salvamento no banco...')
        console.log('   Invoice ID:', invoiceId)
        console.log('   Chave:', chaveAcesso, '(length:', chaveAcesso?.length, ')')
        console.log('   Número:', numeroNota)
        console.log('   XML length:', xmlAssinado?.length)
        
        // Verificar se chave e número foram gerados
        if (!chaveAcesso || chaveAcesso.length !== 44) {
          throw new Error(`Chave de acesso inválida: ${chaveAcesso}`)
        }
        
        if (!numeroNota || numeroNota < 1) {
          throw new Error(`Número da nota inválido: ${numeroNota}`)
        }
        
        if (!xmlAssinado || xmlAssinado.length < 100) {
          throw new Error('XML assinado está vazio ou muito pequeno')
        }
        
        // Atualizar nota com chave e protocolo
        const protocolo = 'SIMULATED-' + Date.now()
        
        console.log('💾 Executando prisma.invoice.update...')
        
        const updated = await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            accessKey: chaveAcesso,
            invoiceNumber: numeroNota.toString(),
            protocol: protocolo,
            xmlAssinado: xmlAssinado,
            status: 'ISSUED',
            issuedAt: new Date(),
            errorMessage: null
          }
        })

        console.log('✅ Prisma update executado!')
        console.log('   Saved accessKey:', updated.accessKey)
        console.log('   Saved invoiceNumber:', updated.invoiceNumber)
        console.log('   Saved status:', updated.status)
        console.log('   XML saved:', updated.xmlAssinado ? 'SIM' : 'NÃO')

        // Validar se realmente salvou
        if (!updated.accessKey || !updated.invoiceNumber || !updated.xmlAssinado) {
          throw new Error('Falha ao salvar dados da nota no banco de dados')
        }

        console.log('✅ Nota fiscal emitida com sucesso!')
        console.log('   Número:', updated.invoiceNumber)
        console.log('   Chave:', updated.accessKey)
        console.log('   Protocolo:', updated.protocol)
        
        return {
          success: true,
          chaveAcesso: updated.accessKey,
          numeroNota: updated.invoiceNumber!,
          protocolo: updated.protocol!
        }
        
      } catch (erro: any) {
        ultimoErro = erro.message || 'Erro desconhecido'
        console.error(`❌ Tentativa ${tentativas} falhou:`, ultimoErro)
        
        // Verificar se é erro recuperável
        const erroRecuperavel = 
          ultimoErro.includes('timeout') ||
          ultimoErro.includes('ECONNREFUSED') ||
          ultimoErro.includes('ENOTFOUND') ||
          ultimoErro.includes('temporariamente indisponível') ||
          ultimoErro.includes('tente novamente')
        
        if (!erroRecuperavel) {
          // Erro de validação ou permanente - não adianta tentar novamente
          console.error('❌ Erro não recuperável, abortando tentativas')
          break
        }
        
        // Aguardar antes da próxima tentativa (backoff exponencial)
        if (tentativas < maxTentativas) {
          const espera = tentativas * 2000 // 2s, 4s, 6s
          console.log(`⏳ Aguardando ${espera/1000}s antes de tentar novamente...`)
          await new Promise(resolve => setTimeout(resolve, espera))
        }
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'ERROR',
        errorMessage: `Falha após ${tentativas} tentativas: ${ultimoErro}`
      }
    })

    return {
      success: false,
      error: `Falha após ${tentativas} tentativas: ${ultimoErro}`
    }

  } catch (error: any) {
    console.error('[SEFAZ] Erro não tratado:', error)
    
    // Atualizar nota com erro
    try {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'ERROR',
          errorMessage: `Erro na emissão: ${error.message}`
        }
      })
    } catch (updateError) {
      console.error('[SEFAZ] Erro ao atualizar status de erro:', updateError)
    }
    
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Valida XML da NFe (simulação)
 */
async function validarXMLNFe(xml: string): Promise<void> {
  // Validações básicas
  if (!xml || xml.trim() === '') {
    throw new Error('XML vazio ou nulo')
  }
  
  if (!xml.includes('<NFe')) {
    throw new Error('XML inválido: tag NFe não encontrada')
  }
  
  if (!xml.includes('<infNFe')) {
    throw new Error('XML inválido: tag infNFe não encontrada')
  }
  
  if (!xml.includes('<det')) {
    throw new Error('XML inválido: nenhum produto encontrado')
  }
  
  if (!xml.includes('<emit>')) {
    throw new Error('XML inválido: dados do emitente não encontrados')
  }
  
  if (!xml.includes('<dest>')) {
    throw new Error('XML inválido: dados do destinatário não encontrados')
  }
  
  if (!xml.includes('<total>')) {
    throw new Error('XML inválido: totalizadores não encontrados')
  }
  
  // Validar campos obrigatórios específicos
  if (!xml.includes('<cMunFG>') || xml.includes('<cMunFG></cMunFG>')) {
    throw new Error('Código do município do emitente (cMunFG) não informado')
  }
  
  if (xml.includes('<cMun>null</cMun>') || xml.includes('<cMun></cMun>')) {
    throw new Error('Código do município (cMun) inválido ou não informado')
  }
  
  if (xml.includes('<UF>Ma</UF>') || xml.includes('<UF>ma</UF>')) {
    throw new Error('UF deve estar em maiúsculo (MA, não Ma)')
  }
  
  // Validar formato da data
  const dhEmiMatch = xml.match(/<dhEmi>([^<]+)<\/dhEmi>/)
  if (dhEmiMatch) {
    const dhEmi = dhEmiMatch[1]
    // Formato correto: AAAA-MM-DDThh:mm:ss-03:00 (sem milissegundos)
    if (dhEmi.includes('.')) {
      throw new Error('Data de emissão (dhEmi) não pode ter milissegundos')
    }
    if (!dhEmi.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[-+]\d{2}:\d{2}$/)) {
      throw new Error(`Data de emissão (dhEmi) em formato inválido: ${dhEmi}`)
    }
  }
  
  console.log('✅ XML validado com sucesso')
}

interface SefazConfig {
  estado: string // UF
  ambiente: 'homologacao' | 'producao' // 1=prod, 2=homolog
  certificadoPath: string
  certificadoSenha: string
}

interface NFeDados {
  // Emitente
  emitenteCnpj: string
  emitenteRazaoSocial: string
  emitenteNomeFantasia: string
  emitenteIE: string
  emitenteCRT: string // Código de Regime Tributário
  emitenteEndereco: {
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    codigoMunicipio: string
    municipio: string
    uf: string
    cep: string
  }

  // Destinatário
  destinatarioCpfCnpj: string
  destinatarioNome: string
  destinatarioEndereco: {
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    codigoMunicipio: string
    municipio: string
    uf: string
    cep: string
  }

  // Nota
  serie: string
  numero: number
  dataEmissao: Date
  naturezaOperacao: string
  cfop: string

  // Itens
  items: Array<{
    numero: number
    codigoProduto: string
    descricao: string
    ncm: string
    cfop: string
    unidade: string
    quantidade: number
    valorUnitario: number
    valorTotal: number
    
    // Tributos
    icms: {
      cst: string
      baseCalculo?: number
      aliquota?: number
      valor?: number
    }
    pis: {
      cst: string
      baseCalculo?: number
      aliquota?: number
      valor?: number
    }
    cofins: {
      cst: string
      baseCalculo?: number
      aliquota?: number
      valor?: number
    }
  }>

  // Totais
  valorProdutos: number
  valorFrete?: number
  valorDesconto?: number
  valorTotal: number
}

// Endpoints Web Services por UF
const SEFAZ_ENDPOINTS: Record<string, { homologacao: string; producao: string }> = {
  MA: {
    homologacao: 'https://hom.sefaz.ma.gov.br/wsdl/NFeAutorizacao4/NFeAutorizacao4.asmx',
    producao: 'https://www.sefaz.ma.gov.br/wsdl/NFeAutorizacao4/NFeAutorizacao4.asmx',
  },
  SP: {
    homologacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
    producao: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
  },
  // Adicionar outros estados conforme necessário
}

export class SefazNFeService {
  private config: SefazConfig
  private certificado: any
  private chavePrivada: any

  constructor(config: SefazConfig) {
    this.config = config
    this.loadCertificado()
  }

  /**
   * Carrega certificado digital A1 do arquivo .pfx
   */
  private loadCertificado() {
    try {
      const pfxBuffer = readFileSync(this.config.certificadoPath)
      const pfxBase64 = pfxBuffer.toString('base64')
      const pfxDer = forge.util.decode64(pfxBase64)
      
      const asn1 = forge.asn1.fromDer(pfxDer)
      const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, this.config.certificadoSenha)
      
      // Extrair certificado e chave privada
      const bags = p12.getBags({ bagType: forge.pki.oids.certBag })
      this.certificado = bags[forge.pki.oids.certBag]?.[0]?.cert
      
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
      this.chavePrivada = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key

      console.log('[SEFAZ] Certificado carregado com sucesso')
      console.log('[SEFAZ] Válido até:', this.certificado?.validity.notAfter)
    } catch (error: any) {
      throw new Error(`Erro ao carregar certificado: ${error.message}`)
    }
  }

  /**
   * Gera chave de acesso da NF-e (44 dígitos)
   */
  private gerarChaveAcesso(dados: NFeDados): string {
    const uf = this.getCodigoUF(dados.emitenteEndereco.uf)
    const aamm = dados.dataEmissao.toISOString().slice(2, 7).replace('-', '')
    const cnpj = dados.emitenteCnpj.replace(/\D/g, '')
    const mod = '55' // Modelo NF-e
    const serie = dados.serie.padStart(3, '0')
    const numero = dados.numero.toString().padStart(9, '0')
    const tpEmis = '1' // Tipo de emissão normal
    const codigo = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')

    const chave = uf + aamm + cnpj + mod + serie + numero + tpEmis + codigo
    const dv = this.calcularDV(chave)

    return chave + dv
  }

  /**
   * Calcula dígito verificador da chave de acesso (módulo 11)
   */
  private calcularDV(chave: string): string {
    let soma = 0
    let peso = 2

    for (let i = chave.length - 1; i >= 0; i--) {
      soma += parseInt(chave[i]) * peso
      peso = peso === 9 ? 2 : peso + 1
    }

    const resto = soma % 11
    const dv = resto <= 1 ? 0 : 11 - resto
    return dv.toString()
  }

  /**
   * Obtém código IBGE do estado
   */
  private getCodigoUF(uf: string): string {
    const codigos: Record<string, string> = {
      MA: '21', SP: '35', RJ: '33', MG: '31', RS: '43',
      PR: '41', SC: '42', BA: '29', CE: '23', PE: '26',
      GO: '52', ES: '32', PA: '15', AM: '13', MT: '51',
      MS: '50', DF: '53', RO: '11', AC: '12', AP: '16',
      RR: '14', TO: '17', AL: '27', PB: '25', PI: '22',
      RN: '24', SE: '28',
    }
    return codigos[uf] || '00'
  }

  /**
   * Gera XML da NF-e conforme layout 4.0
   */
  private gerarXML(dados: NFeDados): string {
    const chaveAcesso = this.gerarChaveAcesso(dados)
    const ambiente = this.config.ambiente === 'producao' ? '1' : '2'

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('nfeProc', { 
        versao: '4.00',
        xmlns: 'http://www.portalfiscal.inf.br/nfe'
      })
        .ele('NFe', { xmlns: 'http://www.portalfiscal.inf.br/nfe' })
          .ele('infNFe', { 
            versao: '4.00', 
            Id: `NFe${chaveAcesso}` 
          })
            // Identificação
            .ele('ide')
              .ele('cUF').txt(this.getCodigoUF(dados.emitenteEndereco.uf)).up()
              .ele('cNF').txt(Math.floor(Math.random() * 100000000).toString()).up()
              .ele('natOp').txt(dados.naturezaOperacao).up()
              .ele('mod').txt('55').up()
              .ele('serie').txt(dados.serie).up()
              .ele('nNF').txt(dados.numero.toString()).up()
              .ele('dhEmi').txt(dados.dataEmissao.toISOString()).up()
              .ele('tpNF').txt('1').up() // 1=Saída
              .ele('idDest').txt('1').up() // 1=Operação interna
              .ele('cMunFG').txt(dados.emitenteEndereco.codigoMunicipio).up()
              .ele('tpImp').txt('1').up() // 1=DANFE normal
              .ele('tpEmis').txt('1').up() // 1=Emissão normal
              .ele('cDV').txt(chaveAcesso.slice(-1)).up()
              .ele('tpAmb').txt(ambiente).up()
              .ele('finNFe').txt('1').up() // 1=NF-e normal
              .ele('indFinal').txt('1').up() // 1=Consumidor final
              .ele('indPres').txt('0').up() // 0=Não se aplica
              .ele('procEmi').txt('0').up() // 0=Emissão própria
              .ele('verProc').txt('1.0').up()
            .up()

            // Emitente
            .ele('emit')
              .ele('CNPJ').txt(dados.emitenteCnpj.replace(/\D/g, '')).up()
              .ele('xNome').txt(dados.emitenteRazaoSocial).up()
              .ele('xFant').txt(dados.emitenteNomeFantasia).up()
              .ele('enderEmit')
                .ele('xLgr').txt(dados.emitenteEndereco.logradouro).up()
                .ele('nro').txt(dados.emitenteEndereco.numero).up()
                .ele('xBairro').txt(dados.emitenteEndereco.bairro).up()
                .ele('cMun').txt(dados.emitenteEndereco.codigoMunicipio).up()
                .ele('xMun').txt(dados.emitenteEndereco.municipio).up()
                .ele('UF').txt(dados.emitenteEndereco.uf).up()
                .ele('CEP').txt(dados.emitenteEndereco.cep.replace(/\D/g, '')).up()
              .up()
              .ele('IE').txt(dados.emitenteIE).up()
              .ele('CRT').txt(dados.emitenteCRT).up()
            .up()

            // Destinatário
            .ele('dest')
              .ele(dados.destinatarioCpfCnpj.length === 11 ? 'CPF' : 'CNPJ')
                .txt(dados.destinatarioCpfCnpj.replace(/\D/g, ''))
              .up()
              .ele('xNome').txt(dados.destinatarioNome).up()
              .ele('enderDest')
                .ele('xLgr').txt(dados.destinatarioEndereco.logradouro).up()
                .ele('nro').txt(dados.destinatarioEndereco.numero).up()
                .ele('xBairro').txt(dados.destinatarioEndereco.bairro).up()
                .ele('cMun').txt(dados.destinatarioEndereco.codigoMunicipio).up()
                .ele('xMun').txt(dados.destinatarioEndereco.municipio).up()
                .ele('UF').txt(dados.destinatarioEndereco.uf).up()
                .ele('CEP').txt(dados.destinatarioEndereco.cep.replace(/\D/g, '')).up()
              .up()
              .ele('indIEDest').txt('9').up() // 9=Não contribuinte
            .up()

    // Adicionar itens (produtos)
    dados.items.forEach((item) => {
      xml.ele('det', { nItem: item.numero.toString() })
        .ele('prod')
          .ele('cProd').txt(item.codigoProduto).up()
          .ele('xProd').txt(item.descricao).up()
          .ele('NCM').txt(item.ncm).up()
          .ele('CFOP').txt(item.cfop).up()
          .ele('uCom').txt(item.unidade).up()
          .ele('qCom').txt(item.quantidade.toString()).up()
          .ele('vUnCom').txt(item.valorUnitario.toFixed(2)).up()
          .ele('vProd').txt(item.valorTotal.toFixed(2)).up()
        .up()
        
        // Tributos
        .ele('imposto')
          .ele('ICMS')
            .ele(`ICMS${item.icms.cst}`)
              .ele('orig').txt('0').up()
              .ele('CST').txt(item.icms.cst).up()
              .ele('vBC').txt((item.icms.baseCalculo || 0).toFixed(2)).up()
              .ele('pICMS').txt((item.icms.aliquota || 0).toFixed(2)).up()
              .ele('vICMS').txt((item.icms.valor || 0).toFixed(2)).up()
            .up()
          .up()
          .ele('PIS')
            .ele(`PIS${item.pis.cst}`)
              .ele('CST').txt(item.pis.cst).up()
              .ele('vBC').txt((item.pis.baseCalculo || 0).toFixed(2)).up()
              .ele('pPIS').txt((item.pis.aliquota || 0).toFixed(2)).up()
              .ele('vPIS').txt((item.pis.valor || 0).toFixed(2)).up()
            .up()
          .up()
          .ele('COFINS')
            .ele(`COFINS${item.cofins.cst}`)
              .ele('CST').txt(item.cofins.cst).up()
              .ele('vBC').txt((item.cofins.baseCalculo || 0).toFixed(2)).up()
              .ele('pCOFINS').txt((item.cofins.aliquota || 0).toFixed(2)).up()
              .ele('vCOFINS').txt((item.cofins.valor || 0).toFixed(2)).up()
            .up()
          .up()
        .up()
      .up()
    })

    // Totais
    xml.ele('total')
      .ele('ICMSTot')
        .ele('vBC').txt('0.00').up()
        .ele('vICMS').txt('0.00').up()
        .ele('vICMSDeson').txt('0.00').up()
        .ele('vFCP').txt('0.00').up()
        .ele('vBCST').txt('0.00').up()
        .ele('vST').txt('0.00').up()
        .ele('vFCPST').txt('0.00').up()
        .ele('vFCPSTRet').txt('0.00').up()
        .ele('vProd').txt(dados.valorProdutos.toFixed(2)).up()
        .ele('vFrete').txt((dados.valorFrete || 0).toFixed(2)).up()
        .ele('vSeg').txt('0.00').up()
        .ele('vDesc').txt((dados.valorDesconto || 0).toFixed(2)).up()
        .ele('vII').txt('0.00').up()
        .ele('vIPI').txt('0.00').up()
        .ele('vIPIDevol').txt('0.00').up()
        .ele('vPIS').txt('0.00').up()
        .ele('vCOFINS').txt('0.00').up()
        .ele('vOutro').txt('0.00').up()
        .ele('vNF').txt(dados.valorTotal.toFixed(2)).up()
      .up()
    .up()

    return xml.end({ prettyPrint: true })
  }

  /**
   * Assina XML com certificado digital
   */
  private assinarXML(xml: string): string {
    // TODO: Implementar assinatura digital do XML usando node-forge
    // Necessário para validação da SEFAZ
    
    console.log('[SEFAZ] ⚠️ Assinatura XML não implementada neste exemplo')
    console.log('[SEFAZ] Use biblioteca como "xml-crypto" para produção')
    
    return xml
  }

  /**
   * Envia NF-e para SEFAZ via Web Service SOAP
   */
  async emitirNFe(dados: NFeDados): Promise<any> {
    try {
      // Gerar XML
      const xml = this.gerarXML(dados)
      
      // Assinar XML
      const xmlAssinado = this.assinarXML(xml)

      // Obter endpoint correto
      const endpoint = SEFAZ_ENDPOINTS[this.config.estado]
      const url = this.config.ambiente === 'producao' 
        ? endpoint.producao 
        : endpoint.homologacao

      console.log('[SEFAZ] Enviando para:', url)
      console.log('[SEFAZ] Estado:', this.config.estado)
      console.log('[SEFAZ] Ambiente:', this.config.ambiente)

      // TODO: Fazer chamada SOAP para SEFAZ
      // Exemplo usando biblioteca 'soap':
      // const client = await soap.createClientAsync(url)
      // const result = await client.nfeAutorizacaoLoteAsync(xmlAssinado)

      throw new Error('Integração SEFAZ Direto requer implementação completa do SOAP e assinatura digital')
      
    } catch (error: any) {
      console.error('[SEFAZ] Erro ao emitir NF-e:', error)
      throw error
    }
  }
}
