/**
 * 🚨 ROTA TEMPORARIAMENTE DESABILITADA PARA DEPLOY
 * 
 * PROBLEMA: Tabela 'config' não existe no schema Prisma
 * DATA: 13/01/2026 - PRE-DEPLOY  
 * COMMIT: 89a7767
 * 
 * FUNCIONALIDADE ORIGINAL: Regras de parcelamento
 * ÁREA CRÍTICA: Sistema de pagamentos
 */

import { NextResponse } from 'next/server'

/**
 * GET - Regras de parcelamento (TEMPORARIAMENTE DESABILITADO)
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Funcionalidade temporariamente desabilitada',
      message: 'Regras de parcelamento em manutenção.',
      code: 'INSTALLMENTS_RULES_MAINTENANCE',
      data: {
        maxInstallments: 1,
        installmentsFreeInterest: 1,
        acceptsCreditCard: false
      }
    },
    { status: 501 }
  )
}
