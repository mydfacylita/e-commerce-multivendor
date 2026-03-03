import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const CONFIG_KEY = 'security.ipBlocklist'

async function getBlocklist(): Promise<string[]> {
  const config = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } })
  if (!config?.value) return []
  try { return JSON.parse(config.value) } catch { return [] }
}

async function saveBlocklist(ips: string[]) {
  const unique = [...new Set(ips)].sort()
  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    update: { value: JSON.stringify(unique) },
    create: { key: CONFIG_KEY, value: JSON.stringify(unique) },
  })
  return unique
}

// GET → listar IPs bloqueados
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const list = await getBlocklist()
  return NextResponse.json({ blocklist: list, total: list.length })
}

// POST → adicionar IP(s) ao blocklist
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  // aceita { ip: "1.2.3.4" } ou { ips: ["1.2.3.4", "5.6.7.8"] }
  const newIps: string[] = body.ips || (body.ip ? [body.ip] : [])
  if (!newIps.length) return NextResponse.json({ error: 'Informe ip ou ips' }, { status: 400 })

  const current = await getBlocklist()
  const merged = [...current, ...newIps]
  const saved = await saveBlocklist(merged)

  return NextResponse.json({ success: true, blocklist: saved, total: saved.length })
}

// DELETE → remover IP do blocklist
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const remove: string[] = body.ips || (body.ip ? [body.ip] : [])
  if (!remove.length) return NextResponse.json({ error: 'Informe ip ou ips' }, { status: 400 })

  const current = await getBlocklist()
  const filtered = current.filter(ip => !remove.includes(ip))
  const saved = await saveBlocklist(filtered)

  return NextResponse.json({ success: true, blocklist: saved, total: saved.length })
}
