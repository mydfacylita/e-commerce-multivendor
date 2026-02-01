'use client'

import { useState } from 'react'
import { FiZap, FiRefreshCw, FiGlobe, FiFileText, FiX, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface AIDescriptionButtonProps {
  description: string
  productName: string
  onDescriptionChange: (description: string) => void
}

type ActionType = 'improve' | 'generate' | 'translate' | 'summarize'

export default function AIDescriptionButton({ 
  description, 
  productName, 
  onDescriptionChange 
}: AIDescriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewText, setPreviewText] = useState('')
  const [showMenu, setShowMenu] = useState(false)

  const handleAIAction = async (action: ActionType) => {
    if (action === 'improve' && !description.trim()) {
      toast.error('Digite uma descrição primeiro')
      return
    }
    
    if (action === 'generate' && !productName.trim()) {
      toast.error('Digite o nome do produto primeiro')
      return
    }

    setIsLoading(true)
    setShowMenu(false)

    try {
      const response = await fetch('/api/admin/ai/improve-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description, 
          productName,
          action 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar')
      }

      setPreviewText(data.description)
      setShowPreview(true)
      toast.success('Texto gerado com sucesso!')

    } catch (error: any) {
      toast.error(error.message || 'Erro ao melhorar descrição')
    } finally {
      setIsLoading(false)
    }
  }

  const applyDescription = () => {
    onDescriptionChange(previewText)
    setShowPreview(false)
    setPreviewText('')
    toast.success('Descrição aplicada!')
  }

  const actions = [
    { 
      id: 'improve' as ActionType, 
      label: 'Melhorar Descrição', 
      icon: FiZap, 
      description: 'Torna a descrição mais atraente e profissional',
      disabled: !description.trim()
    },
    { 
      id: 'generate' as ActionType, 
      label: 'Gerar do Zero', 
      icon: FiFileText, 
      description: 'Cria uma descrição baseada no nome do produto',
      disabled: !productName.trim()
    },
    { 
      id: 'translate' as ActionType, 
      label: 'Traduzir para PT-BR', 
      icon: FiGlobe, 
      description: 'Traduz descrição em inglês para português',
      disabled: !description.trim()
    },
    { 
      id: 'summarize' as ActionType, 
      label: 'Resumir', 
      icon: FiRefreshCw, 
      description: 'Cria uma versão mais curta e concisa',
      disabled: !description.trim()
    },
  ]

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm rounded-md hover:from-purple-600 hover:to-blue-600 transition disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <FiRefreshCw className="animate-spin" size={14} />
              Processando...
            </>
          ) : (
            <>
              <FiZap size={14} />
              IA ✨
            </>
          )}
        </button>

        {/* Menu dropdown */}
        {showMenu && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleAIAction(action.id)}
                disabled={action.disabled}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <action.icon size={16} className="text-purple-500" />
                  <span className="font-medium text-sm">{action.label}</span>
                </div>
                <p className="text-xs text-gray-500 ml-6">{action.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-purple-500 to-blue-500">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FiZap />
                Descrição Gerada pela IA
              </h3>
            </div>
            
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
                {previewText}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPreview(false)
                  setPreviewText('')
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition flex items-center gap-2"
              >
                <FiX size={16} />
                Descartar
              </button>
              <button
                type="button"
                onClick={applyDescription}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
              >
                <FiCheck size={16} />
                Aplicar Descrição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  )
}
