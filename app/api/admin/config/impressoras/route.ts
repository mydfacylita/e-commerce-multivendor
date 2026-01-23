import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const CONFIG_KEY = 'printers.config'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar configuração salva
    const config = await prisma.systemConfig.findUnique({
      where: { key: CONFIG_KEY }
    })

    if (config?.value) {
      try {
        const parsed = JSON.parse(config.value)
        return NextResponse.json(parsed)
      } catch {
        return NextResponse.json({
          printers: [],
          labelFormats: [],
          generalConfig: {}
        })
      }
    }

    // Retornar configuração padrão
    return NextResponse.json({
      printers: [],
      labelFormats: [
        { id: 'correios-100x125', name: 'Correios (100x125mm)', width: 100, height: 125, marginTop: 3, marginLeft: 3, gap: 3, columns: 1, isDefault: true },
        { id: 'correios-100x150', name: 'Correios (100x150mm)', width: 100, height: 150, marginTop: 3, marginLeft: 3, gap: 3, columns: 1, isDefault: false },
        { id: 'produto-50x30', name: 'Produto (50x30mm)', width: 50, height: 30, marginTop: 2, marginLeft: 2, gap: 2, columns: 1, isDefault: false },
        { id: 'gondola-80x40', name: 'Gôndola (80x40mm)', width: 80, height: 40, marginTop: 2, marginLeft: 2, gap: 2, columns: 1, isDefault: false },
      ],
      generalConfig: {
        defaultLabelPrinter: '',
        defaultA4Printer: '',
        defaultReceiptPrinter: '',
        autoprint: false,
        printNfeOnApproval: false,
        printLabelOnGenerate: true,
        labelFormat: 'correios-100x125',
        labelCopies: 1,
        nfeCopies: 1,
      }
    })
  } catch (error) {
    console.error('Erro ao buscar config de impressoras:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { printers, labelFormats, generalConfig } = body

    // Salvar no systemConfig
    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      update: {
        value: JSON.stringify({ printers, labelFormats, generalConfig }),
        updatedAt: new Date()
      },
      create: {
        key: CONFIG_KEY,
        value: JSON.stringify({ printers, labelFormats, generalConfig }),
        category: 'impressoras',
        type: 'json',
        label: 'Configuração de Impressoras'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao salvar config de impressoras:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
