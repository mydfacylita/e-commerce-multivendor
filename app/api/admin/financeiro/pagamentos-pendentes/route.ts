/**
 * 🚨 ROTA TEMPORARIAMENTE DESABILITADA PARA DEPLOY
 * 
 * PROBLEMA: Status 'APPROVED' não existe no enum OrderStatus + campo 'sellerPaid' 
 * DATA: 13/01/2026 - PRE-DEPLOY  
 * COMMIT: 89a7767
 * 
 * FUNCIONALIDADE ORIGINAL: Listar pagamentos pendentes para vendedores
 * ÁREA CRÍTICA: Sistema financeiro
 */

import { NextResponse } from 'next/server'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * GET - Lista pagamentos pendentes para vendedores (TEMPORARIAMENTE DESABILITADO)
 * 
 * @returns Response com erro 501 (Not Implemented)
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Funcionalidade temporariamente desabilitada',
      message: 'Listagem de pagamentos pendentes em manutenção.',
      code: 'PAYMENT_LIST_MAINTENANCE',
      data: []
    },
    { status: 501 }
  )
}
