'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { FiMapPin, FiPackage, FiDollarSign, FiX } from 'react-icons/fi'
import 'leaflet/dist/leaflet.css'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Importar componente do mapa dinamicamente (só no cliente)
const MapComponent = dynamic(
  () => import('./MapComponent'),
  { ssr: false }
)

interface Pedido {
  id: string
  total: number
  status: string
  createdAt: string
  cliente: string
  endereco: string
  estado: string
  estadoNome: string
  cidade: string
  lat: number
  lng: number
}

interface Estado {
  estado: string
  nome: string
  total: number
  pedidos: number
  lat: number
  lng: number
}

export default function MapaPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [estados, setEstados] = useState<Estado[]>([])
  const [loading, setLoading] = useState(true)
  const [estadoSelecionado, setEstadoSelecionado] = useState<string | null>(null)
  const [center, setCenter] = useState<[number, number]>([-14.235, -51.9253]) // Centro do Brasil
  const [zoom, setZoom] = useState(4)

  useEffect(() => {
    loadPedidos()
  }, [estadoSelecionado])

  const loadPedidos = async () => {
    try {
      setLoading(true)
      const url = estadoSelecionado 
        ? `/api/admin/pedidos/mapa?estado=${estadoSelecionado}`
        : '/api/admin/pedidos/mapa'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setPedidos(data.pedidos)
        setEstados(data.estados)
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEstadoClick = (estado: Estado) => {
    setEstadoSelecionado(estado.estado)
    setCenter([estado.lat, estado.lng])
    setZoom(7)
  }

  const handleResetView = () => {
    setEstadoSelecionado(null)
    setCenter([-14.235, -51.9253])
    setZoom(4)
  }

  if (loading && pedidos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando mapa de pedidos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mapa de Pedidos</h1>
            <p className="text-sm text-gray-600">
              {estadoSelecionado 
                ? `Visualizando: ${estados.find(e => e.estado === estadoSelecionado)?.nome || estadoSelecionado}`
                : 'Visão geral do Brasil'
              } • {pedidos.length} pedidos
            </p>
          </div>
          {estadoSelecionado && (
            <button
              onClick={handleResetView}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <FiX />
              Voltar ao Brasil
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar com lista de estados */}
        {!estadoSelecionado && (
          <div className="w-80 bg-white border-r overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Estados</h2>
              <p className="text-sm text-gray-600">Clique para visualizar</p>
            </div>
            <div className="divide-y">
              {estados
                .sort((a, b) => b.pedidos - a.pedidos)
                .map((estado) => (
                  <button
                    key={estado.estado}
                    onClick={() => handleEstadoClick(estado)}
                    className="w-full px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{estado.nome}</span>
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                        {estado.pedidos}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {estado.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Mapa */}
        <div className="flex-1 relative">
          <MapComponent 
            pedidos={pedidos}
            center={center}
            zoom={zoom}
          />

          {/* Stats overlay */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
            <div className="space-y-2">
              <div>
                <div className="text-xs text-gray-600">Total de Pedidos</div>
                <div className="text-2xl font-bold text-gray-900">{pedidos.length}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Valor Total</div>
                <div className="text-xl font-bold text-primary-600">
                  {pedidos.reduce((sum, p) => sum + p.total, 0).toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL',
                    maximumFractionDigits: 0 
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
