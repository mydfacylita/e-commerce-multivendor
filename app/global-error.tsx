'use client'

import { useEffect } from 'react'

/**
 * 🔒 Página de erro GLOBAL - Captura erros no layout raiz
 * Esta é a última linha de defesa contra exposição de código
 * NÃO usa o layout.tsx pois o erro pode estar lá
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 🔒 Log seguro - apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('[Global Error]', error)
    }
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ 
        margin: 0, 
        padding: 0, 
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        backgroundColor: '#f9fafb',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          maxWidth: '400px', 
          width: '100%', 
          textAlign: 'center',
          padding: '20px'
        }}>
          {/* Logo simples */}
          <div style={{ marginBottom: '24px' }}>
            <span style={{ 
              fontSize: '32px', 
              fontWeight: 'bold',
              color: '#f97316'
            }}>
              MYD
            </span>
            <span style={{ 
              fontSize: '32px', 
              fontWeight: 'bold',
              color: '#2563eb'
            }}>
              SHOP
            </span>
          </div>

          {/* Ícone de erro */}
          <div style={{ 
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px'
            }}>
              ⚠️
            </div>
          </div>

          {/* Título */}
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: '#111827',
            marginBottom: '8px'
          }}>
            Erro no Sistema
          </h1>

          {/* Mensagem genérica - 🔒 NÃO expõe detalhes */}
          <p style={{ 
            color: '#6b7280', 
            marginBottom: '24px',
            lineHeight: '1.5'
          }}>
            Ocorreu um problema técnico. Por favor, tente novamente em alguns instantes.
          </p>

          {/* Código de referência seguro */}
          {error.digest && (
            <p style={{ 
              fontSize: '12px', 
              color: '#9ca3af',
              marginBottom: '24px'
            }}>
              Ref: {error.digest}
            </p>
          )}

          {/* Botões */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              🔄 Tentar novamente
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              🏠 Voltar ao início
            </button>
          </div>

          {/* Suporte */}
          <p style={{ 
            marginTop: '32px', 
            fontSize: '14px', 
            color: '#6b7280' 
          }}>
            Problema persiste?{' '}
            <a 
              href="mailto:suporte@mydshop.com.br" 
              style={{ color: '#2563eb', textDecoration: 'none' }}
            >
              Fale conosco
            </a>
          </p>
        </div>
      </body>
    </html>
  )
}
