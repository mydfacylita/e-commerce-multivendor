import { NextRequest, NextResponse } from 'next/server'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// API Key do remove.bg - Você pode obter uma gratuita em https://www.remove.bg/api
const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as Blob
    
    if (!image) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 })
    }

    // Se não tem API key, usar processamento local simples
    if (!REMOVE_BG_API_KEY) {
      // Fallback: processar localmente (menos qualidade)
      return await processLocally(image)
    }

    // Enviar para remove.bg
    const removeBgFormData = new FormData()
    removeBgFormData.append('image_file', image)
    removeBgFormData.append('size', 'auto')
    removeBgFormData.append('bg_color', '') // Transparente

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY
      },
      body: removeBgFormData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Remove.bg error:', errorText)
      
      // Se a API falhar, tentar processamento local
      return await processLocally(image)
    }

    const resultBuffer = await response.arrayBuffer()
    
    return new NextResponse(resultBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400'
      }
    })

  } catch (error) {
    console.error('Erro ao remover fundo:', error)
    return NextResponse.json({ error: 'Erro ao processar imagem' }, { status: 500 })
  }
}

// Processamento local simples (sem IA)
async function processLocally(image: Blob): Promise<NextResponse> {
  // Por enquanto, retornar a imagem original
  // Uma implementação mais avançada poderia usar sharp para manipulação
  const buffer = await image.arrayBuffer()
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400'
    }
  })
}
