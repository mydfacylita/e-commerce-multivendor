import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/config/correios
 * Busca configurações dos Correios
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar configurações
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { startsWith: 'correios.' }
      }
    })

    const configMap: Record<string, string> = {}
    configs.forEach((c: { key: string; value: string }) => {
      configMap[c.key.replace('correios.', '')] = c.value
    })

    return NextResponse.json({
      config: {
        enabled: configMap['enabled'] === 'true',
        usuario: configMap['usuario'] || '',
        senha: configMap['senha'] || '',
        codigoAdministrativo: configMap['codigoAdministrativo'] || '',
        cartaoPostagem: configMap['cartaoPostagem'] || '',
        cnpj: configMap['cnpj'] || '',
        cepOrigem: configMap['cepOrigem'] || '',
        servicoSedex: configMap['servicoSedex'] !== 'false',
        servicoPac: configMap['servicoPac'] !== 'false',
        servicoSedex10: configMap['servicoSedex10'] === 'true',
        servicoSedex12: configMap['servicoSedex12'] === 'true',
        servicoSedexHoje: configMap['servicoSedexHoje'] === 'true',
      }
    })
  } catch (error) {
    console.error('Erro ao buscar config correios:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * POST /api/admin/config/correios
 * Salva configurações dos Correios
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { config } = await request.json()

    if (!config) {
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 400 })
    }

    // Salvar cada configuração
    const keysToSave = [
      { key: 'correios.enabled', value: String(config.enabled || false), label: 'Correios Ativo' },
      { key: 'correios.usuario', value: config.usuario || '', label: 'Usuário Correios' },
      { key: 'correios.senha', value: config.senha || '', label: 'Senha Correios' },
      { key: 'correios.codigoAdministrativo', value: config.codigoAdministrativo || '', label: 'Código Administrativo' },
      { key: 'correios.cartaoPostagem', value: config.cartaoPostagem || '', label: 'Cartão Postagem' },
      { key: 'correios.cnpj', value: config.cnpj || '', label: 'CNPJ' },
      { key: 'correios.cepOrigem', value: config.cepOrigem || '', label: 'CEP Origem' },
      { key: 'correios.servicoSedex', value: String(config.servicoSedex || false), label: 'SEDEX Ativo' },
      { key: 'correios.servicoPac', value: String(config.servicoPac || false), label: 'PAC Ativo' },
      { key: 'correios.servicoSedex10', value: String(config.servicoSedex10 || false), label: 'SEDEX 10 Ativo' },
      { key: 'correios.servicoSedex12', value: String(config.servicoSedex12 || false), label: 'SEDEX 12 Ativo' },
      { key: 'correios.servicoSedexHoje', value: String(config.servicoSedexHoje || false), label: 'SEDEX Hoje Ativo' },
    ]

    for (const item of keysToSave) {
      await prisma.systemConfig.upsert({
        where: { key: item.key },
        create: { 
          key: item.key, 
          value: item.value,
          category: 'correios',
          label: item.label,
          type: 'text'
        },
        update: { value: item.value }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar config correios:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
