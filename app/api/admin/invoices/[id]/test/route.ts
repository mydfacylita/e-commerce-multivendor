import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = 'then' in context.params ? await context.params : context.params
    
    return NextResponse.json({
      success: true,
      id: params.id,
      message: 'Teste OK'
    })
  } catch (error) {
    console.error('Erro no teste:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
