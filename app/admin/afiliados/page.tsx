'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  FiUsers, FiDollarSign, FiTrendingUp, FiCheck, FiX, 
  FiClock, FiEye, FiCopy, FiGift, FiTarget, FiCamera,
  FiAlertCircle, FiCheckCircle, FiXCircle, FiInstagram,
  FiYoutube, FiHash
} from 'react-icons/fi'
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
  instagram?: string
  youtube?: string
  tiktok?: string
  commissionRate: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  isActive: boolean
  totalSales: number
  totalCommission: number
  availableBalance: number
  totalWithdrawn: number
  createdAt: string
  user: { name: string; email: string }
  _count: { sales: number; clicks: number }
  kits: Array<{ kit: { id: string; name: string } }>
  goals: Array<{ id: string; title: string; type: string; targetValue: number; endDate: string }>
  campaignParticipations: Array<{
    campaign: { id: string; title: string; reelsCount: number | null; postsCount: number | null; storiesCount: number | null; isActive: boolean; endDate: string }
  }>
  campaignPosts: Array<{ id: string; campaignId: string; postType: string; status: string }>
}

interface Stats {
  totalAffiliates: number
  activeAffiliates: number
  pendingAffiliates: number
  totalSales: number
  totalCommission: number
  totalPaid: number
}

export default function AdminAfiliadosPage() {
  const { notification, success, error: showError, hideNotification } = useNotification()
  const { confirmState, loading: confirmLoading, showConfirm, hideConfirm } = useConfirm()
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [filter])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/affiliates?status=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setAffiliates(data.affiliates)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao carregar afiliados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (affiliateId: string) => {
    showConfirm({
      type: 'warning',
      title: 'Aprovar Afiliado',
      message: 'Deseja aprovar este afiliado? Uma conta MYD será criada automaticamente.',
      confirmText: 'Aprovar',
      onConfirm: async () => {
        try {
          setProcessing(affiliateId)
          const res = await fetch(`/api/admin/affiliates/${affiliateId}/approve`, {
            method: 'POST'
          })

          if (res.ok) {
            success('Sucesso!', 'Afiliado aprovado com sucesso!')
            loadData()
          } else {
            const data = await res.json()
            showError('Erro', data.error || 'Erro ao aprovar afiliado')
          }
        } catch (error) {
          showError('Erro', 'Erro ao aprovar afiliado')
        } finally {
          setProcessing(null)
        }
      }
    })
  }

  const handleReject = async (affiliateId: string) => {
    setSelectedAffiliateId(affiliateId)
    setShowRejectModal(true)
  }
  
  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      showError('Erro', 'Por favor, informe o motivo da rejeição')
      return
    }
    
    if (!selectedAffiliateId) return

    try {
      setProcessing(selectedAffiliateId)
      const res = await fetch(`/api/admin/affiliates/${selectedAffiliateId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      })

      if (res.ok) {
        success('Rejeitado', 'Afiliado rejeitado')
        setShowRejectModal(false)
        setRejectReason('')
        setSelectedAffiliateId(null)
        loadData()
      } else {
        showError('Erro', 'Erro ao rejeitar afiliado')
      }
    } catch (error) {
      showError('Erro', 'Erro ao rejeitar afiliado')
    } finally {
      setProcessing(null)
    }
  }

  const copyAffiliateLink = (code: string) => {
    const link = `https://www.mydshop.com.br?ref=${code}`
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="mr-1 w-3 h-3" />
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestão de Afiliados
          </h1>
          <p className="text-gray-600">
            Gerencie influenciadores, aprove cadastros e acompanhe comissões
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total de Afiliados</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAffiliates}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FiUsers className="text-blue-600 text-2xl" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Afiliados Ativos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeAffiliates}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <FiCheckCircle className="text-green-600 text-2xl" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total em Vendas</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSales)}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <FiTrendingUp className="text-purple-600 text-2xl" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Comissões Pagas</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalPaid)}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <FiDollarSign className="text-yellow-600 text-2xl" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status as any)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      filter === status
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'ALL' ? 'Todos' : 
                     status === 'PENDING' ? 'Pendentes' :
                     status === 'APPROVED' ? 'Aprovados' : 'Rejeitados'}
                  </button>
                ))}
              </div>

              <Link
                href="/admin/afiliados/novo"
                className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                + Novo Afiliado
              </Link>
            </div>
          </div>

          {/* Affiliates List */}
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Carregando afiliados...</p>
              </div>
            ) : affiliates.length === 0 ? (
              <div className="p-12 text-center">
                <FiUsers className="mx-auto text-gray-400 text-5xl mb-4" />
                <p className="text-gray-500">Nenhum afiliado encontrado</p>
              </div>
            ) : (
              affiliates.map((affiliate) => {
                // Campanha: posts aprovados por campanha
                const campaignSummary = affiliate.campaignParticipations.map((cp) => {
                  const c = cp.campaign;
                  const posts = affiliate.campaignPosts.filter((p) => p.campaignId === c.id);
                  const approved = posts.filter((p) => p.status === 'APPROVED').length;
                  const pending = posts.filter((p) => p.status === 'PENDING').length;
                  const total = (c.reelsCount ?? 0) + (c.postsCount ?? 0) + (c.storiesCount ?? 0);
                  return { campaign: c, approved, pending, total, submitted: posts.length };
                });

                return (
                  <div key={affiliate.id} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                    <div className="flex gap-5 items-start">

                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center shrink-0 text-primary-700 font-bold text-sm">
                        {affiliate.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">

                        {/* Row 1: Name + badges + actions */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/admin/afiliados/${affiliate.id}`} className="text-sm font-semibold text-gray-900 hover:text-primary-600">
                              {affiliate.name}
                            </Link>
                            {getStatusBadge(affiliate.status)}
                            <span className="text-xs bg-gray-100 text-gray-600 font-mono px-2 py-0.5 rounded">
                              {affiliate.code}
                            </span>
                            <button onClick={() => copyAffiliateLink(affiliate.code)} className="text-gray-400 hover:text-gray-600" title="Copiar link">
                              <FiCopy className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                              {affiliate.commissionRate}% comissão
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {affiliate.status === 'PENDING' && (
                              <>
                                <button onClick={() => handleApprove(affiliate.id)} disabled={processing === affiliate.id}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium disabled:opacity-50">
                                  <FiCheck className="w-3.5 h-3.5" /> Aprovar
                                </button>
                                <button onClick={() => handleReject(affiliate.id)} disabled={processing === affiliate.id}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium disabled:opacity-50">
                                  <FiX className="w-3.5 h-3.5" /> Rejeitar
                                </button>
                              </>
                            )}
                            <Link href={`/admin/afiliados/${affiliate.id}`}
                              className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium">
                              <FiEye className="w-3.5 h-3.5" /> Ver
                            </Link>
                          </div>
                        </div>

                        {/* Row 2: Contact info */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500">{affiliate.email}</span>
                          {affiliate.instagram && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <FiInstagram className="w-3 h-3 text-pink-500" />@{affiliate.instagram}
                            </span>
                          )}
                          {affiliate.youtube && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <FiYoutube className="w-3 h-3 text-red-500" />{affiliate.youtube}
                            </span>
                          )}
                          {affiliate.tiktok && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <FiHash className="w-3 h-3 text-gray-500" />{affiliate.tiktok}
                            </span>
                          )}
                        </div>

                        {/* Row 3: Stats + Kit + Meta + Campanhas */}
                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 items-start">

                          {/* Stats */}
                          <div className="flex gap-4">
                            <div>
                              <p className="text-xs text-gray-400 leading-none mb-0.5">Vendas</p>
                              <p className="text-sm font-semibold text-gray-900">{formatCurrency(affiliate.totalSales)}</p>
                              <p className="text-xs text-gray-400">{affiliate._count.sales} pedidos</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 leading-none mb-0.5">Cliques</p>
                              <p className="text-sm font-semibold text-gray-900">{affiliate._count.clicks}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 leading-none mb-0.5">Saldo</p>
                              <p className="text-sm font-semibold text-green-600">{formatCurrency(affiliate.availableBalance)}</p>
                              <p className="text-xs text-gray-400">Pago: {formatCurrency(affiliate.totalWithdrawn)}</p>
                            </div>
                          </div>

                          {/* Kits */}
                          {affiliate.kits.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                                <FiGift className="w-3 h-3" /> Kits ({affiliate.kits.length})
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {affiliate.kits.map((k) => (
                                  <span key={k.kit.id} className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full font-medium">
                                    {k.kit.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Metas */}
                          {affiliate.goals.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                                <FiTarget className="w-3 h-3" /> Metas ativas ({affiliate.goals.length})
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {affiliate.goals.map((g) => (
                                  <span key={g.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                                    {g.title}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Campanhas */}
                          {campaignSummary.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">
                                <FiCamera className="w-3 h-3" /> Campanhas ({campaignSummary.length})
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {campaignSummary.map(({ campaign: c, approved, pending, total, submitted }) => {
                                  const allDone = total > 0 && approved >= total;
                                  const hasActivity = submitted > 0;
                                  return (
                                    <span key={c.id} className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border font-medium ${
                                      allDone ? 'bg-green-50 text-green-700 border-green-200'
                                      : hasActivity ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                      : 'bg-gray-50 text-gray-600 border-gray-200'
                                    }`}>
                                      {allDone ? '✓' : hasActivity ? '⏳' : '○'}
                                      {c.title}
                                      {total > 0 && (
                                        <span className={`text-[10px] px-1 py-0 rounded ${allDone ? 'bg-green-100' : 'bg-white/70'}`}>
                                          {approved}/{total}
                                        </span>
                                      )}
                                      {pending > 0 && (
                                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">
                                          {pending} rev.
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
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
                disabled={processing !== null || !rejectReason.trim()}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Rejeitando...' : 'Rejeitar'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                  setSelectedAffiliateId(null)
                }}
                disabled={processing !== null}
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
