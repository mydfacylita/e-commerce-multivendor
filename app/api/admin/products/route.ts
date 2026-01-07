import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 403 }
      )
    }

    const data = await req.json()

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        comparePrice: data.comparePrice,
        costPrice: data.costPrice,
        shippingCost: data.shippingCost,
        taxCost: data.taxCost,
        totalCost: data.totalCost,
        margin: data.margin,
        stock: data.stock,
        categoryId: data.categoryId,
        supplierId: data.supplierId,
        supplierSku: data.supplierSku,
        supplierUrl: data.supplierUrl,
        images: JSON.stringify(data.images),
        featured: data.featured || false,
        gtin: data.gtin,
        brand: data.brand,
        model: data.model,
        color: data.color,
        mpn: data.mpn,
        technicalSpecs: data.technicalSpecs,
        // Informações do fornecedor AliExpress
        supplierStoreName: data.supplierStoreName,
        supplierStoreId: data.supplierStoreId,
        supplierStock: data.supplierStock,
        isChoiceProduct: data.isChoiceProduct || false,
        availableForDropship: data.availableForDropship !== false,
        supplierRating: data.supplierRating,
        supplierShippingSpeed: data.supplierShippingSpeed,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return NextResponse.json(
      { message: 'Erro ao criar produto' },
      { status: 500 }
    )
  }
}
