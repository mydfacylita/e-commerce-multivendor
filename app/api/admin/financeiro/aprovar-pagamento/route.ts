/**
 * 🚨 ROTA TEMPORARIAMENTE DESABILITADA PARA DEPLOY
 * 
 * PROBLEMA: Campo 'sellerPaid' não existe no schema Prisma OrderItem
 * DATA: 13/01/2026 - PRE-DEPLOY  
 * COMMIT: 89a7767
 * 
 * FUNCIONALIDADE ORIGINAL: Aprovar pagamentos para vendedores
 * ÁREA CRÍTICA: Sistema financeiro
 * 
 * TODO PÓS-DEPLOY:
 * 1. Analisar schema Prisma correto
 * 2. Identificar campos de status de pagamento 
 * 3. Reativar funcionalidade com consultas corretas
 */

import { NextResponse } from 'next/server'


// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * POST - Aprovar pagamento para vendedor (TEMPORARIAMENTE DESABILITADO)
 * 
 * @param request - Request com sellerId e observacao
 * @returns Response com erro 501 (Not Implemented)
 */
export async function POST(request: Request) {
  return NextResponse.json(
    { 
      error: 'Funcionalidade temporariamente desabilitada',
      message: 'Sistema de pagamentos em manutenção para correção de schema.',
      code: 'PAYMENT_SYSTEM_MAINTENANCE',
      status: 'disabled'
    },
    { status: 501 }
  )
}
