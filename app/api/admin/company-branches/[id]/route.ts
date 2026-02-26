import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/admin/company-branches/[id] — atualiza filial
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const branch = await prisma.companyBranch.findUnique({ where: { id: params.id } })
  if (!branch) return NextResponse.json({ error: 'Filial não encontrada' }, { status: 404 })

  const body = await req.json()
  const {
    code, name, cnpj, ie, im,
    street, number, complement, neighborhood, city, cityCode, state, zipCode,
    phone, email, statesServed, isDefault, isActive,
  } = body

  // Se definir como padrão, remove de outros
  if (isDefault && !branch.isDefault) {
    await prisma.companyBranch.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
  }

  const updated = await prisma.companyBranch.update({
    where: { id: params.id },
    data: {
      ...(code !== undefined && { code: code.trim().toUpperCase() }),
      ...(name !== undefined && { name: name.trim() }),
      ...(cnpj !== undefined && { cnpj: cnpj.replace(/\D/g, '') }),
      ...(ie !== undefined && { ie: ie?.trim() || null }),
      ...(im !== undefined && { im: im?.trim() || null }),
      ...(street !== undefined && { street: street.trim() }),
      ...(number !== undefined && { number: number.trim() }),
      ...(complement !== undefined && { complement: complement?.trim() || null }),
      ...(neighborhood !== undefined && { neighborhood: neighborhood.trim() }),
      ...(city !== undefined && { city: city.trim() }),
      ...(state !== undefined && { state: state.trim().toUpperCase() }),
      ...(zipCode !== undefined && { zipCode: zipCode.replace(/\D/g, '') }),
      ...(phone !== undefined && { phone: phone?.replace(/\D/g, '') || null }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(statesServed !== undefined && { statesServed }),
      ...(isDefault !== undefined && { isDefault }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  // Patch cityCode via raw SQL (column added after last prisma generate)
  if (cityCode !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE company_branch SET cityCode = ? WHERE id = ?`,
      cityCode ? cityCode.replace(/\D/g, '').slice(0, 7) : null,
      params.id
    )
  }

  return NextResponse.json({ ...updated, cityCode: cityCode !== undefined ? (cityCode?.replace(/\D/g, '').slice(0, 7) || null) : undefined })
}

// DELETE /api/admin/company-branches/[id] — desativa filial (soft delete)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const branch = await prisma.companyBranch.findUnique({ where: { id: params.id } })
  if (!branch) return NextResponse.json({ error: 'Filial não encontrada' }, { status: 404 })

  if (branch.isDefault) {
    return NextResponse.json({ error: 'Não é possível desativar a filial padrão' }, { status: 400 })
  }

  await prisma.companyBranch.update({
    where: { id: params.id },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true })
}
