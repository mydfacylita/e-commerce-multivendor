import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// GET /api/admin/company-branches/[id]/nfe-config
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Use raw SQL to read nf* columns which may not yet be in the generated Prisma client
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, name, cnpj, ie, state, city, cityCode,
            nfSerie, nfAmbiente, nfNaturezaOperacao, nfCrt,
            nfCertificadoArquivo, nfCertificadoValidade, nfTaxRulesJson
     FROM company_branch WHERE id = ? LIMIT 1`,

    params.id
  )

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'Filial não encontrada' }, { status: 404 })
  }

  const b = rows[0]
  return NextResponse.json({
    id: b.id,
    name: b.name,
    cnpj: b.cnpj,
    ie: b.ie,
    state: b.state,
    city: b.city,
    nfSerie: b.nfSerie || '1',
    nfAmbiente: b.nfAmbiente || 'homologacao',
    nfNaturezaOperacao: b.nfNaturezaOperacao || 'VENDA DE MERCADORIA',
    nfCrt: b.nfCrt || '1',
    cityCode: b.cityCode || null,
    nfCertificadoArquivo: b.nfCertificadoArquivo || null,
    nfCertificadoValidade: b.nfCertificadoValidade || null,
    // Nunca retornar a senha
    taxRules: b.nfTaxRulesJson ? JSON.parse(b.nfTaxRulesJson) : [],
  })
}

// PUT /api/admin/company-branches/[id]/nfe-config
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { nfSerie, nfAmbiente, nfNaturezaOperacao, nfCrt, nfCertificadoSenha, taxRules } = body

    // Use raw SQL to update nf* columns which may not yet be in the generated Prisma client
    if (nfCertificadoSenha) {
      await prisma.$executeRawUnsafe(
        `UPDATE company_branch SET
           nfSerie = ?, nfAmbiente = ?, nfNaturezaOperacao = ?,
           nfCrt = ?, nfCertificadoSenha = ?, nfTaxRulesJson = ?
         WHERE id = ?`,
        nfSerie || '1',
        nfAmbiente || 'homologacao',
        nfNaturezaOperacao || 'VENDA DE MERCADORIA',
        nfCrt || '1',
        nfCertificadoSenha,
        taxRules ? JSON.stringify(taxRules) : null,
        params.id
      )
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE company_branch SET
           nfSerie = ?, nfAmbiente = ?, nfNaturezaOperacao = ?,
           nfCrt = ?, nfTaxRulesJson = ?
         WHERE id = ?`,
        nfSerie || '1',
        nfAmbiente || 'homologacao',
        nfNaturezaOperacao || 'VENDA DE MERCADORIA',
        nfCrt || '1',
        taxRules ? JSON.stringify(taxRules) : null,
        params.id
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[nfe-config PUT]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/company-branches/[id]/nfe-config — upload do certificado .pfx
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('certificado') as File | null
    const validade = formData.get('validade') as string | null

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const dir = path.join(process.cwd(), 'private', 'certificados')
    await mkdir(dir, { recursive: true })

    const filename = `branch_${params.id}_${Date.now()}.pfx`
    const filepath = path.join(dir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    // Raw SQL — same reason: nf* columns not yet in generated client
    await prisma.$executeRawUnsafe(
      `UPDATE company_branch SET nfCertificadoArquivo = ?, nfCertificadoValidade = ? WHERE id = ?`,
      filepath,
      validade ? new Date(validade) : null,
      params.id
    )

    return NextResponse.json({ ok: true, path: filepath, validade })
  } catch (error: any) {
    console.error('[nfe-config POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
