import { NextRequest, NextResponse } from 'next/server'
import { correiosCWS } from '@/lib/correios-cws'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/shipping/tracking?codigo=XX123456789BR
 * Rastreia encomenda via API oficial dos Correios CWS (autenticada)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const codigo = searchParams.get('codigo')

    if (!codigo || codigo.length < 13) {
      return NextResponse.json({ error: 'Código de rastreio inválido' }, { status: 400 })
    }

    // Validar formato do código (2 letras + 9 números + 2 letras)
    const codigoRegex = /^[A-Z]{2}\d{9}[A-Z]{2}$/
    if (!codigoRegex.test(codigo.toUpperCase())) {
      return NextResponse.json({ error: 'Formato de código inválido. Use: XX123456789BR' }, { status: 400 })
    }

    const result = await correiosCWS.rastrearObjeto(codigo.toUpperCase())

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erro ao rastrear encomenda' }, { status: 502 })
    }

    if (!result.eventos || result.eventos.length === 0) {
      return NextResponse.json({ error: 'Nenhum evento encontrado para este objeto' }, { status: 404 })
    }

    // Mapear eventos do formato CWS para o formato do front
    const eventos = result.eventos.map((evento: any) => ({
      descricao: evento.descricao || evento.tipo || 'Evento',
      local: evento.unidade?.nome
        ? `${evento.unidade.nome}${evento.unidade.endereco?.cidade ? ' - ' + evento.unidade.endereco.cidade : ''}`
        : (evento.unidade?.endereco?.cidade || 'Local não informado'),
      data: formatarData(evento.dtHrCriado),
      hora: formatarHora(evento.dtHrCriado),
    }))

    return NextResponse.json({ codigo: codigo.toUpperCase(), eventos })
  } catch (error) {
    console.error('Erro no rastreamento:', error)
    return NextResponse.json({ error: 'Erro ao rastrear encomenda' }, { status: 500 })
  }
}

function formatarData(dataISO: string): string {
  if (!dataISO) return ''
  try {
    return new Date(dataISO).toLocaleDateString('pt-BR')
  } catch {
    return dataISO.split('T')[0] || ''
  }
}

function formatarHora(dataISO: string): string {
  if (!dataISO) return ''
  try {
    return new Date(dataISO).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dataISO.split('T')[1]?.substring(0, 5) || ''
  }
}
