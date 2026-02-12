'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { FiX, FiShoppingBag, FiTrendingUp, FiPackage, FiDollarSign, FiUsers, FiShare2 } from 'react-icons/fi'
import Link from 'next/link'

interface PartnerChoiceModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PartnerChoiceModal({ isOpen, onClose }: PartnerChoiceModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900">
                    Como você quer ser nosso parceiro?
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FiX size={24} />
                  </button>
                </div>

                <p className="text-gray-600 mb-8">
                  Escolha a melhor opção para você e comece a ganhar dinheiro com MYDSHOP!
                </p>

                {/* Opções */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Opção Vendedor */}
                  <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-primary-500 transition-all hover:shadow-lg group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-primary-100 rounded-lg group-hover:bg-primary-500 transition-colors">
                        <FiShoppingBag className="text-primary-600 group-hover:text-white transition-colors" size={28} />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">Seja um Vendedor</h4>
                    </div>

                    <p className="text-gray-600 mb-4">
                      Venda seus próprios produtos no marketplace e tenha sua loja online completa.
                    </p>

                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-2">
                        <FiPackage className="text-primary-600 mt-1 flex-shrink-0" size={18} />
                        <span className="text-sm text-gray-700">Venda produtos físicos ou importados</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FiDollarSign className="text-primary-600 mt-1 flex-shrink-0" size={18} />
                        <span className="text-sm text-gray-700">Comissão de acordo com seu plano</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FiTrendingUp className="text-primary-600 mt-1 flex-shrink-0" size={18} />
                        <span className="text-sm text-gray-700">Painel completo para gestão de vendas</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FiUsers className="text-primary-600 mt-1 flex-shrink-0" size={18} />
                        <span className="text-sm text-gray-700">Alcance milhares de compradores</span>
                      </li>
                    </ul>

                    <Link
                      href="/vendedor/cadastro"
                      onClick={onClose}
                      className="block w-full bg-primary-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
                    >
                      Quero Vender Produtos
                    </Link>
                  </div>

                  {/* Opção Afiliado */}
                  <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-accent-500 transition-all hover:shadow-lg group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-accent-100 rounded-lg group-hover:bg-accent-500 transition-colors">
                        <FiShare2 className="text-accent-600 group-hover:text-white transition-colors" size={28} />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">Seja um Afiliado</h4>
                    </div>

                    <p className="text-gray-600 mb-4">
                      Divulgue nossos produtos nas redes sociais e ganhe comissão por cada venda.
                    </p>

                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-2">
                        <FiShare2 className="text-accent-600 mt-1 flex-shrink-0" size={18} />
                        <span className="text-sm text-gray-700">Divulgue produtos nas suas redes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FiDollarSign className="text-accent-600 mt-1 flex-shrink-0" size={18} />
                        <span className="text-sm text-gray-700">Ganho de Comissão em Cada Venda</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FiTrendingUp className="text-accent-600 mt-1 flex-shrink-0" size={18} />
                        <span className="text-sm text-gray-700">Acompanhe suas vendas em tempo real</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FiUsers className="text-accent-600 mt-1 flex-shrink-0" size={18} />
                        <span className="text-sm text-gray-700">Links únicos de rastreamento</span>
                      </li>
                    </ul>

                    <Link
                      href="/afiliado/cadastro"
                      onClick={onClose}
                      className="block w-full bg-accent-500 text-white text-center py-3 rounded-lg font-semibold hover:bg-accent-600 transition-colors"
                    >
                      Quero Ser Afiliado
                    </Link>
                  </div>
                </div>

                {/* Informações adicionais */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 text-center">
                    <span className="font-semibold">Não sabe qual escolher?</span> Ambas as opções são gratuitas e você pode começar imediatamente após a aprovação.
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
