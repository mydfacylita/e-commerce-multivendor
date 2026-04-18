import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { consultarSituacaoNFe } from '@/lib/sefaz-nfe'
import { readFileSync } from 'fs'
import * as forge from 'node-forge'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const orderId = params.id

    // Buscar invoice do pedido
    const invoice = await prisma.invoice.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    })

    if (!invoice?.accessKey) {
      return NextResponse.json(
        { error: 'NF-e sem chave de acesso para consultar' },
        { status: 400 }
      )
    }

    // Buscar config SEFAZ
    const configData = await prisma.systemConfig.findFirst({
      where: { key: 'nfe_config' },
    })

    if (!configData) {
      return NextResponse.json(
        { error: 'Configuração SEFAZ não encontrada' },
        { status: 400 }
      )
    }

    const config = JSON.parse(configData.value)

    // Extrair cert/key do PFX
    const pfxBuffer = readFileSync(config.certificadoArquivo)
    const pfxBase64 = pfxBuffer.toString('base64')
    const p12Asn1 = forge.asn1.fromDer(forge.util.decode64(pfxBase64))
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, config.certificadoSenha || '')
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const certBag = bags[forge.pki.oids.certBag]?.[0]
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
    if (!certBag?.cert || !keyBag?.key) {
      return NextResponse.json({ error: 'Certificado inválido' }, { status: 500 })
    }
    const certPem = forge.pki.certificateToPem(certBag.cert)
    const keyPem = forge.pki.privateKeyToPem(keyBag.key)

    const uf = (config.sefazEstado || config.emitenteEstado || 'MA').toUpperCase()
    const ambiente = config.sefazAmbiente || config.ambiente || 'homologacao'

    const resultado = await consultarSituacaoNFe(
      invoice.accessKey,
      certPem,
      keyPem,
      uf,
      ambiente
    )

    // Se autorizada, atualizar invoice
    if (resultado.success && resultado.protocolo) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'ISSUED',
          protocol: resultado.protocolo,
          errorMessage: null,
          issuedAt: new Date(),
        },
      })
      return NextResponse.json({
        success: true,
        message: `NF-e autorizada! Protocolo: ${resultado.protocolo}`,
        cStat: resultado.cStat,
        protocolo: resultado.protocolo,
      })
    }

    return NextResponse.json({
      success: false,
      error: resultado.error,
      cStat: resultado.cStat,
    })
  } catch (error: any) {
    console.error('Erro ao consultar situação NF-e:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}
