import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar configuração de NF-e
    const config = await prisma.systemConfig.findFirst({
      where: { key: 'nfe_config' },
    })

    const parsedConfig = config ? JSON.parse(config.value) : null
    
    // Separar taxRules da config principal
    const taxRules = parsedConfig?.taxRules || []
    
    return NextResponse.json({
      config: parsedConfig,
      taxRules: taxRules,
    })
  } catch (error: any) {
    console.error('[Config NF-e GET] Erro:', error)
    return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const data = await req.json()

    // Validar campos obrigatórios
    const requiredFields = [
      'emitenteCnpj',
      'emitenteRazaoSocial',
      'emitenteInscricaoEstadual',
      'emitenteLogradouro',
      'emitenteNumero',
      'emitenteBairro',
      'emitenteCidade',
      'emitenteEstado',
      'emitenteCep',
      'serieNfe',
      'cfopPadrao',
      'naturezaOperacao',
      'ambiente',
      'provedor',
    ]

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Campo obrigatório não preenchido: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validar certificado digital se for A1
    if (data.certificadoTipo === 'A1') {
      if (!data.certificadoArquivo || !data.certificadoSenha) {
        return NextResponse.json(
          { error: 'Certificado A1 requer arquivo .pfx e senha' },
          { status: 400 }
        )
      }
    }

    // Validar credenciais do provedor
    if (data.provedor === 'nfeio' && (!data.nfeioApiKey || !data.nfeioCompanyId)) {
      return NextResponse.json(
        { error: 'NFe.io requer API Key e Company ID' },
        { status: 400 }
      )
    }

    if (data.provedor === 'bling' && !data.blingApiKey) {
      return NextResponse.json(
        { error: 'Bling requer API Key' },
        { status: 400 }
      )
    }

    if (data.provedor === 'focus' && !data.focusApiToken) {
      return NextResponse.json(
        { error: 'Focus NFe requer API Token' },
        { status: 400 }
      )
    }

    // Salvar ou atualizar configuração
    await prisma.systemConfig.upsert({
      where: { key: 'nfe_config' },
      create: {
        key: 'nfe_config',
        value: JSON.stringify(data),
        category: 'nfe',
        label: 'Configurações de Nota Fiscal',
        description: 'Configurações para emissão de NF-e',
        type: 'json',
      },
      update: {
        value: JSON.stringify(data),
        updatedAt: new Date(),
      },
    })

    console.log('[Config NF-e] Configurações salvas por:', session.user.email)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Config NF-e POST] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configurações', details: error.message },
      { status: 500 }
    )
  }
}
