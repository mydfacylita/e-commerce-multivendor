'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FiArrowLeft, FiPackage, FiMapPin, FiClock } from 'react-icons/fi'

interface Order {
  id: string
  total: number
  status: string
  shippingAddress: string
  createdAt: string
  items: {
    id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      slug: string
      images: string[]
    }
  }[]
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchOrder()
    }
  }, [status, router, params.id])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      } else {
        router.push('/pedidos')
      }
    } catch (error) {
      console.error('Erro ao buscar pedido:', error)
      router.push('/pedidos')
    } finally {
      setIsLoading(false)
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
          <p className="mt-4 text-gray-600">Carregando pedido...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/pedidos"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <FiArrowLeft className="mr-2" />
        Voltar para Meus Pedidos
      </Link>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white px-6 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Pedido #{order.id.slice(0, 8)}</h1>
              <div className="flex items-center space-x-2 text-primary-100">
                <FiClock size={16} />
                <span>
                  {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                order.status
              )}`}
            >
              {getStatusText(order.status)}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-8">
            <div className="flex items-start space-x-3 mb-4">
              <FiMapPin className="text-gray-400 mt-1" size={20} />
              <div>
                <h2 className="font-semibold text-lg mb-1">Endereço de Entrega</h2>
                <p className="text-gray-600">{order.shippingAddress}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center">
              <FiPackage className="mr-2" />
              Itens do Pedido
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                      {item.product.images[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FiPackage className="text-gray-400" size={24} />
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/produtos/${item.product.slug}`}
                        className="font-semibold hover:text-primary-600"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-sm text-gray-600">Quantidade: {item.quantity}</p>
                      <p className="text-sm text-gray-600">
                        Preço unitário: R$ {item.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>R$ {order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Frete</span>
                <span className="text-green-600">Grátis</span>
              </div>
            </div>
            <div className="flex justify-between text-2xl font-bold border-t pt-4">
              <span>Total</span>
              <span className="text-primary-600">R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-2">Status do Pedido</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status !== 'PENDING' ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              {order.status !== 'PENDING' && <span className="text-white">✓</span>}
            </div>
            <p className="ml-3">Pedido realizado</p>
          </div>
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status === 'PROCESSING' ||
                order.status === 'SHIPPED' ||
                order.status === 'DELIVERED'
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            >
              {(order.status === 'PROCESSING' ||
                order.status === 'SHIPPED' ||
                order.status === 'DELIVERED') && <span className="text-white">✓</span>}
            </div>
            <p className="ml-3">Processando</p>
          </div>
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status === 'SHIPPED' || order.status === 'DELIVERED'
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            >
              {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                <span className="text-white">✓</span>
              )}
            </div>
            <p className="ml-3">Enviado</p>
          </div>
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              {order.status === 'DELIVERED' && <span className="text-white">✓</span>}
            </div>
            <p className="ml-3">Entregue</p>
          </div>
        </div>
      </div>
    </div>
  )
}
