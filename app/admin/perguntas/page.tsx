'use client'

import { useState, useEffect } from 'react'
import { FiMessageSquare, FiSend, FiCheck, FiClock, FiTrash2, FiPackage, FiUser } from 'react-icons/fi'
import Link from 'next/link'

interface Question {
  id: string
  question: string
  answer?: string
  answeredAt?: string
  createdAt: string
  user: {
    name: string
  }
  product: {
    id: string
    name: string
    slug: string
  }
}

interface QuestionStats {
  total: number
  answered: number
  unanswered: number
}

export default function AdminPerguntasPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [stats, setStats] = useState<QuestionStats>({ total: 0, answered: 0, unanswered: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('unanswered')
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadQuestions()
  }, [filter])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/vendedor/perguntas?filter=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = async (questionId: string, productId: string) => {
    if (answerText.trim().length < 5) {
      alert('A resposta deve ter pelo menos 5 caracteres')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/products/${productId}/questions/${questionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answerText.trim() })
      })

      const data = await res.json()
      
      if (res.ok) {
        alert(data.message || 'Resposta enviada!')
        setAnsweringId(null)
        setAnswerText('')
        loadQuestions()
      } else {
        alert(data.message || 'Erro ao enviar resposta')
      }
    } catch (error) {
      alert('Erro ao enviar resposta')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (questionId: string, productId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) return

    try {
      const res = await fetch(`/api/admin/products/${productId}/questions/${questionId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        loadQuestions()
      } else {
        const data = await res.json()
        alert(data.message || 'Erro ao excluir pergunta')
      }
    } catch (error) {
      alert('Erro ao excluir pergunta')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FiMessageSquare className="text-blue-500" />
            Gerenciar Perguntas
          </h1>
          <p className="text-gray-500 mt-1">
            Visualize e responda perguntas de todos os produtos
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{stats.answered}</div>
          <div className="text-sm text-gray-500">Respondidas</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-3xl font-bold text-orange-600">{stats.unanswered}</div>
          <div className="text-sm text-gray-500">Aguardando</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: 'Todas' },
          { key: 'unanswered', label: 'Aguardando Resposta' },
          { key: 'answered', label: 'Respondidas' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg transition ${
              filter === f.key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
            {f.key === 'unanswered' && stats.unanswered > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {stats.unanswered}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista de Perguntas */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map(q => (
            <div key={q.id} className="bg-white rounded-lg shadow p-4">
              {/* Produto */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3 pb-3 border-b">
                <div className="flex items-center gap-2">
                  <FiPackage className="w-4 h-4" />
                  <Link 
                    href={`/produtos/${q.product.slug}`}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                  >
                    {q.product.name}
                  </Link>
                </div>
                <button
                  onClick={() => handleDelete(q.id, q.product.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Excluir pergunta"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Pergunta */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FiUser className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800">{q.user.name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(q.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    {!q.answer && (
                      <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        <FiClock className="w-3 h-3" />
                        Aguardando
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700">{q.question}</p>
                </div>
              </div>

              {/* Resposta existente */}
              {q.answer && (
                <div className="bg-green-50 rounded-lg p-4 ml-11">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-1">
                    <FiCheck className="w-4 h-4" />
                    Resposta
                    {q.answeredAt && (
                      <span className="text-xs text-gray-400 font-normal">
                        • {new Date(q.answeredAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700">{q.answer}</p>
                </div>
              )}

              {/* Formulário de resposta */}
              {!q.answer && (
                <div className="ml-11">
                  {answeringId === q.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Digite a resposta..."
                        maxLength={1000}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAnswer(q.id, q.product.id)}
                          disabled={submitting || answerText.trim().length < 5}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <FiSend className="w-4 h-4" />
                          {submitting ? 'Enviando...' : 'Enviar Resposta'}
                        </button>
                        <button
                          onClick={() => {
                            setAnsweringId(null)
                            setAnswerText('')
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAnsweringId(q.id)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                    >
                      <FiMessageSquare className="w-4 h-4" />
                      Responder
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-lg text-gray-600">
            {filter === 'unanswered' 
              ? 'Todas as perguntas foram respondidas!'
              : 'Nenhuma pergunta encontrada'}
          </p>
        </div>
      )}
    </div>
  )
}
