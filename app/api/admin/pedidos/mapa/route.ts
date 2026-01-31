import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Coordenadas das capitais como fallback
const estadosCoordenadas: Record<string, { lat: number; lng: number; nome: string }> = {
  AC: { lat: -9.0238, lng: -70.8120, nome: 'Acre' },
  AL: { lat: -9.6658, lng: -35.7350, nome: 'Alagoas' },
  AP: { lat: 0.0350, lng: -51.0694, nome: 'Amapá' },
  AM: { lat: -3.1190, lng: -60.0217, nome: 'Amazonas' },
  BA: { lat: -12.9714, lng: -38.5014, nome: 'Bahia' },
  CE: { lat: -3.7172, lng: -38.5433, nome: 'Ceará' },
  DF: { lat: -15.7975, lng: -47.8919, nome: 'Distrito Federal' },
  ES: { lat: -20.3155, lng: -40.3128, nome: 'Espírito Santo' },
  GO: { lat: -16.6869, lng: -49.2648, nome: 'Goiás' },
  MA: { lat: -2.5297, lng: -44.3028, nome: 'Maranhão' },
  MT: { lat: -15.6014, lng: -56.0979, nome: 'Mato Grosso' },
  MS: { lat: -20.4697, lng: -54.6201, nome: 'Mato Grosso do Sul' },
  MG: { lat: -19.9167, lng: -43.9345, nome: 'Minas Gerais' },
  PA: { lat: -1.4558, lng: -48.5044, nome: 'Pará' },
  PB: { lat: -7.1219, lng: -34.8450, nome: 'Paraíba' },
  PR: { lat: -25.4195, lng: -49.2646, nome: 'Paraná' },
  PE: { lat: -8.0476, lng: -34.8770, nome: 'Pernambuco' },
  PI: { lat: -5.0892, lng: -42.8034, nome: 'Piauí' },
  RJ: { lat: -22.9068, lng: -43.1729, nome: 'Rio de Janeiro' },
  RN: { lat: -5.7945, lng: -35.2110, nome: 'Rio Grande do Norte' },
  RS: { lat: -30.0346, lng: -51.2177, nome: 'Rio Grande do Sul' },
  RO: { lat: -8.7612, lng: -63.9004, nome: 'Rondônia' },
  RR: { lat: 2.8235, lng: -60.6758, nome: 'Roraima' },
  SC: { lat: -27.5954, lng: -48.5480, nome: 'Santa Catarina' },
  SP: { lat: -23.5505, lng: -46.6333, nome: 'São Paulo' },
  SE: { lat: -10.9472, lng: -37.0731, nome: 'Sergipe' },
  TO: { lat: -10.1842, lng: -48.3336, nome: 'Tocantins' }
}

// Cache de coordenadas por cidade para evitar chamadas repetidas
const coordenadasCache = new Map<string, { lat: number; lng: number } | null>()

// Função para extrair CEP do endereço
function extrairCEP(endereco: string): string | null {
  const match = endereco.match(/\b\d{5}-?\d{3}\b/)
  return match ? match[0].replace('-', '') : null
}

// Função com timeout
async function fetchComTimeout(url: string, options: RequestInit, timeout = 3000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Função para buscar dados do CEP via ViaCEP
async function buscarDadosCEP(cep: string) {
  try {
    const response = await fetchComTimeout(`https://viacep.com.br/ws/${cep}/json/`, {}, 2000)
    if (!response.ok) return null
    const data = await response.json()
    if (data.erro) return null
    return {
      cidade: data.localidade,
      estado: data.uf,
    }
  } catch (error) {
    return null
  }
}

// Função para geocoding usando Nominatim (OpenStreetMap)
async function geocodificarCidade(cidade: string, estado: string) {
  const chaveCache = `${cidade}-${estado}`
  
  // Verificar cache
  if (coordenadasCache.has(chaveCache)) {
    return coordenadasCache.get(chaveCache)
  }

  try {
    const query = encodeURIComponent(`${cidade}, ${estado}, Brasil`)
    const response = await fetchComTimeout(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          'User-Agent': 'MYDSHOP-Ecommerce/1.0',
        },
      },
      3000
    )
    
    if (!response.ok) {
      coordenadasCache.set(chaveCache, null)
      return null
    }
    
    const data = await response.json()
    if (data.length === 0) {
      coordenadasCache.set(chaveCache, null)
      return null
    }
    
    const coords = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    }
    
    coordenadasCache.set(chaveCache, coords)
    
    // Aguardar 1 segundo entre chamadas (política do Nominatim)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return coords
  } catch (error) {
    coordenadasCache.set(chaveCache, null)
    return null
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const estado = searchParams.get('estado')

    // Buscar pedidos com endereços
    const pedidos = await prisma.order.findMany({
      where: estado ? {
        shippingAddress: {
          contains: estado
        }
      } : {},
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        shippingAddress: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: estado ? 500 : 100 // Limitar para performance
    })

    // Processar pedidos - usar coordenadas dos estados primeiro (rápido)
    const pedidosComLocalizacao = pedidos.map((pedido) => {
      let estadoUF = ''
      let cidade = ''
      let lat: number | undefined
      let lng: number | undefined

      if (pedido.shippingAddress) {
        // Extrair estado do endereço (formato: "Rua X, Cidade - UF, CEP")
        const matchEstado = pedido.shippingAddress.match(/\b([A-Z]{2})\b/)
        if (matchEstado) {
          estadoUF = matchEstado[1]
        }
        
        // Extrair cidade
        const cidadeMatch = pedido.shippingAddress.match(/,\s*([^,]+)\s*-\s*[A-Z]{2}/)
        if (cidadeMatch) {
          cidade = cidadeMatch[1].trim()
        }

        // Usar coordenadas da capital do estado como fallback
        if (estadoUF && estadosCoordenadas[estadoUF]) {
          lat = estadosCoordenadas[estadoUF].lat
          lng = estadosCoordenadas[estadoUF].lng
        }
      }

      return {
        id: pedido.id,
        total: pedido.total,
        status: pedido.status,
        createdAt: pedido.createdAt,
        cliente: pedido.user?.name || 'Cliente',
        endereco: pedido.shippingAddress,
        estado: estadoUF,
        estadoNome: estadoUF && estadosCoordenadas[estadoUF] ? estadosCoordenadas[estadoUF].nome : estadoUF,
        cidade,
        lat,
        lng
      }
    })

    // Filtrar apenas pedidos com coordenadas válidas
    const pedidosValidos = pedidosComLocalizacao.filter(p => p.lat && p.lng)

    // Agrupar por estado
    const pedidosPorEstado = pedidosValidos.reduce((acc, pedido) => {
      if (!acc[pedido.estado]) {
        acc[pedido.estado] = {
          estado: pedido.estado,
          nome: pedido.estado,
          total: 0,
          pedidos: 0,
          lat: pedido.lat,
          lng: pedido.lng
        }
      }
      acc[pedido.estado].total += pedido.total
      acc[pedido.estado].pedidos += 1
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      pedidos: pedidosValidos,
      estados: Object.values(pedidosPorEstado),
      total: pedidosValidos.length
    })

  } catch (error) {
    console.error('Erro ao buscar pedidos no mapa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
