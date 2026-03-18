import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Não cachear; relatórios devem retornar dados atualizados
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

async function validateAdminOrPermission(email: string | null | undefined) {
  if (!email) return false

  const user = await prisma.user.findUnique({
    where: { email },
    include: { adminStaff: true },
  })

  if (!user) return false

  // Master admin
  if (user.role === 'ADMIN') return true

  // Staff with permission
  if (!user.adminStaff || !user.adminStaff.isActive) return false

  try {
    const perms: string[] = JSON.parse(user.adminStaff.permissions || '[]')
    return perms.includes('monitoramento.relatorios')
  } catch {
    return false
  }
}

function safeParseJSON<T>(value: any): T | null {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

// Extrair cor e tamanho do skuAttr ou properties
function extractColorSize(sku: any): { cor: string; tamanho: string } {
  let cor = '-'
  let tamanho = '-'

  if (sku.properties && typeof sku.properties === 'object') {
    Object.entries(sku.properties).forEach(([key, value]: [string, any]) => {
      const keyLower = key.toLowerCase()
      if (keyLower.includes('cor') || keyLower === 'color') {
        cor = value && String(value).length > 0 ? String(value) : '-'
      }
      if (keyLower.includes('tamanho') || keyLower === 'size') {
        tamanho = value && String(value).length > 0 ? String(value) : '-'
      }
    })
  } else if (sku.skuAttr) {
    // Tentar parsear do skuAttr string (formatos: "Color:Red,Size:M" ou "Red;M")
    const attr = String(sku.skuAttr)
    const separators = [';', '|', ',']
    let parts: string[] = []

    // Tentar diferentes separadores
    for (const sep of separators) {
      if (attr.includes(sep)) {
        parts = attr.split(sep)
        break
      }
    }

    if (parts.length === 0) parts = [attr]

    parts.forEach((part: string) => {
      const [key, val] = part.includes(':') ? part.split(':') : [part, part]
      if (key && val) {
        const cleanKey = key.trim().toLowerCase()
        const cleanVal = val.trim()

        if (cleanKey.includes('cor') || cleanKey === 'color') {
          cor = cleanVal
        } else if (cleanKey.includes('tamanho') || cleanKey === 'size') {
          tamanho = cleanVal
        } else if (cleanKey === 'option' || !cleanKey.includes(':')) {
          // Se for apenas um valor sem chave, tentar adivinhar
          if (!cor || cor === '-') cor = cleanVal
          else if (!tamanho || tamanho === '-') tamanho = cleanVal
        }
      }
    })
  }

  return { cor, tamanho }
}


export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email

  const authorized = await validateAdminOrPermission(email)
  if (!authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const url = new URL(request.url)
  const mode = (url.searchParams.get('mode') || 'sintetico').toLowerCase()
  const skuFilter = url.searchParams.get('sku')?.toLowerCase()
  const categoryId = url.searchParams.get('categoryId')
  const minStock = url.searchParams.get('minStock') ? parseInt(url.searchParams.get('minStock')!, 10) : undefined
  const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 1000
  const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : 0

  // Construir where clause dinamicamente
  const whereClause: any = { active: true }

  if (categoryId) {
    whereClause.categoryId = categoryId
  }

  if (skuFilter) {
    whereClause.OR = [
      { supplierSku: { contains: skuFilter } },
      { name: { contains: skuFilter } },
    ]
  }

  // Carregar produtos com filtros
  const products = await prisma.product.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      supplierSku: true,
      stock: true,
      variants: true,
      categoryId: true,
      updatedAt: true,
    },
    orderBy: {
      name: 'asc',
    },
    take: limit,
    skip: offset,
  })

  const rowsSintetico = products.map(p => {
    const parsed = safeParseJSON<any>(p.variants)
    const skus = Array.isArray(parsed?.skus) ? parsed.skus : []
    const properties = Array.isArray(parsed?.properties) ? parsed.properties : []

    // Extrair cores e tamanhos disponíveis
    const cores = new Set<string>()
    const tamanhos = new Set<string>()

    properties.forEach((prop: any) => {
      if (prop.type === 'color' || (prop.name && prop.name.toLowerCase().includes('cor'))) {
        prop.options?.forEach((opt: any) => {
          if (opt.label && opt.label !== '-') cores.add(opt.label)
          else if (opt.value && opt.value !== '-') cores.add(opt.value)
        })
      }
      if (prop.type === 'size' || (prop.name && prop.name.toLowerCase().includes('tamanho'))) {
        prop.options?.forEach((opt: any) => {
          if (opt.label && opt.label !== '-') tamanhos.add(opt.label)
          else if (opt.value && opt.value !== '-') tamanhos.add(opt.value)
        })
      }
    })

    // Se não conseguiu extrair das properties, tentar dos SKUs
    if (cores.size === 0 || tamanhos.size === 0) {
      skus.forEach((sku: any) => {
        const { cor, tamanho } = extractColorSize(sku)
        if (cor !== '-' && cores.size < 20) cores.add(cor)
        if (tamanho !== '-' && tamanhos.size < 20) tamanhos.add(tamanho)
      })
    }

    const variantStock = skus.reduce((sum: number, sku: any) => {
      const stock = typeof sku.stock === 'number' ? sku.stock : Number(sku.stock) || 0
      return sum + stock
    }, 0)

    return {
      productId: p.id,
      productName: p.name,
      supplierSku: p.supplierSku,
      productStock: p.stock ?? 0,
      variantStock,
      totalStock: (p.stock ?? 0) + variantStock,
      variantCount: skus.length,
      coresDisponiveis: Array.from(cores).sort(),
      tamanhosDisponiveis: Array.from(tamanhos).sort(),
      updatedAt: p.updatedAt.toISOString(),
    }
  }).filter(row => {
    // Aplicar filtro de estoque mínimo
    if (minStock !== undefined && row.totalStock < minStock) {
      return false
    }
    return true
  })

  if (mode === 'analitico') {
    const rowsAnalitico: Array<{
      productId: string
      productName: string
      supplierSku: string | null
      variantSku: string
      cor: string
      tamanho: string
      variantAttributes: string
      stock: number
      price?: number
      available?: boolean
      image?: string
      updatedAt: string
    }> = []

    products.forEach(p => {
      const parsed = safeParseJSON<any>(p.variants)
      const skus = Array.isArray(parsed?.skus) ? parsed.skus : []

      if (skus.length === 0) {
        const totalStock = p.stock ?? 0
        // Aplicar filtro de estoque mínimo
        if (minStock !== undefined && totalStock < minStock) {
          return
        }
        rowsAnalitico.push({
          productId: p.id,
          productName: p.name,
          supplierSku: p.supplierSku,
          variantSku: p.supplierSku || p.id,
          cor: '-',
          tamanho: '-',
          variantAttributes: '',
          stock: totalStock,
          price: undefined,
          available: totalStock > 0,
          image: undefined,
          updatedAt: p.updatedAt.toISOString(),
        })
      } else {
        skus.forEach((sku: any) => {
          const skuStock = typeof sku.stock === 'number' ? sku.stock : Number(sku.stock) || 0
          // Aplicar filtro de estoque mínimo
          if (minStock !== undefined && skuStock < minStock) {
            return
          }

          const { cor, tamanho } = extractColorSize(sku)

          rowsAnalitico.push({
            productId: p.id,
            productName: p.name,
            supplierSku: p.supplierSku,
            variantSku: sku.skuId || sku.id || '',
            cor,
            tamanho,
            variantAttributes: sku.skuAttr || sku.attributes || '',
            stock: skuStock,
            price: typeof sku.price === 'number' ? sku.price : Number(sku.price) || undefined,
            available: sku.available !== undefined ? Boolean(sku.available) : skuStock > 0,
            image: sku.image || undefined,
            updatedAt: p.updatedAt.toISOString(),
          })
        })
      }
    })

    return NextResponse.json({
      data: rowsAnalitico,
      pagination: {
        limit,
        offset,
        total: rowsAnalitico.length,
      },
    })
  }

  return NextResponse.json({
    data: rowsSintetico,
    pagination: {
      limit,
      offset,
      total: rowsSintetico.length,
    },
  })
}
