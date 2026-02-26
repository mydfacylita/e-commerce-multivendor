import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/company-branches — lista todas as filiais
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Raw SQL so nf* columns (added after last prisma generate) are included
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, code, name, cnpj, ie, im, street, number, complement, neighborhood,
            city, cityCode, state, zipCode, phone, email, statesServed, isDefault, isActive,
            nfSerie, nfAmbiente, nfNaturezaOperacao, nfCrt,
            nfCertificadoArquivo, nfCertificadoValidade
     FROM company_branch
     ORDER BY isDefault DESC, name ASC`
  )

  // MySQL returns tinyint as 0/1 — normalise to proper booleans
  const branches = rows.map(r => ({
    ...r,
    isDefault: r.isDefault === 1 || r.isDefault === true,
    isActive:  r.isActive  === 1 || r.isActive  === true,
    statesServed: r.statesServed
      ? (typeof r.statesServed === 'string' ? JSON.parse(r.statesServed) : r.statesServed)
      : [],
  }))

  return NextResponse.json(branches)
}

// POST /api/admin/company-branches — cria nova filial
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const {
    code, name, cnpj, ie, im,
    street, number, complement, neighborhood, city, cityCode, state, zipCode,
    phone, email, statesServed, isDefault,
  } = body

  if (!code || !name || !cnpj || !street || !number || !neighborhood || !city || !state || !zipCode) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  // Se definir como padrão, remove de outros
  if (isDefault) {
    await prisma.companyBranch.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
  }

  // Create without cityCode first (not yet in generated client), then patch with raw SQL
  const branch = await prisma.companyBranch.create({
    data: {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      cnpj: cnpj.replace(/\D/g, ''),
      ie: ie?.trim() || null,
      im: im?.trim() || null,
      street: street.trim(),
      number: number.trim(),
      complement: complement?.trim() || null,
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zipCode: zipCode.replace(/\D/g, ''),
      phone: phone?.replace(/\D/g, '') || null,
      email: email?.trim() || null,
      statesServed: statesServed ? JSON.stringify(Array.isArray(statesServed) ? statesServed : [statesServed]) : null,
      isDefault: isDefault ?? false,
    },
  })

  // Patch cityCode via raw SQL (column added after last prisma generate)
  if (cityCode) {
    await prisma.$executeRawUnsafe(
      `UPDATE company_branch SET cityCode = ? WHERE id = ?`,
      cityCode.replace(/\D/g, '').slice(0, 7),
      branch.id
    )
  }

  return NextResponse.json({ ...branch, cityCode: cityCode?.replace(/\D/g, '').slice(0, 7) || null }, { status: 201 })
}
