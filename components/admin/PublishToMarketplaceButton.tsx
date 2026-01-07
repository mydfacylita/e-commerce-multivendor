'use client'

import { useState } from 'react'
import { FiUpload, FiRefreshCw, FiCheck, FiX, FiExternalLink, FiTrash2, FiPause, FiPlay, FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi'

interface PublishToMarketplaceButtonProps {
  productId: string
  existingListings: Array<{
    marketplace: string
    status: string
    listingUrl?: string | null
    lastSyncAt?: Date | null
  }>
}

interface InfoModal {
  isOpen: boolean
  type: 'info' | 'success' | 'error' | 'warning'
  title: string
  message: string
  details?: string[]
  action?: {
    label: string
    onClick: () => void
  }
}

const MARKETPLACES = [
  { id: 'mercadolivre', name: 'Mercado Livre', color: 'yellow' },
  { id: 'shopee', name: 'Shopee', color: 'orange' },
  { id: 'amazon', name: 'Amazon', color: 'orange' },
]

export default function PublishToMarketplaceButton({ 
  productId, 
  existingListings 
}: PublishToMarketplaceButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedMarketplace, setSelectedMarketplace] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [modal, setModal] = useState<InfoModal>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  const showInfoModal = (config: Omit<InfoModal, 'isOpen'>) => {
    setModal({ ...config, isOpen: true })
  }

  const closeInfoModal = () => {
    setModal({ ...modal, isOpen: false })
  }

  const handlePublish = async () => {
    if (!selectedMarketplace) {
      showInfoModal({
        type: 'warning',
        title: 'Marketplace Não Selecionado',
        message: 'Você precisa selecionar um marketplace antes de publicar.',
        details: [
          '• Escolha entre Mercado Livre, Shopee ou Amazon',
          '• Certifique-se de que o marketplace está configurado',
          '• Verifique se você tem permissão para publicar'
        ]
      })
      return
    }

    if (loading) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/products/${productId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace: selectedMarketplace }),
      })

      const data = await response.json()

      if (!response.ok) {
        showInfoModal({
          type: 'error',
          title: 'Erro ao Publicar Produto',
          message: data.message || 'Não foi possível publicar o produto no marketplace.',
          details: [
            '• Verifique se o marketplace está configurado',
            '• Certifique-se de que o produto tem todas as informações necessárias',
            '• Verifique se você tem autorização para publicar',
            '• Consulte os logs para mais detalhes'
          ],
          action: {
            label: 'Tentar Novamente',
            onClick: () => {
              closeInfoModal()
              handlePublish()
            }
          }
        })
        return
      }

      showInfoModal({
        type: 'success',
        title: 'Produto Publicado!',
        message: `Produto publicado com sucesso no ${MARKETPLACES.find(m => m.id === selectedMarketplace)?.name}!`,
        details: [
          '✓ Anúncio criado no marketplace',
          '✓ Sincronização ativa',
          '✓ O produto já está visível para os compradores'
        ],
        action: {
          label: 'OK',
          onClick: () => {
            closeInfoModal()
            window.location.reload()
          }
        }
      })
    } catch (error) {
      showInfoModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor para publicar o produto.',
        details: [
          '• Verifique sua conexão com a internet',
          '• O servidor pode estar temporariamente indisponível',
          '• Tente novamente em alguns instantes'
        ],
        action: {
          label: 'Tentar Novamente',
          onClick: () => {
            closeInfoModal()
            handlePublish()
          }
        }
      })
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (marketplace: string) => {
    try {
      setSyncing(marketplace)
      const response = await fetch(`/api/admin/products/${productId}/sync-listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace }),
      })

      const data = await response.json()

      if (!response.ok) {
        showInfoModal({
          type: 'error',
          title: 'Erro ao Sincronizar',
          message: data.message || 'Não foi possível sincronizar o anúncio com o marketplace.',
          details: [
            '• Verifique se o anúncio ainda existe no marketplace',
            '• Certifique-se de que suas credenciais estão válidas',
            '• Pode haver limite de requisições - aguarde alguns minutos',
            '• Verifique os logs do servidor para mais detalhes'
          ],
          action: {
            label: 'Tentar Novamente',
            onClick: () => {
              closeInfoModal()
              handleSync(marketplace)
            }
          }
        })
        return
      }

      showInfoModal({
        type: 'success',
        title: 'Sincronização Concluída!',
        message: 'O anúncio foi sincronizado com sucesso.',
        details: [
          '✓ Preços atualizados',
          '✓ Estoque sincronizado',
          '✓ Informações do produto atualizadas'
        ],
        action: {
          label: 'OK',
          onClick: () => {
            closeInfoModal()
            window.location.reload()
          }
        }
      })
    } catch (error) {
      showInfoModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor para sincronizar.',
        details: [
          '• Verifique sua conexão com a internet',
          '• O servidor pode estar temporariamente indisponível',
          '• Tente novamente em alguns instantes'
        ],
        action: {
          label: 'Tentar Novamente',
          onClick: () => {
            closeInfoModal()
            handleSync(marketplace)
          }
        }
      })
      console.error('Erro:', error)
    } finally {
      setSyncing(null)
    }
  }

  const handleDelete = async (marketplace: string) => {
    if (confirmDelete !== marketplace) {
      showInfoModal({
        type: 'warning',
        title: 'Confirmar Exclusão',
        message: `Tem certeza que deseja excluir o anúncio do ${MARKETPLACES.find(m => m.id === marketplace)?.name}?`,
        details: [
          '⚠️ Esta ação não pode ser desfeita',
          '• O anúncio será removido do marketplace',
          '• Você precisará republicar o produto para reativá-lo',
          '• Os dados de vendas anteriores serão mantidos'
        ],
        action: {
          label: 'Sim, Excluir',
          onClick: () => {
            closeInfoModal()
            setConfirmDelete(marketplace)
            handleDelete(marketplace)
          }
        }
      })
      return
    }

    try {
      setDeleting(marketplace)
      const response = await fetch(`/api/admin/products/${productId}/delete-listing`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace }),
      })

      const data = await response.json()

      if (!response.ok) {
        showInfoModal({
          type: 'error',
          title: 'Erro ao Excluir Anúncio',
          message: data.message || 'Não foi possível excluir o anúncio.',
          details: [
            '• Verifique se você tem permissão para excluir',
            '• O anúncio pode já ter sido removido',
            '• Consulte os logs para mais detalhes'
          ],
          action: {
            label: 'OK',
            onClick: closeInfoModal
          }
        })
        return
      }

      showInfoModal({
        type: 'success',
        title: 'Anúncio Excluído!',
        message: 'O anúncio foi removido do marketplace com sucesso.',
        details: [
          '✓ Anúncio removido',
          '✓ Produto não está mais visível aos compradores',
          '✓ Você pode republicar quando quiser'
        ],
        action: {
          label: 'OK',
          onClick: () => {
            closeInfoModal()
            window.location.reload()
          }
        }
      })
    } catch (error) {
      showInfoModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor para excluir o anúncio.',
        details: [
          '• Verifique sua conexão com a internet',
          '• Tente novamente em alguns instantes'
        ],
        action: {
          label: 'OK',
          onClick: closeInfoModal
        }
      })
      console.error('Erro:', error
          }
        }
      })
    } catch (error) {
      showInfoModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor para sincronizar.',
        details: [
          '• Verifique sua conexão com a internet',
          '• O servidor pode estar temporariamente indisponível',
          '• Tente novamente em alguns instantes'
        ],
        action: {
          label: 'Tentar Novamente',
          onClick: () => {
            closeInfoModal()
            handleSync(marketplace)
          }
        }
      })
      console.error('Erro:', error
          label: 'OK',
          onClick: () => {
            closeInfoModal()
            window.location.reload()
          }
        }
      })
    } catch (error) {
      showInfoModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor para publicar o produto.',
        details: [
          '• Verifique sua conexão com a internet',
          '• O servidor pode estar temporariamente indisponível',
          '• Tente novamente em alguns instantes'
        ],
        action: {
          label: 'Tentar Novamente',
          onClick: () => {
            closeInfoModal()
            handlePublish()
          }
        }
      })
      console.error('Erro:', error)
    } finally {
      setLoading await response.json()

      if (!response.ok) {
        alert(data.message || 'Erro ao publicar produto')
        return
      }

      alert('Produto publicado com sucesso!')
      window.location.reload()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao publicar produto')
    } finally {
      setLoading(false)
      setShowModal(false)
    }
  }

  const handleSync = async (marketplace: string) => {
    try {
      setSyncing(marketplace)
      const response = await fetch(`/api/admin/products/${productId}/sync-listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace }),
      })

      if (!response.ok) throw new Error('Erro ao sincronizar')

      alert('Sincronização realizada com sucesso!')
      window.location.reload()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao sincronizar anúncio')
    } finally {
      setSyncing(null)
    }
  }

  const handleDelete = async (marketplace: string) => {
    if (confirmDelete !== marketplace) {
      setConfirmDelete(marketplace)
      return
    }

    try {
      setDeleting(marketplace)
      const response = await fetch(`/api/admin/products/${productId}/delete-listing`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || 'Erro ao excluir anúncio')
        return
      }

      alert('Anúncio excluído com sucesso!')
      window.location.reload()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao excluir anúncio')
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const handleToggle = async (marketplace: string, currentStatus: string) => {
    const action = currentStatus === 'active' ? 'pause' : 'activate'
    const actionText = action === 'pause' ? 'pausar' : 'ativar'
    
    try {
      setToggling(marketplace)
      const response = await fetch(`/api/admin/products/${productId}/pause-listing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace, action }),
      })

      const data = await response.json()

      if (!response.ok) {
        showInfoModal({
          type: 'error',
          title: 'Erro ao Alterar Status',
          message: data.message || `Não foi possível ${actionText} o anúncio.`,
          details: [
            '• Verifique sua conexão com o marketplace',
            '• Certifique-se de que suas credenciais estão válidas',
            '• Tente novamente em alguns instantes'
          ],
          action: {
            label: 'OK',
            onClick: closeInfoModal
          }
        })
        return
      }

      showInfoModal({
        type: 'success',
        title: action === 'pause' ? 'Anúncio Pausado' : 'Anúncio Ativado',
        message: data.message || `Anúncio ${action === 'pause' ? 'pausado' : 'ativado'} com sucesso!`,
        details: action === 'pause' ? [
          '✓ Anúncio não está mais visível',
          '✓ Você pode reativar quando quiser',
          '✓ Os dados são mantidos'
        ] : [
          '✓ Anúncio está visível novamente',
          '✓ Compradores podem visualizar o produto',
          '✓ Vendas habilitadas'
        ],
        action: {
          label: 'OK',
          onClick: () => {
            closeInfoModal()
            window.location.reload()
          }
        }
      })
    } catch (error) {
      showInfoModal({
        type: 'error',
        title: 'Erro de Conexão',
        message: `Não foi possível ${actionText} o anúncio.`,
        details: [
          '• Verifique sua conexão com a internet',
          '• Tente novamente em alguns instantes'
        ],
        action: {
          label: 'OK',
          onClick: closeInfoModal
        }
      })
      console.error('Erro:', error)
    } finally {
      setToggling(null)
    }
  }

  const getListingStatus = (marketplace: string) => {
    return existingListings.find(l => l.marketplace === marketplace)
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 text-green-600 hover:bg-green-50 rounded-md"
        title="Publicar em marketplace"
      >
        <FiUpload size={18} />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Publicar em Marketplaces</h2>

            {/* Listagens existentes */}
            {existingListings.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Anúncios Ativos</h3>
                <div className="space-y-2">
                  {existingListings.map((listing) => {
                    const marketplace = MARKETPLACES.find(m => m.id === listing.marketplace)
                    return (
                      <div 
                        key={listing.marketplace}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">{marketplace?.name}</span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              listing.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : listing.status === 'paused'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {listing.status === 'active' ? 'Ativo' : 
                             listing.status === 'paused' ? 'Pausado' : 
                             listing.status}
                          </span>
                          {listing.lastSyncAt && (
                            <span className="text-xs text-gray-500">
                              Sync: {new Date(listing.lastSyncAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {listing.listingUrl && (
                            <a
                              href={listing.listingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                              title="Ver anúncio"
                            >
                              <FiExternalLink size={16} />
                            </a>
                          )}
                          <button
                            onClick={() => handleToggle(listing.marketplace, listing.status)}
                            disabled={toggling === listing.marketplace}
                            className={`p-2 rounded-md disabled:opacity-50 ${
                              listing.status === 'active'
                                ? 'text-yellow-600 hover:bg-yellow-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={listing.status === 'active' ? 'Pausar anúncio' : 'Ativar anúncio'}
                          >
                            {toggling === listing.marketplace ? (
                              <FiRefreshCw size={16} className="animate-spin" />
                            ) : listing.status === 'active' ? (
                              <FiPause size={16} />
                            ) : (
                              <FiPlay size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => handleSync(listing.marketplace)}
                            disabled={syncing === listing.marketplace}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-50"
                            title="Sincronizar"
                          >
                            <FiRefreshCw 
                              size={16} 
                              className={syncing === listing.marketplace ? 'animate-spin' : ''}
                            />
                          </button>
                          <button
                            onClick={() => handleDelete(listing.marketplace)}
                            disabled={deleting === listing.marketplace}
                            className={`p-2 rounded-md disabled:opacity-50 ${
                              confirmDelete === listing.marketplace
                                ? 'text-white bg-red-600 hover:bg-red-700'
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                            title={confirmDelete === listing.marketplace ? 'Clique novamente para confirmar' : 'Excluir anúncio'}
                          >
                            {deleting === listing.marketplace ? (
                              <FiRefreshCw size={16} className="animate-spin" />
                            ) : (
                              <FiTrash2 size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Seletor de marketplace */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Selecione o Marketplace
              </label>
              <select
                value={selectedMarketplace}
                onChange={(e) => setSelectedMarketplace(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2"
              >
                <option value="">Escolha uma plataforma...</option>
                {MARKETPLACES.filter(m => !getListingStatus(m.id)).map((marketplace) => (
                  <option key={marketplace.id} value={marketplace.id}>
                    {marketplace.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Informações sobre o marketplace selecionado */}
            {selectedMarketplace === 'mercadolivre' && (
              <div className="mb-6 p-4 bg-blue-50 rounded-md">
                <h4 className="font-semibold mb-2">Requisitos Mercado Livre</h4>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Marca deve estar preenchida</li>
                  <li>• Imagens de alta qualidade (mín. 500x500px)</li>
                  <li>• Descrição detalhada do produto</li>
                  <li className="text-gray-500 italic">• Código GTIN/EAN é opcional (pode usar "produto sem código universal")</li>
                </ul>
              </div>
            )}

            {selectedMarketplace === 'shopee' && (
              <div className="mb-6 p-4 bg-orange-50 rounded-md">
                <h4 className="font-semibold mb-2">Requisitos Shopee</h4>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Pelo menos 3 imagens do produto</li>
                  <li>• Peso e dimensões devem estar preenchidos</li>
                  <li>• Categoria correta é essencial</li>
                </ul>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handlePublish}
                disabled={!selectedMarketplace || loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <FiRefreshCw className="animate-spin" size={18} />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <>
                    <FiUpload size={18} />
                    <span>Publicar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Informações Centralizado */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Cabeçalho do Modal */}
            <div className={`p-6 rounded-t-lg ${
              modal.type === 'success' ? 'bg-green-50 border-b-4 border-green-500' :
              modal.type === 'error' ? 'bg-red-50 border-b-4 border-red-500' :
              modal.type === 'warning' ? 'bg-yellow-50 border-b-4 border-yellow-500' :
              'bg-blue-50 border-b-4 border-blue-500'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {modal.type === 'success' && (
                    <FiCheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                  )}
                  {modal.type === 'error' && (
                    <FiX className="w-8 h-8 text-red-600 flex-shrink-0" />
                  )}
                  {modal.type === 'warning' && (
                    <FiAlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
                  )}
                  {modal.type === 'info' && (
                    <FiInfo className="w-8 h-8 text-blue-600 flex-shrink-0" />
                  )}
                  <h3 className={`text-xl font-bold ${
                    modal.type === 'success' ? 'text-green-900' :
                    modal.type === 'error' ? 'text-red-900' :
                    modal.type === 'warning' ? 'text-yellow-900' :
                    'text-blue-900'
                  }`}>
                    {modal.title}
                  </h3>
                </div>
                <button
                  onClick={closeInfoModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <p className="text-gray-700 text-base mb-4">
                {modal.message}
              </p>

              {modal.details && modal.details.length > 0 && (
                <div className="bg-gray-50 rounded-md p-4 mb-4">
                  <ul className="space-y-2">
                    {modal.details.map((detail, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="mr-2">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeInfoModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
                {modal.action && (
                  <button
                    onClick={modal.action.onClick}
                    className={`px-4 py-2 rounded-md font-medium text-white transition-colors ${
                      modal.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                      modal.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                      modal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {modal.action.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
