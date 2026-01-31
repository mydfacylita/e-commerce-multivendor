/**
 * 🔍 API Endpoint - Verificação Manual de Consistência
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkAndFixConsistency } from '@/lib/order-consistency-checker'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    console.log(`[Consistency API] Verificação iniciada por: ${session.user.email}`)

    const result = await checkAndFixConsistency()

    return NextResponse.json({
      success: true,
      result
    })
  } catch (error: any) {
    console.error('[Consistency API] Erro:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST para executar verificação de consistência',
    endpoint: '/api/admin/consistency/check'
  })
}
