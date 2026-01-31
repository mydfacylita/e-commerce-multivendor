import { NextRequest, NextResponse } from 'next/server'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'URL não fornecida' }, { status: 400 })
    }

    // Validar URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }

    // Buscar imagem
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erro ao buscar imagem' },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type')

    // Verificar se é imagem
    if (!contentType?.startsWith('image/')) {
      return NextResponse.json(
        { error: 'URL não é uma imagem válida' },
        { status: 400 }
      )
    }

    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Erro no proxy de imagem:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
