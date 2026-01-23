'use client'

import { useState } from 'react'
import { FiMessageSquare, FiSend, FiChevronDown, FiChevronUp, FiCheck, FiAlertCircle } from 'react-icons/fi'
import Image from 'next/image'

interface Question {
  id: string
  question: string
  answer?: string
  answeredAt?: string
  createdAt: string
  user: {
    name: string
    image?: string
  }
}

interface QuestionStats {
  totalQuestions: number
  answeredCount: number
  unansweredCount: number
}

interface ProductQuestionsProps {
  productId: string
  initialQuestions?: Question[]
  initialStats?: QuestionStats
}

// Card de Pergunta Individual
function QuestionCard({ question }: { question: Question }) {
  const [expanded, setExpanded] = useState(false)
  const hasAnswer = !!question.answer
  
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Pergunta */}
      <button
        onClick={() => hasAnswer && setExpanded(!expanded)}
        className={`w-full text-left p-4 ${hasAnswer ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            {question.user.image ? (
              <Image src={question.user.image} alt="" width={32} height={32} className="rounded-full" />
            ) : (
              <span className="text-blue-600 font-medium text-sm">
                {question.user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-800">{question.user.name}</span>
              <span className="text-xs text-gray-400">
                {new Date(question.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <p className="text-gray-700">{question.question}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {hasAnswer ? (
              <>
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <FiCheck className="w-3 h-3" />
                  Respondida
                </span>
                {expanded ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
              </>
            ) : (
              <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                <FiAlertCircle className="w-3 h-3" />
                Aguardando
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Resposta */}
      {expanded && hasAnswer && (
        <div className="bg-green-50 p-4 border-t">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
              <FiCheck className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-green-700">Resposta do vendedor</span>
                {question.answeredAt && (
                  <span className="text-xs text-gray-400">
                    {new Date(question.answeredAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
              <p className="text-gray-700">{question.answer}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente Principal
export default function ProductQuestions({ productId, initialQuestions = [], initialStats }: ProductQuestionsProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [stats, setStats] = useState<QuestionStats | undefined>(initialStats)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [questionText, setQuestionText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Carregar perguntas
  const loadQuestions = async (filterParam = filter) => {
    setLoading(true)
    try {
      let url = `/api/products/${productId}/questions`
      if (filterParam === 'answered') {
        url += '?answered=true'
      } else if (filterParam === 'unanswered') {
        url += '?answered=false'
      }
      
      const res = await fetch(url)
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

  // Enviar pergunta
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (questionText.trim().length < 10) {
      alert('A pergunta deve ter pelo menos 10 caracteres')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/products/${productId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText.trim() })
      })

      const data = await res.json()
      
      if (res.ok) {
        alert(data.message || 'Pergunta enviada com sucesso!')
        setShowForm(false)
        setQuestionText('')
        loadQuestions()
      } else {
        alert(data.message || data.error || 'Erro ao enviar pergunta')
      }
    } catch (error) {
      console.error('Erro ao enviar pergunta:', error)
      alert('Erro ao enviar pergunta. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtrar perguntas localmente
  const filteredQuestions = questions.filter(q => {
    if (filter === 'answered') return !!q.answer
    if (filter === 'unanswered') return !q.answer
    return true
  })

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        💬 Perguntas e Respostas
        {stats && (
          <span className="text-lg font-normal text-gray-500">
            ({stats.totalQuestions} {stats.totalQuestions === 1 ? 'pergunta' : 'perguntas'})
          </span>
        )}
      </h2>

      {/* Estatísticas */}
      {stats && stats.totalQuestions > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{stats.totalQuestions}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.answeredCount}</div>
            <div className="text-sm text-gray-500">Respondidas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.unansweredCount}</div>
            <div className="text-sm text-gray-500">Aguardando</div>
          </div>
        </div>
      )}

      {/* Botão de Perguntar + Filtro */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
        >
          <FiMessageSquare className="w-4 h-4" />
          Fazer uma Pergunta
        </button>

        <div className="flex gap-2">
          {['all', 'answered', 'unanswered'].map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f)
                loadQuestions(f)
              }}
              className={`px-3 py-1 text-sm rounded-full transition ${
                filter === f
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' && 'Todas'}
              {f === 'answered' && 'Respondidas'}
              {f === 'unanswered' && 'Aguardando'}
            </button>
          ))}
        </div>
      </div>

      {/* Formulário de Pergunta */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FiMessageSquare className="w-5 h-5 text-blue-500" />
            Sua Pergunta
          </h3>
          
          <div className="mb-4">
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Digite sua dúvida sobre o produto... (mínimo 10 caracteres)"
              maxLength={1000}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg resize-none"
            />
            <div className="text-right text-xs text-gray-400 mt-1">
              {questionText.length}/1000 caracteres
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || questionText.trim().length < 10}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FiSend className="w-4 h-4" />
              {submitting ? 'Enviando...' : 'Enviar Pergunta'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setQuestionText('')
              }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            💡 Dica: Seja específico na sua pergunta para receber uma resposta mais útil.
          </p>
        </form>
      )}

      {/* Lista de Perguntas */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : filteredQuestions.length > 0 ? (
        <div className="space-y-4">
          {filteredQuestions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-4">❓</div>
          {filter === 'all' ? (
            <>
              <p className="text-lg">Nenhuma pergunta ainda</p>
              <p className="text-sm">Seja o primeiro a fazer uma pergunta!</p>
            </>
          ) : filter === 'answered' ? (
            <p className="text-lg">Nenhuma pergunta respondida</p>
          ) : (
            <p className="text-lg">Nenhuma pergunta aguardando resposta</p>
          )}
        </div>
      )}
    </div>
  )
}
