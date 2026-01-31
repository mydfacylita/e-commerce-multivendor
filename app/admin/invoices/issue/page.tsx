'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { FiArrowLeft, FiFileText } from 'react-icons/fi'
import { z } from 'zod'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

interface Order {
  id: string
  buyerName: string
  buyerCpf: string
  buyerEmail: string
  total: number
  status: string
  createdAt: string
  items: Array<{
    id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      sku: string
      gtin: string
      ncm: string
      sellerId: string | null
    }
  }>
}

const issueSchema = z.object({
  orderId: z.string().min(1, 'Selecione um pedido'),
  cfop: z.string().length(4, 'CFOP deve ter 4 dígitos').optional(),
  naturezaOperacao: z.string().min(3, 'Natureza da operação é obrigatória').optional(),
  emitenteCnpj: z.string().optional(),
  emitenteNome: z.string().optional(),
  series: z.string().optional()
})

export default function IssueInvoicePage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [formData, setFormData] = useState({
    orderId: '',
    cfop: '5102',
    naturezaOperacao: 'Venda de mercadoria',
    emitenteCnpj: '',
    emitenteNome: '',
    series: '1'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      // Buscar pedidos pagos sem nota fiscal
      const res = await fetch('/api/admin/orders?status=PROCESSING&paymentStatus=approved&withoutInvoice=true')
      if (!res.ok) throw new Error('Erro ao carregar pedidos')

      const data = await res.json()
      setOrders(data.data || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOrderSelect = (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    setSelectedOrder(order || null)
    setFormData({ ...formData, orderId })
    setErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validar
    const result = issueSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    if (!selectedOrder) {
      toast.error('Selecione um pedido')
      return
    }

    // Validações adicionais
    if (!selectedOrder.buyerCpf) {
      toast.error('O pedido selecionado não possui CPF/CNPJ do cliente')
      return
    }

    try {
      setIssuing(true)
      const res = await fetch('/api/admin/invoices/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      const data = await res.json()
      toast.success(data.message || 'Nota fiscal criada com sucesso')
      router.push('/admin/invoices')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIssuing(false)
    }
  }

  const getInvoiceType = (order: Order | null) => {
    if (!order) return null
    const hasSellerProducts = order.items.some(item => item.product.sellerId)
    return hasSellerProducts ? 'VENDEDOR' : 'ADMINISTRATIVA'
  }

  return (
    <div className="p-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <FiArrowLeft />
        Voltar
      </button>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FiFileText className="text-blue-600 text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Emitir Nota Fiscal</h1>
              <p className="text-gray-600">Preencha os dados para emissão da NF-e</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Seleção de Pedido */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Pedido *
                </label>
                <select
                  value={formData.orderId}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 ${
                    errors.orderId ? 'border-red-500' : ''
                  }`}
                >
                  <option value="">Selecione um pedido</option>
                  {orders.map(order => (
                    <option key={order.id} value={order.id}>
                      #{order.id.substring(0, 8)} - {order.buyerName} - R$ {order.total.toFixed(2)}
                    </option>
                  ))}
                </select>
                {errors.orderId && (
                  <p className="text-red-500 text-sm mt-1">{errors.orderId}</p>
                )}
                {orders.length === 0 && (
                  <p className="text-gray-500 text-sm mt-2">
                    Nenhum pedido disponível para emissão de nota fiscal
                  </p>
                )}
              </div>

              {/* Detalhes do Pedido Selecionado */}
              {selectedOrder && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Informações do Pedido</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Cliente:</span>
                      <p className="font-medium">{selectedOrder.buyerName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">CPF/CNPJ:</span>
                      <p className="font-medium">{selectedOrder.buyerCpf || 'Não informado'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium">{selectedOrder.buyerEmail || 'Não informado'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Valor Total:</span>
                      <p className="font-medium text-lg">R$ {selectedOrder.total.toFixed(2)}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Tipo de Nota:</span>
                      <p className="font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          getInvoiceType(selectedOrder) === 'ADMINISTRATIVA'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {getInvoiceType(selectedOrder)}
                        </span>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Produtos:</span>
                      <ul className="mt-2 space-y-1">
                        {selectedOrder.items.map(item => (
                          <li key={item.id} className="text-sm">
                            • {item.product.name} - {item.quantity}x R$ {item.price.toFixed(2)}
                            {item.product.sellerId && (
                              <span className="ml-2 text-blue-600">(Vendedor)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* CFOP */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  CFOP (Código Fiscal de Operações)
                </label>
                <input
                  type="text"
                  value={formData.cfop}
                  onChange={(e) => setFormData({ ...formData, cfop: e.target.value })}
                  placeholder="5102"
                  maxLength={4}
                  className={`w-full border rounded-lg px-3 py-2 ${
                    errors.cfop ? 'border-red-500' : ''
                  }`}
                />
                {errors.cfop && (
                  <p className="text-red-500 text-sm mt-1">{errors.cfop}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  Ex: 5102 - Venda mercadoria adquirida de terceiros
                </p>
              </div>

              {/* Natureza da Operação */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Natureza da Operação
                </label>
                <input
                  type="text"
                  value={formData.naturezaOperacao}
                  onChange={(e) => setFormData({ ...formData, naturezaOperacao: e.target.value })}
                  placeholder="Venda de mercadoria"
                  className={`w-full border rounded-lg px-3 py-2 ${
                    errors.naturezaOperacao ? 'border-red-500' : ''
                  }`}
                />
                {errors.naturezaOperacao && (
                  <p className="text-red-500 text-sm mt-1">{errors.naturezaOperacao}</p>
                )}
              </div>

              {/* Série */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Série
                </label>
                <input
                  type="text"
                  value={formData.series}
                  onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                  placeholder="1"
                  className="w-full border rounded-lg px-3 py-2"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Série da nota fiscal (padrão: 1)
                </p>
              </div>

              {/* Dados do Emitente (Opcional) */}
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Dados do Emitente (Opcional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      value={formData.emitenteCnpj}
                      onChange={(e) => setFormData({ ...formData, emitenteCnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Razão Social
                    </label>
                    <input
                      type="text"
                      value={formData.emitenteNome}
                      onChange={(e) => setFormData({ ...formData, emitenteNome: e.target.value })}
                      placeholder="Nome da empresa"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Se não informado, será usado o cadastro padrão do sistema
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50"
                  disabled={issuing}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={issuing || !selectedOrder}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {issuing ? 'Emitindo...' : 'Emitir Nota Fiscal'}
                </button>
              </div>

              {/* Aviso */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Após a emissão, a nota fiscal será processada e enviada 
                  para a SEFAZ. Certifique-se de que todos os dados estão corretos antes de prosseguir.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
