'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  FiArrowLeft, FiUser, FiMail, FiPhone, FiInstagram, FiYoutube, 
  FiDollarSign, FiTrendingUp, FiMousePointer, FiShoppingBag,
  FiCheck, FiX, FiEdit, FiCopy, FiExternalLink, FiClock,
  FiCheckCircle, FiXCircle, FiAlertCircle
} from 'react-icons/fi'
import { FaTiktok } from 'react-icons/fa'
import toast from 'react-hot-toast'
import NotificationModal from '@/components/ui/NotificationModal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { useNotification } from '@/hooks/useNotification'
import { useConfirm } from '@/hooks/useConfirm'

interface Affiliate {
  id: string
  code: string
  name: string
  email: string
  phone?: string
  cpf?: string
  instagram?: string
  youtube?: string
  tiktok?: string
  otherSocial?: string
  commissionRate: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  isActive: boolean
  totalSales: number
  totalCommission: number
  availableBalance: number
  totalWithdrawn: number
  banco?: string
  agencia?: string
  conta?: string
  tipoConta?: string
  chavePix?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cookieDays: number
  notes?: string
  approvedAt?: string
  approvedBy?: string
  createdAt: string
  updatedAt: string
  user: {
    name: string
    email: string
  }
  account?: {
    accountNumber: string
    status: string
    balance: number
    blockedBalance: number
    totalReceived: number
    totalWithdrawn: number
    pixKey?: string
    pixKeyType?: string
    bankName?: string
    bankCode?: string
    agencia?: string
    conta?: string
    contaTipo?: string
    kycStatus: string
    createdAt: string
  }
  _count: {
    sales: number
    clicks: number
  }
}

interface Sale {
  id: string
  orderId: string
  commissionAmount: number
  commissionRate: number
  status: string
  createdAt: string
  order: {
    id: string
    total: number
    status: string
    createdAt: string
  }
}

export default function AffiliateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { notification, success, error: showError, hideNotification } = useNotification()
  const { confirmState, loading: confirmLoading, showConfirm, hideConfirm } = useConfirm()
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [editingCommission, setEditingCommission] = useState(false)
  const [newCommission, setNewCommission] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    instagram: '',
    youtube: '',
    tiktok: '',
    otherSocial: '',
    commissionRate: 0,
    cookieDays: 30,
    isActive: true,
    status: 'APPROVED' as 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED',
    banco: '',
    agencia: '',
    conta: '',
    tipoConta: '',
    chavePix: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/affiliates/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setAffiliate(data.affiliate)
        setSales(data.sales || [])
        setNewCommission(data.affiliate.commissionRate.toString())
      } else {
        toast.error('Afiliado não encontrado')
        router.push('/admin/afiliados')
      }
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    showConfirm({
      type: 'warning',
      title: 'Aprovar Afiliado',
      message: 'Deseja aprovar este afiliado? Uma conta MYD será criada automaticamente.',
      confirmText: 'Aprovar',
      onConfirm: async () => {
        try {
          setProcessing(true)
          const res = await fetch(`/api/admin/affiliates/${params.id}/approve`, {
            method: 'POST'
          })

          if (res.ok) {
            success('Sucesso!', 'Afiliado aprovado com sucesso!')
            loadData()
          } else {
            const data = await res.json()
            showError('Erro', data.error || 'Erro ao aprovar')
          }
        } catch (error) {
          showError('Erro', 'Erro ao aprovar afiliado')
        } finally {
          setProcessing(false)
        }
      }
    })
  }

  const handleReject = async () => {
    setShowRejectModal(true)
  }
  
  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      showError('Erro', 'Por favor, informe o motivo da rejeição')
      return
    }

    try {
      setProcessing(true)
      const res = await fetch(`/api/admin/affiliates/${params.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      })

      if (res.ok) {
        success('Rejeitado', 'Afiliado rejeitado')
        setShowRejectModal(false)
        setRejectReason('')
        loadData()
      } else {
        showError('Erro', 'Erro ao rejeitar')
      }
    } catch (error) {
      showError('Erro', 'Erro ao rejeitar afiliado')
    } finally {
      setProcessing(false)
    }
  }

  const handleUpdateCommission = async () => {
    showConfirm({
      type: 'warning',
      title: 'Alterar Comissão',
      message: `Alterar comissão para ${newCommission}%?`,
      confirmText: 'Salvar',
      onConfirm: async () => {
        try {
          setProcessing(true)
          const res = await fetch(`/api/admin/affiliates/${params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commissionRate: parseFloat(newCommission) })
          })

          if (res.ok) {
            success('Sucesso!', 'Comissão atualizada!')
            setEditingCommission(false)
            loadData()
          } else {
            showError('Erro', 'Erro ao atualizar comissão')
          }
        } catch (error) {
          showError('Erro', 'Erro ao atualizar')
        } finally {
          setProcessing(false)
        }
      }
    })
  }

  const openEditModal = () => {
    if (!affiliate) return
    setEditForm({
      name: affiliate.name || '',
      email: affiliate.email || '',
      phone: affiliate.phone || '',
      cpf: affiliate.cpf || '',
      instagram: affiliate.instagram || '',
      youtube: affiliate.youtube || '',
      tiktok: affiliate.tiktok || '',
      otherSocial: affiliate.otherSocial || '',
      commissionRate: affiliate.commissionRate || 0,
      cookieDays: affiliate.cookieDays || 30,
      isActive: affiliate.isActive,
      status: affiliate.status,
      banco: affiliate.banco || '',
      agencia: affiliate.agencia || '',
      conta: affiliate.conta || '',
      tipoConta: affiliate.tipoConta || '',
      chavePix: affiliate.chavePix || '',
      cep: affiliate.cep || '',
      logradouro: affiliate.logradouro || '',
      numero: affiliate.numero || '',
      complemento: affiliate.complemento || '',
      bairro: affiliate.bairro || '',
      cidade: affiliate.cidade || '',
      estado: affiliate.estado || '',
      notes: affiliate.notes || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    showConfirm({
      type: 'warning',
      title: 'Salvar Alterações',
      message: 'Confirma as alterações no cadastro do afiliado?',
      confirmText: 'Salvar',
      onConfirm: async () => {
        try {
          setProcessing(true)
          const res = await fetch(`/api/admin/affiliates/${params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm)
          })
          if (res.ok) {
            success('Sucesso!', 'Cadastro do afiliado atualizado!')
            setShowEditModal(false)
            loadData()
          } else {
            const data = await res.json()
            showError('Erro', data.error || 'Erro ao salvar alterações')
          }
        } catch (err) {
          showError('Erro', 'Erro ao salvar alterações')
        } finally {
          setProcessing(false)
        }
      }
    })
  }

  const copyAffiliateLink = () => {
    // Usar o domínio público www.mydshop.com.br
    const publicDomain = 'https://www.mydshop.com.br'
    const link = `${publicDomain}?ref=${affiliate?.code}`
    navigator.clipboard.writeText(link)
    toast.success('Link copiado!')
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: FiClock },
      APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: FiCheckCircle },
      REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: FiXCircle },
      SUSPENDED: { label: 'Suspenso', color: 'bg-gray-100 text-gray-800', icon: FiAlertCircle }
    }
    const badge = badges[status as keyof typeof badges]
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="mr-1.5 w-4 h-4" />
        {badge.label}
      </span>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!affiliate) {
    return null
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/afiliados"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <FiArrowLeft className="mr-2" />
          Voltar para afiliados
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{affiliate.name}</h1>
            <p className="text-gray-600 mt-1">Código: {affiliate.code}</p>
          </div>
          <div className="flex gap-2 items-center">
            {getStatusBadge(affiliate.status)}
            <button
              onClick={openEditModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 text-sm"
            >
              <FiEdit size={16} /> Editar Dados
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total em Vendas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(affiliate.totalSales)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FiShoppingBag className="text-blue-600" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">{affiliate._count.sales} vendas</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Comissão</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(affiliate.totalCommission)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FiDollarSign className="text-green-600" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Disponível: {formatCurrency(affiliate.availableBalance)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cliques</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {affiliate._count.clicks}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <FiMousePointer className="text-purple-600" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Taxa conversão: {affiliate._count.clicks > 0 
              ? ((affiliate._count.sales / affiliate._count.clicks) * 100).toFixed(1) 
              : '0'}%
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Comissão</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {affiliate.commissionRate}%
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <FiTrendingUp className="text-orange-600" size={24} />
            </div>
          </div>
          <button
            onClick={() => setEditingCommission(true)}
            className="text-sm text-primary-600 hover:text-primary-700 mt-2 inline-flex items-center"
          >
            <FiEdit className="mr-1" size={14} />
            Alterar
          </button>
        </div>
      </div>

      {/* Actions */}
      {affiliate.status === 'PENDING' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Aguardando Aprovação</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Este afiliado está aguardando sua análise. Ao aprovar, uma conta MYD será criada automaticamente.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={processing}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                <FiCheck /> Aprovar
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                <FiX /> Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações Pessoais */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiUser /> Informações Pessoais
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium flex items-center gap-2">
                  <FiMail size={16} />
                  {affiliate.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Telefone</p>
                <p className="font-medium flex items-center gap-2">
                  <FiPhone size={16} />
                  {affiliate.phone || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">CPF</p>
                <p className="font-medium">{affiliate.cpf || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Membro desde</p>
                <p className="font-medium">{formatDate(affiliate.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Redes Sociais</h3>
            <div className="space-y-3">
              {affiliate.instagram && (
                <div className="flex items-center gap-3">
                  <FiInstagram className="text-pink-500" size={20} />
                  <a
                    href={`https://instagram.com/${affiliate.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline flex items-center gap-1"
                  >
                    {affiliate.instagram}
                    <FiExternalLink size={14} />
                  </a>
                </div>
              )}
              {affiliate.youtube && (
                <div className="flex items-center gap-3">
                  <FiYoutube className="text-red-500" size={20} />
                  <a
                    href={affiliate.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline flex items-center gap-1"
                  >
                    {affiliate.youtube}
                    <FiExternalLink size={14} />
                  </a>
                </div>
              )}
              {affiliate.tiktok && (
                <div className="flex items-center gap-3">
                  <FaTiktok size={20} />
                  <a
                    href={`https://tiktok.com/@${affiliate.tiktok.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline flex items-center gap-1"
                  >
                    {affiliate.tiktok}
                    <FiExternalLink size={14} />
                  </a>
                </div>
              )}
              {affiliate.otherSocial && (
                <div className="flex items-center gap-3">
                  <FiExternalLink size={20} />
                  <span>{affiliate.otherSocial}</span>
                </div>
              )}
              {!affiliate.instagram && !affiliate.youtube && !affiliate.tiktok && !affiliate.otherSocial && (
                <p className="text-gray-500 text-sm">Nenhuma rede social cadastrada</p>
              )}
            </div>
          </div>

          {/* Histórico de Vendas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Últimas Vendas</h3>
            {sales.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-3 text-sm font-medium text-gray-600">Data</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Pedido</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Valor</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Comissão</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="border-b last:border-0">
                        <td className="py-3 text-sm">{formatDate(sale.createdAt)}</td>
                        <td className="py-3 text-sm">
                          <Link
                            href={`/admin/pedidos/${sale.orderId}`}
                            className="text-primary-600 hover:underline"
                          >
                            {sale.orderId.slice(0, 8)}...
                          </Link>
                        </td>
                        <td className="py-3 text-sm font-medium">
                          {formatCurrency(sale.order.total)}
                        </td>
                        <td className="py-3 text-sm font-medium text-green-600">
                          {formatCurrency(sale.commissionAmount)}
                        </td>
                        <td className="py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            sale.status === 'CONFIRMED' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhuma venda até o momento</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Link de Afiliado */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Link de Afiliado</h3>
            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <code className="text-sm break-all text-gray-700">
                https://www.mydshop.com.br?ref={affiliate.code}
              </code>
            </div>
            <button
              onClick={copyAffiliateLink}
              className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              <FiCopy /> Copiar Link
            </button>
          </div>

          {/* Dados Bancários */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Bancários</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">PIX</p>
                <p className="font-medium">{affiliate.chavePix || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Banco</p>
                <p className="font-medium">{affiliate.banco || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Agência</p>
                <p className="font-medium">{affiliate.agencia || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Conta</p>
                <p className="font-medium">
                  {affiliate.conta || '-'}
                  {affiliate.tipoConta && ` (${affiliate.tipoConta})`}
                </p>
              </div>
              
              {affiliate.account && (
                <>
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Conta MYD</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Número da Conta</p>
                    <p className="font-medium">{affiliate.account.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Saldo</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(affiliate.account.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status KYC</p>
                    <p className="font-medium">{affiliate.account.kycStatus}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Configurações */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Duração do Cookie</p>
                <p className="font-medium">{affiliate.cookieDays} dias</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status da Conta</p>
                <p className="font-medium">
                  {affiliate.isActive ? '✅ Ativa' : '❌ Inativa'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Edição de Cadastro */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FiEdit /> Editar Cadastro do Afiliado
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <FiX size={22} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Dados Pessoais */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FiUser size={14} /> Dados Pessoais
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                    <input
                      type="text"
                      value={editForm.cpf}
                      onChange={e => setEditForm(f => ({ ...f, cpf: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>
              </div>

              {/* Redes Sociais */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Redes Sociais
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                    <input
                      type="text"
                      value={editForm.instagram}
                      onChange={e => setEditForm(f => ({ ...f, instagram: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="@usuario"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TikTok</label>
                    <input
                      type="text"
                      value={editForm.tiktok}
                      onChange={e => setEditForm(f => ({ ...f, tiktok: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="@usuario"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">YouTube</label>
                    <input
                      type="text"
                      value={editForm.youtube}
                      onChange={e => setEditForm(f => ({ ...f, youtube: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Outro</label>
                    <input
                      type="text"
                      value={editForm.otherSocial}
                      onChange={e => setEditForm(f => ({ ...f, otherSocial: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Link de outra rede"
                    />
                  </div>
                </div>
              </div>

              {/* Dados Bancários */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Dados Bancários
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX</label>
                    <input
                      type="text"
                      value={editForm.chavePix}
                      onChange={e => setEditForm(f => ({ ...f, chavePix: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="CPF, e-mail, telefone ou chave aleatória"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                    <input
                      type="text"
                      value={editForm.banco}
                      onChange={e => setEditForm(f => ({ ...f, banco: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Ex: Nubank, Itaú..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conta</label>
                    <select
                      value={editForm.tipoConta}
                      onChange={e => setEditForm(f => ({ ...f, tipoConta: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">Selecione...</option>
                      <option value="corrente">Conta Corrente</option>
                      <option value="poupanca">Conta Poupança</option>
                      <option value="pagamento">Conta de Pagamento</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
                    <input
                      type="text"
                      value={editForm.agencia}
                      onChange={e => setEditForm(f => ({ ...f, agencia: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
                    <input
                      type="text"
                      value={editForm.conta}
                      onChange={e => setEditForm(f => ({ ...f, conta: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  Endereço
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                    <input
                      type="text"
                      value={editForm.cep}
                      onChange={async e => {
                        const v = e.target.value.replace(/\D/g, '')
                        setEditForm(f => ({ ...f, cep: e.target.value }))
                        if (v.length === 8) {
                          try {
                            const r = await fetch(`https://viacep.com.br/ws/${v}/json/`)
                            const d = await r.json()
                            if (!d.erro) {
                              setEditForm(f => ({
                                ...f,
                                logradouro: d.logradouro || '',
                                bairro: d.bairro || '',
                                cidade: d.localidade || '',
                                estado: d.uf || ''
                              }))
                            }
                          } catch {}
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="00000-000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                    <input
                      type="text"
                      value={editForm.logradouro}
                      onChange={e => setEditForm(f => ({ ...f, logradouro: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                    <input
                      type="text"
                      value={editForm.numero}
                      onChange={e => setEditForm(f => ({ ...f, numero: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={editForm.complemento}
                      onChange={e => setEditForm(f => ({ ...f, complemento: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Apto, bloco..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={editForm.bairro}
                      onChange={e => setEditForm(f => ({ ...f, bairro: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={editForm.cidade}
                        onChange={e => setEditForm(f => ({ ...f, cidade: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <select
                        value={editForm.estado}
                        onChange={e => setEditForm(f => ({ ...f, estado: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">UF</option>
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configurações */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Configurações
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comissão (%)</label>
                    <input
                      type="number"
                      value={editForm.commissionRate}
                      onChange={e => setEditForm(f => ({ ...f, commissionRate: parseFloat(e.target.value) || 0 }))}
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duração do Cookie (dias)</label>
                    <input
                      type="number"
                      value={editForm.cookieDays}
                      onChange={e => setEditForm(f => ({ ...f, cookieDays: parseInt(e.target.value) || 30 }))}
                      min="1"
                      max="365"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status da Conta</label>
                    <select
                      value={editForm.isActive ? 'true' : 'false'}
                      onChange={e => setEditForm(f => ({ ...f, isActive: e.target.value === 'true' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="true">Ativa</option>
                      <option value="false">Inativa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status de Aprovação</label>
                    <select
                      value={editForm.status}
                      onChange={e => setEditForm(f => ({ ...f, status: e.target.value as typeof editForm.status }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="APPROVED">Aprovado</option>
                      <option value="REJECTED">Rejeitado</option>
                      <option value="SUSPENDED">Suspenso</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações internas</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Notas internas sobre este afiliado..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={handleSaveEdit}
                disabled={processing}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium inline-flex items-center justify-center gap-2"
              >
                {processing ? 'Salvando...' : (<><FiCheck /> Salvar Alterações</>)}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={processing}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Comissão */}
      {editingCommission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Alterar Taxa de Comissão</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Comissão (%)
              </label>
              <input
                type="number"
                value={newCommission}
                onChange={(e) => setNewCommission(e.target.value)}
                step="0.1"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleUpdateCommission}
                disabled={processing}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                Salvar
              </button>
              <button
                onClick={() => {
                  setEditingCommission(false)
                  setNewCommission(affiliate.commissionRate.toString())
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Rejeição */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Rejeitar Afiliado</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da Rejeição *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Informe o motivo da rejeição..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Rejeitando...' : 'Rejeitar'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
                disabled={processing}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Notificação */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={hideNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        details={notification.details}
      />

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={hideConfirm}
        onConfirm={confirmState.onConfirm}
        type={confirmState.type}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        loading={confirmLoading}
      />
    </div>
  )
}
