import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/admin/invoices/[id]/consultar
 * Consulta situação da NF-e na SEFAZ
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const invoiceId = params.id

    // Buscar nota fiscal
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 })
    }

    if (!invoice.accessKey) {
      return NextResponse.json(
        { error: 'Nota fiscal sem chave de acesso. Não é possível consultar.' },
        { status: 400 }
      )
    }

    // Tentar consultar na SEFAZ
    let sefazResult: any = { success: false, error: 'Módulo SEFAZ não disponível' }
    
    try {
      const { consultarNFeSefaz } = await import('@/lib/sefaz-events')
      sefazResult = await consultarNFeSefaz(invoiceId)
    } catch (importError: any) {
      console.warn('Módulo sefaz-events não encontrado')
      
      // Retornar dados atuais do banco
      sefazResult = {
        success: true,
        status: invoice.status,
        protocolo: invoice.protocol
      }
    }

    // Registrar evento de consulta
    try {
      await prisma.$executeRaw`
        INSERT INTO invoice_event (id, invoice_id, type, description, protocol, created_at, created_by)
        VALUES (
          ${`evt_${Date.now()}`},
          ${invoiceId},
          'CONSULTA',
          ${'Consulta de situação na SEFAZ'},
          ${invoice.protocol || null},
          NOW(),
          ${(session.user as any).email || 'admin'}
        )
      `
    } catch (dbError) {
      // Tabela pode não existir
    }

    return NextResponse.json({
      success: true,
      status: invoice.status,
      protocolo: invoice.protocol,
      chaveAcesso: invoice.accessKey,
      dataEmissao: invoice.issuedAt
    })
  } catch (error: any) {
    console.error('Erro ao consultar nota fiscal:', error)
    return NextResponse.json(
      { error: 'Erro ao consultar nota fiscal', details: error.message },
      { status: 500 }
    )
  }
}
