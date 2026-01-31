import { NextRequest, NextResponse } from 'next/server'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET /api/shipping/tracking?codigo=XX123456789BR
 * Rastreia encomenda nos Correios
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

    // Tentar rastrear via API pública
    const resultado = await rastrearEncomenda(codigo.toUpperCase())

    if (resultado.erro) {
      return NextResponse.json({ error: resultado.erro }, { status: 404 })
    }

    return NextResponse.json(resultado)
  } catch (error) {
    console.error('Erro no rastreamento:', error)
    return NextResponse.json({ error: 'Erro ao rastrear encomenda' }, { status: 500 })
  }
}

/**
 * Rastreia encomenda usando API alternativa
 * (A API oficial dos Correios requer contrato)
 */
async function rastrearEncomenda(codigo: string): Promise<{
  codigo: string
  eventos?: Array<{
    descricao: string
    local: string
    data: string
    hora: string
  }>
  erro?: string
}> {
  try {
    // Usar a API do Link Correios (alternativa gratuita)
    const url = `https://proxyapp.correios.com.br/v1/sro-rastro/${codigo}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      // Tentar API alternativa
      return await rastrearViaAlternativa(codigo)
    }

    const data = await response.json()

    if (!data.objetos || data.objetos.length === 0) {
      return { codigo, erro: 'Objeto não encontrado' }
    }

    const objeto = data.objetos[0]
    
    if (!objeto.eventos || objeto.eventos.length === 0) {
      return { codigo, erro: 'Nenhum evento encontrado para este objeto' }
    }

    const eventos = objeto.eventos.map((evento: any) => ({
      descricao: evento.descricao || 'Evento',
      local: evento.unidade?.nome 
        ? `${evento.unidade.nome} - ${evento.unidade.endereco?.cidade || ''}`
        : 'Local não informado',
      data: formatarData(evento.dtHrCriado),
      hora: formatarHora(evento.dtHrCriado)
    }))

    return { codigo, eventos }
  } catch (error) {
    console.error('Erro ao rastrear:', error)
    return await rastrearViaAlternativa(codigo)
  }
}

/**
 * Rastreamento via API alternativa (fallback)
 */
async function rastrearViaAlternativa(codigo: string): Promise<{
  codigo: string
  eventos?: Array<{
    descricao: string
    local: string
    data: string
    hora: string
  }>
  erro?: string
}> {
  try {
    // API alternativa: linkcorreios
    const url = `https://api.linkcorreios.com.br/?codigo=${codigo}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      return { codigo, erro: 'Não foi possível rastrear. Tente novamente mais tarde.' }
    }

    const data = await response.json()

    if (data.error || !data.eventos || data.eventos.length === 0) {
      return { codigo, erro: data.message || 'Objeto não encontrado ou sem movimentação' }
    }

    const eventos = data.eventos.map((evento: any) => ({
      descricao: evento.status || evento.descricao || 'Evento',
      local: evento.local || evento.unidade || 'Local não informado',
      data: evento.data || '',
      hora: evento.hora || ''
    }))

    return { codigo, eventos }
  } catch (error) {
    console.error('Erro na API alternativa:', error)
    return { codigo, erro: 'Serviço de rastreamento temporariamente indisponível' }
  }
}

function formatarData(dataISO: string): string {
  if (!dataISO) return ''
  try {
    const data = new Date(dataISO)
    return data.toLocaleDateString('pt-BR')
  } catch {
    return dataISO.split('T')[0] || ''
  }
}

function formatarHora(dataISO: string): string {
  if (!dataISO) return ''
  try {
    const data = new Date(dataISO)
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dataISO.split('T')[1]?.substring(0, 5) || ''
  }
}
