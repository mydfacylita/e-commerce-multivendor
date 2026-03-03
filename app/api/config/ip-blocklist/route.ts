import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Endpoint interno — consultado pelo middleware para verificar IPs bloqueados
// Não requer autenticação (middleware não pode usar sessão)
export async function GET(req: NextRequest) {
  // Apenas acesso interno (header injetado pelo middleware) ou admin
  const internalHeader = req.headers.get('x-internal')
  if (internalHeader !== 'true') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'security.ipBlocklist' }
    })
    const blocklist: string[] = config?.value ? JSON.parse(config.value) : []
    return NextResponse.json({ blocklist })
  } catch {
    return NextResponse.json({ blocklist: [] })
  }
}
