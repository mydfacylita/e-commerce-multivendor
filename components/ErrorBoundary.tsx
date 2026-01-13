'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 🔒 Error Boundary para capturar erros no cliente
 * Previne exposição de stack traces e código fonte
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 🔒 Log apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary]', error, errorInfo)
    }
    
    // Aqui você pode enviar para um serviço de monitoramento (Sentry, etc)
  }

  render() {
    if (this.state.hasError) {
      // 🔒 UI de erro segura - NÃO expõe código
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Ops! Algo deu errado
            </h2>
            <p className="text-gray-600 mb-4">
              Ocorreu um erro inesperado. Por favor, recarregue a página.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Recarregar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
