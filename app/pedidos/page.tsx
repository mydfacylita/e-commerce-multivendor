'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FiPackage, FiClock, FiCheckCircle, FiTruck } from 'react-icons/fi'
import { formatOrderNumber } from '@/lib/order'
import { formatCurrency, formatDate } from '@/lib/format'

interface Order {
  id: string
  parentOrderId: string | null
  total: number
  status: string
  createdAt: string
  items: {
    id: string
    quantity: number
    price: number
    product: {
      name: string
      images: string[]
    }
  }[]
}

export default function PedidosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchOrders()
    }
  }, [status, router])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Agrupar pedidos por parentOrderId para o cliente
  const groupedOrders = orders.reduce((acc, order) => {
    const groupKey = order.parentOrderId || order.id
    
    if (!acc[groupKey]) {
      acc[groupKey] = {
        id: groupKey,
        displayId: order.parentOrderId || order.id,
        status: order.status,
        createdAt: order.createdAt,
        total: 0,
        items: [],
        subOrders: []
      }
    }
    
    acc[groupKey].total += order.total
    acc[groupKey].items.push(...order.items)
    acc[groupKey].subOrders.push(order.id)
    
    return acc
  }, {} as Record<string, any>)

  const displayOrders = Object.values(groupedOrders)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <FiCheckCircle className="text-green-500" size={24} />
      case 'SHIPPED':
        return <FiTruck className="text-blue-500" size={24} />
      case 'PROCESSING':
        return <FiClock className="text-yellow-500" size={24} />
      default:
        return <FiPackage className="text-gray-500" size={24} />
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      PENDING: 'Pendente',
      PROCESSING: 'Processando',
      SHIPPED: 'Enviado',
      DELIVERED: 'Entregue',
      CANCELLED: 'Cancelado',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      PENDING: 'bg-gray-100 text-gray-800',
      PROCESSING: 'bg-yellow-100 text-yellow-800',
      SHIPPED: 'bg-blue-100 text-blue-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando pedidos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Meus Pedidos</h1>

      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiPackage size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Nenhum pedido ainda</h2>
          <p className="text-gray-600 mb-6">
            Você ainda não fez nenhum pedido. Que tal começar agora?
          </p>
          <Link
            href="/produtos"
            className="bg-primary-600 text-white px-8 py-3 rounded-md hover:bg-primary-700 inline-block"
          >
            Ver Produtos
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {displayOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(order.status)}
                  <div>
                    <p className="text-sm text-gray-600">Pedido {formatOrderNumber(order.displayId)}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </p>
                    {order.subOrders.length > 1 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {order.subOrders.length} itens de vendedores diferentes
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {order.items.map((item: any) => {
                    // Parsear images se for string JSON
                    const images = typeof item.product.images === 'string' 
                      ? JSON.parse(item.product.images) 
                      : item.product.images
                    const imageUrl = images?.[0] || '/placeholder.jpg'
                    
                    return (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                            {imageUrl !== '/placeholder.jpg' ? (
                              <Image
                                src={imageUrl}
                                alt={item.product.name}
                                fill
                                className="object-cover rounded-md"
                              />
                            ) : (
                              <FiPackage className="text-gray-400" />
                            )}
                          </div>
                        <div>
                          <p className="font-semibold">{item.product.name}</p>
                          <p className="text-sm text-gray-600">
                            Quantidade: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  )})}
                </div>

                <div className="mt-6 pt-4 border-t flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-primary-600">
                      Total: {formatCurrency(order.total)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    {order.status === 'PENDING' && (
                      <Link
                        href={`/checkout/pagamento/${order.subOrders[0]}`}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-semibold"
                      >
                        Pagar Agora
                      </Link>
                    )}
                    <Link
                      href={`/pedidos/${order.subOrders[0]}`}
                      className="text-primary-600 hover:text-primary-700 font-semibold"
                    >
                      Ver Detalhes →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
