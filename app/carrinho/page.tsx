'use client'

import { useCartStore } from '@/lib/store'
import Image from 'next/image'
import Link from 'next/link'
import { FiTrash2, FiMinus, FiPlus } from 'react-icons/fi'

export default function CarrinhoPage() {
  const { items, removeItem, updateQuantity, clearCart, total } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-8">Carrinho de Compras</h1>
        <p className="text-xl text-gray-500 mb-8">Seu carrinho está vazio</p>
        <Link
          href="/produtos"
          className="bg-primary-600 text-white px-8 py-3 rounded-md hover:bg-primary-700 inline-block"
        >
          Continuar Comprando
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Carrinho de Compras</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            {items.map((item) => (
              <div key={item.id} className="flex items-center border-b py-4 last:border-b-0">
                <div className="relative h-24 w-24 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 ml-4">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <p className="text-primary-600 font-bold">
                    R$ {item.price.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center border rounded-md">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="p-2 hover:bg-gray-100"
                    >
                      <FiMinus />
                    </button>
                    <span className="px-4 py-2 border-x">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 hover:bg-gray-100"
                    >
                      <FiPlus />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <FiTrash2 size={20} />
                  </button>
                </div>

                <div className="ml-4 font-bold text-lg">
                  R$ {(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}

            <button
              onClick={clearCart}
              className="mt-4 text-red-500 hover:text-red-700 font-semibold"
            >
              Limpar Carrinho
            </button>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
            <h2 className="text-2xl font-bold mb-4">Resumo do Pedido</h2>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>R$ {total().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frete</span>
                <span className="text-green-600">Grátis</span>
              </div>
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-primary-600">R$ {total().toFixed(2)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700 text-center font-semibold"
            >
              Finalizar Compra
            </Link>

            <Link
              href="/produtos"
              className="block w-full mt-4 text-center text-primary-600 hover:text-primary-700"
            >
              Continuar Comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
