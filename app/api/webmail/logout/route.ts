import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST /api/webmail/logout
 * Faz logout do webmail
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('webmail_session')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
    return NextResponse.json(
      { success: false, message: 'Erro ao fazer logout' },
      { status: 500 }
    )
  }
}
