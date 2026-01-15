/**
 * 🚨 ROTA TEMPORARIAMENTE DESABILITADA PARA DEPLOY
 * 
 * PROBLEMA: Múltiplos campos de shipping não existem no schema
 * DATA: 13/01/2026 - PRE-DEPLOY  
 * COMMIT: 89a7767
 * 
 * FUNCIONALIDADE ORIGINAL: Geração de etiquetas de pedidos
 * ÁREA CRÍTICA: Sistema de pedidos
 */

import { NextResponse } from 'next/server'

/**
 * GET - Gerar etiqueta de pedido (TEMPORARIAMENTE DESABILITADO)
 */
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Funcionalidade temporariamente desabilitada',
      message: 'Geração de etiquetas em manutenção.',
      code: 'LABEL_GENERATION_MAINTENANCE'
    },
    { status: 501 }
  )
}
