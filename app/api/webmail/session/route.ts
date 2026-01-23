import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * GET /api/webmail/session
 * Verifica se usuário está autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('webmail_session')

    if (session) {
      try {
        const sessionData = JSON.parse(session.value)
        
        // Verificar se sessão não expirou (24 horas)
        const now = Date.now()
        if (sessionData.expires && sessionData.expires > now) {
          return NextResponse.json({
            authenticated: true,
            email: sessionData.email,
            username: sessionData.username
          })
        }
      } catch (error) {
        console.error('Erro ao parsear sessão:', error)
      }
    }

    return NextResponse.json({
      authenticated: false
    })
  } catch (error) {
    console.error('Erro ao verificar sessão:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    )
  }
}
