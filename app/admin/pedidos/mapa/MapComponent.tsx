'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Criar ícones personalizados por cor
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  })
}

// Ícones por status
const statusIcons: { [key: string]: L.DivIcon } = {
  PENDING: createColoredIcon('#EF4444'),      // Vermelho
  PROCESSING: createColoredIcon('#F59E0B'),   // Amarelo/Laranja
  SHIPPED: createColoredIcon('#F59E0B'),      // Amarelo
  DELIVERED: createColoredIcon('#22C55E'),    // Verde
  CANCELLED: createColoredIcon('#6B7280'),    // Cinza
}

// Ícone padrão amarelo
const defaultIcon = createColoredIcon('#F59E0B')

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
          icon={statusIcons[pedido.status] || defaultIcon}
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
