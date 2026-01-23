'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Tag, Search, RefreshCw, Edit, Trash2, Printer, 
  Eye, AlertCircle, CheckCircle, Clock, XCircle,
  Package, MapPin, Phone, Mail, FileText, Download,
  ChevronDown, ChevronUp, Save, X, Truck
} from 'lucide-react'
import Link from 'next/link'

interface Etiqueta {
  id: string
  orderId: string
  trackingCode: string
  correiosIdPrePostagem: string
  status: 'CRIADA' | 'IMPRESSA' | 'POSTADA' | 'CANCELADA'
  formato: string
  peso: number
  altura: number
  largura: number
  comprimento: number
  valorDeclarado: number
  servicoCodigo: string
  servicoNome: string
  remetente: {
    nome: string
    cnpj: string
    logradouro: string
    numero: string
    bairro: string
    cidade: string
    uf: string
    cep: string
    telefone: string
    email: string
  }
  destinatario: {
    nome: string
    cpfCnpj: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    uf: string
    cep: string
    telefone: string
    email: string
  }
  nfe?: {
    numero: string
    serie: string
    chave: string
  }
  criadaEm: string
  atualizadaEm: string
  order: {
    id: string
    buyerName: string
    total: number
    status: string
    createdAt: string
  }
}

interface EtiquetaFormData {
  destinatario: {
    nome: string
    cpfCnpj: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    uf: string
    cep: string
    telefone: string
    email: string
  }
  peso: number
  altura: number
  largura: number
  comprimento: number
  nfeChave?: string
  nfeNumero?: string
  nfeSerie?: string
}

type FilterStatus = 'all' | 'CRIADA' | 'IMPRESSA' | 'POSTADA' | 'CANCELADA'

export default function GestaoEtiquetasPage() {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EtiquetaFormData | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const loadEtiquetas = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      if (search) params.set('search', search)
      
      const res = await fetch(`/api/admin/etiquetas?${params}`)
      const data = await res.json()
      
      if (data.etiquetas) {
        setEtiquetas(data.etiquetas)
      }
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar etiquetas' })
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    loadEtiquetas()
  }, [loadEtiquetas])

  const handleEdit = (etiqueta: Etiqueta) => {
    setEditingId(etiqueta.id)
    setEditForm({
      destinatario: { ...etiqueta.destinatario },
      peso: etiqueta.peso,
      altura: etiqueta.altura,
      largura: etiqueta.largura,
      comprimento: etiqueta.comprimento,
      nfeChave: etiqueta.nfe?.chave,
      nfeNumero: etiqueta.nfe?.numero,
      nfeSerie: etiqueta.nfe?.serie
    })
    setExpandedId(etiqueta.id)
  }

  const handleSaveEdit = async (etiquetaId: string) => {
    if (!editForm) return
    
    try {
      setProcessing(etiquetaId)
      
      const res = await fetch(`/api/admin/etiquetas/${etiquetaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Etiqueta atualizada com sucesso!' })
        setEditingId(null)
        setEditForm(null)
        loadEtiquetas()
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar etiqueta' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao atualizar etiqueta' })
    } finally {
      setProcessing(null)
    }
  }

  const handleCancel = async (etiquetaId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta etiqueta? Esta ação não pode ser desfeita.')) {
      return
    }
    
    try {
      setProcessing(etiquetaId)
      
      const res = await fetch(`/api/admin/etiquetas/${etiquetaId}/cancelar`, {
        method: 'POST'
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Etiqueta cancelada com sucesso!' })
        loadEtiquetas()
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao cancelar etiqueta' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao cancelar etiqueta' })
    } finally {
      setProcessing(null)
    }
  }

  const handlePrint = async (etiquetaId: string, orderId: string) => {
    try {
      setProcessing(etiquetaId)
      window.open(`/api/admin/expedicao/${orderId}/etiqueta-pdf`, '_blank')
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao imprimir etiqueta' })
    } finally {
      setProcessing(null)
    }
  }

  const handleConsultarCorreios = async (etiquetaId: string) => {
    try {
      setProcessing(etiquetaId)
      
      const res = await fetch(`/api/admin/etiquetas/${etiquetaId}/consultar`)
      const data = await res.json()
      
      if (res.ok) {
        setMessage({ type: 'success', text: `Status: ${data.status || 'Consultado'}` })
        loadEtiquetas()
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao consultar' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao consultar nos Correios' })
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string, text: string, icon: React.ReactNode }> = {
      'CRIADA': { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Clock className="w-3 h-3" /> },
      'IMPRESSA': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Printer className="w-3 h-3" /> },
      'POSTADA': { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      'CANCELADA': { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3 h-3" /> }
    }
    const badge = badges[status] || badges['CRIADA']
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon} {status}
      </span>
    )
  }

  const getFormatoLabel = (formato: string) => {
    const formatos: Record<string, string> = {
      '1': 'Envelope',
      '2': 'Caixa/Pacote',
      '3': 'Cilindro'
    }
    return formatos[formato] || formato
  }

  const getServicoLabel = (codigo: string) => {
    const servicos: Record<string, string> = {
      '03220': 'SEDEX',
      '03298': 'PAC',
      '04162': 'SEDEX Contrato',
      '04669': 'PAC Contrato'
    }
    return servicos[codigo] || codigo
  }

  const estadosBrasileiros = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-7 h-7 text-blue-600" />
            Gestão de Etiquetas
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie etiquetas dos Correios - edite, cancele ou reimprima
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/expedicao" className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Expedição
          </Link>
          <button
            onClick={loadEtiquetas}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código de rastreio, pedido ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            {(['all', 'CRIADA', 'IMPRESSA', 'POSTADA', 'CANCELADA'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Todas' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Etiquetas */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Carregando etiquetas...</p>
          </div>
        ) : etiquetas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Tag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Nenhuma etiqueta encontrada</p>
          </div>
        ) : (
          etiquetas.map((etiqueta) => (
            <div key={etiqueta.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Header da Etiqueta */}
              <div className="p-4 flex items-center justify-between border-b">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg text-blue-600">
                        {etiqueta.trackingCode}
                      </span>
                      {getStatusBadge(etiqueta.status)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Pedido: <Link href={`/admin/orders/${etiqueta.orderId}`} className="text-blue-600 hover:underline">
                        {etiqueta.orderId.substring(0, 12)}...
                      </Link>
                      {' • '}
                      {etiqueta.order.buyerName}
                      {' • '}
                      {getServicoLabel(etiqueta.servicoCodigo)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {etiqueta.status !== 'CANCELADA' && (
                    <>
                      <button
                        onClick={() => handlePrint(etiqueta.id, etiqueta.orderId)}
                        disabled={processing === etiqueta.id}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Imprimir etiqueta"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(etiqueta)}
                        disabled={processing === etiqueta.id || etiqueta.status === 'POSTADA'}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                        title="Editar etiqueta"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleConsultarCorreios(etiqueta.id)}
                        disabled={processing === etiqueta.id}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Consultar nos Correios"
                      >
                        <Truck className="w-5 h-5" />
                      </button>
                      {etiqueta.status !== 'POSTADA' && (
                        <button
                          onClick={() => handleCancel(etiqueta.id)}
                          disabled={processing === etiqueta.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Cancelar etiqueta"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === etiqueta.id ? null : etiqueta.id)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    {expandedId === etiqueta.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Detalhes Expandidos */}
              {expandedId === etiqueta.id && (
                <div className="p-4 bg-gray-50">
                  {editingId === etiqueta.id && editForm ? (
                    /* Formulário de Edição */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Destinatário */}
                        <div className="bg-white p-4 rounded-lg border">
                          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Destinatário
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                              <input
                                type="text"
                                value={editForm.destinatario.nome}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  destinatario: { ...editForm.destinatario, nome: e.target.value }
                                })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                              <input
                                type="text"
                                value={editForm.destinatario.cpfCnpj}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  destinatario: { ...editForm.destinatario, cpfCnpj: e.target.value }
                                })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                                <input
                                  type="text"
                                  value={editForm.destinatario.logradouro}
                                  onChange={(e) => setEditForm({
                                    ...editForm,
                                    destinatario: { ...editForm.destinatario, logradouro: e.target.value }
                                  })}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                                <input
                                  type="text"
                                  value={editForm.destinatario.numero}
                                  onChange={(e) => setEditForm({
                                    ...editForm,
                                    destinatario: { ...editForm.destinatario, numero: e.target.value }
                                  })}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                              <input
                                type="text"
                                value={editForm.destinatario.complemento}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  destinatario: { ...editForm.destinatario, complemento: e.target.value }
                                })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                              <input
                                type="text"
                                value={editForm.destinatario.bairro}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  destinatario: { ...editForm.destinatario, bairro: e.target.value }
                                })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                                <input
                                  type="text"
                                  value={editForm.destinatario.cidade}
                                  onChange={(e) => setEditForm({
                                    ...editForm,
                                    destinatario: { ...editForm.destinatario, cidade: e.target.value }
                                  })}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                                <select
                                  value={editForm.destinatario.uf}
                                  onChange={(e) => setEditForm({
                                    ...editForm,
                                    destinatario: { ...editForm.destinatario, uf: e.target.value }
                                  })}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  {estadosBrasileiros.map(uf => (
                                    <option key={uf} value={uf}>{uf}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                              <input
                                type="text"
                                value={editForm.destinatario.cep}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  destinatario: { ...editForm.destinatario, cep: e.target.value.replace(/\D/g, '') }
                                })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                maxLength={8}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                                <input
                                  type="text"
                                  value={editForm.destinatario.telefone}
                                  onChange={(e) => setEditForm({
                                    ...editForm,
                                    destinatario: { ...editForm.destinatario, telefone: e.target.value }
                                  })}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                <input
                                  type="email"
                                  value={editForm.destinatario.email}
                                  onChange={(e) => setEditForm({
                                    ...editForm,
                                    destinatario: { ...editForm.destinatario, email: e.target.value }
                                  })}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Objeto e NF-e */}
                        <div className="space-y-4">
                          {/* Dimensões */}
                          <div className="bg-white p-4 rounded-lg border">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              Dimensões do Objeto
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Peso (g)</label>
                                <input
                                  type="number"
                                  value={editForm.peso}
                                  onChange={(e) => setEditForm({ ...editForm, peso: Number(e.target.value) })}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                  min={1}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Altura (cm)</label>
                                <input
                                  type="number"
                                  value={editForm.altura}
                                  onChange={(e) => setEditForm({ ...editForm, altura: Number(e.target.value) })}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                  min={2}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Largura (cm)</label>
                                <input
                                  type="number"
                                  value={editForm.largura}
                                  onChange={(e) => setEditForm({ ...editForm, largura: Number(e.target.value) })}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                  min={11}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comprimento (cm)</label>
                                <input
                                  type="number"
                                  value={editForm.comprimento}
                                  onChange={(e) => setEditForm({ ...editForm, comprimento: Number(e.target.value) })}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                  min={16}
                                />
                              </div>
                            </div>
                          </div>

                          {/* NF-e */}
                          <div className="bg-white p-4 rounded-lg border">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Nota Fiscal Eletrônica
                            </h3>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                                  <input
                                    type="text"
                                    value={editForm.nfeNumero || ''}
                                    onChange={(e) => setEditForm({ ...editForm, nfeNumero: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Série</label>
                                  <input
                                    type="text"
                                    value={editForm.nfeSerie || ''}
                                    onChange={(e) => setEditForm({ ...editForm, nfeSerie: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Chave de Acesso (44 dígitos)</label>
                                <input
                                  type="text"
                                  value={editForm.nfeChave || ''}
                                  onChange={(e) => setEditForm({ ...editForm, nfeChave: e.target.value.replace(/\D/g, '') })}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                  maxLength={44}
                                  placeholder="00000000000000000000000000000000000000000000"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditForm(null)
                          }}
                          className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveEdit(etiqueta.id)}
                          disabled={processing === etiqueta.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                        >
                          {processing === etiqueta.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Salvar Alterações
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Visualização de Detalhes */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Remetente */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-blue-600" />
                          Remetente
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p className="font-medium">{etiqueta.remetente.nome}</p>
                          <p>CNPJ: {etiqueta.remetente.cnpj}</p>
                          <p>{etiqueta.remetente.logradouro}, {etiqueta.remetente.numero}</p>
                          <p>{etiqueta.remetente.bairro}</p>
                          <p>{etiqueta.remetente.cidade} - {etiqueta.remetente.uf}</p>
                          <p>CEP: {etiqueta.remetente.cep}</p>
                          {etiqueta.remetente.telefone && <p>Tel: {etiqueta.remetente.telefone}</p>}
                          {etiqueta.remetente.email && <p>{etiqueta.remetente.email}</p>}
                        </div>
                      </div>

                      {/* Destinatário */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-600" />
                          Destinatário
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p className="font-medium">{etiqueta.destinatario.nome}</p>
                          {etiqueta.destinatario.cpfCnpj && <p>CPF/CNPJ: {etiqueta.destinatario.cpfCnpj}</p>}
                          <p>{etiqueta.destinatario.logradouro}, {etiqueta.destinatario.numero}</p>
                          {etiqueta.destinatario.complemento && <p>{etiqueta.destinatario.complemento}</p>}
                          <p>{etiqueta.destinatario.bairro}</p>
                          <p>{etiqueta.destinatario.cidade} - {etiqueta.destinatario.uf}</p>
                          <p>CEP: {etiqueta.destinatario.cep}</p>
                          {etiqueta.destinatario.telefone && <p>Tel: {etiqueta.destinatario.telefone}</p>}
                          {etiqueta.destinatario.email && <p>{etiqueta.destinatario.email}</p>}
                        </div>
                      </div>

                      {/* Objeto */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4 text-orange-600" />
                          Objeto Postal
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><span className="font-medium">Formato:</span> {getFormatoLabel(etiqueta.formato)}</p>
                          <p><span className="font-medium">Peso:</span> {etiqueta.peso}g</p>
                          <p><span className="font-medium">Dimensões:</span> {etiqueta.altura} x {etiqueta.largura} x {etiqueta.comprimento} cm</p>
                          <p><span className="font-medium">Valor Declarado:</span> R$ {etiqueta.valorDeclarado.toFixed(2)}</p>
                          <p><span className="font-medium">Serviço:</span> {getServicoLabel(etiqueta.servicoCodigo)}</p>
                          {etiqueta.nfe && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="font-medium text-gray-900">NF-e:</p>
                              <p>Número: {etiqueta.nfe.numero} (Série {etiqueta.nfe.serie})</p>
                              <p className="font-mono text-xs break-all">{etiqueta.nfe.chave}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Datas */}
                  <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500 flex gap-6">
                    <span>Criada em: {new Date(etiqueta.criadaEm).toLocaleString('pt-BR')}</span>
                    <span>Atualizada em: {new Date(etiqueta.atualizadaEm).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
