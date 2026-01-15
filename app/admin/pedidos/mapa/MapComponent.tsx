'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Corrigir ícones do Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

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

interface MapComponentProps {
  pedidos: Pedido[]
  center: [number, number]
  zoom: number
}

const statusColors: { [key: string]: string } = {
  PENDING: 'bg-yellow-500',
  PROCESSING: 'bg-blue-500',
  SHIPPED: 'bg-purple-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-500'
}

const statusLabels: { [key: string]: string } = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado'
}

export default function MapComponent({ pedidos, center, zoom }: MapComponentProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      key={`${center[0]}-${center[1]}-${zoom}`}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      
      {pedidos.map((pedido) => (
        <Marker 
          key={pedido.id} 
          position={[pedido.lat, pedido.lng]}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <div className="font-bold text-lg mb-2">
                Pedido #{pedido.id.slice(0, 8)}
              </div>
              
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-semibold">Cliente:</span> {pedido.cliente}
                </div>
                <div>
                  <span className="font-semibold">Local:</span> {pedido.cidade}, {pedido.estadoNome}
                </div>
                <div>
                  <span className="font-semibold">Valor:</span> R$ {pedido.total.toFixed(2)}
                </div>
                <div>
                  <span className="font-semibold">Data:</span> {new Date(pedido.createdAt).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-semibold">Status:</span>
                  <span className={`px-2 py-1 rounded text-white text-xs ${statusColors[pedido.status]}`}>
                    {statusLabels[pedido.status] || pedido.status}
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
