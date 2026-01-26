import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { correiosCWS } from '@/lib/correios-cws'

/**
 * POST /api/admin/config/correios/test-api
 * Testa se as credenciais estão funcionando com a API CWS dos Correios
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    console.log('[TesteAPI] Testando credenciais CWS...')
    
    const result = await correiosCWS.testarConexao()

    return NextResponse.json({
      success: result.success,
      message: result.message,
      results: {
        autenticacao: {
          status: result.success ? 'sucesso' : 'erro',
          mensagem: result.message
        }
      }
    })

  } catch (error: any) {
    console.error('Erro ao testar API Correios:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Erro interno' 
    }, { status: 500 })
  }
}
