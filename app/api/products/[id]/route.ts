/**
 * 📦 API DE PRODUTO INDIVIDUAL
 * 
 * GET /api/products/[id] - Buscar produto por ID ou slug
 * 
 * 🔒 SEGURANÇA:
 * - Requer API Key válida no header 'x-api-key'
 * - Rate limiting: 60 requests/minuto por IP
 * - Retorna apenas dados públicos (sem custos, fornecedor, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSecurityMiddleware, checkRateLimit, getClientIP, secureResponse } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

// GET - Buscar produto por ID ou slug
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔒 Verificar segurança (API Key + Rate Limiting)
    const security = await apiSecurityMiddleware(request, {
      requireApiKey: true,
      rateLimit: true
    });

    if (!security.success) {
      return security.response;
    }

    const id = params.id;
    
    console.log('📦 [API] Buscando produto:', id, '| App:', security.appId);

    if (!id) {
      return NextResponse.json(
        { error: 'ID do produto não fornecido' },
        { status: 400 }
      );
    }

    // Tentar buscar por ID primeiro, depois por slug
    let product = await prisma.product.findFirst({
      where: {
        OR: [
          { id },
          { slug: id }
        ],
        active: true
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        seller: {
          select: {
            id: true,
            storeName: true,
            storeSlug: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Parsear JSON de imagens, sizes, specifications, attributes, etc
    let images: string[] = [];
    let sizes: string[] = [];
    let specifications: Record<string, string> = {};
    let attributes: Record<string, string> = {};
    let variants: any[] = [];
    let technicalSpecs: Record<string, string> = {};
    
    try {
      images = typeof product.images === 'string' ? JSON.parse(product.images) : (product.images || []);
    } catch { images = []; }
    
    try {
      sizes = typeof product.sizes === 'string' ? JSON.parse(product.sizes) : (product.sizes || []);
    } catch { sizes = []; }
    
    try {
      specifications = product.specifications ? JSON.parse(product.specifications) : {};
    } catch { specifications = {}; }
    
    try {
      attributes = product.attributes ? JSON.parse(product.attributes) : {};
    } catch { attributes = {}; }
    
    try {
      variants = product.variants ? JSON.parse(product.variants) : [];
    } catch { variants = []; }
    
    try {
      technicalSpecs = product.technicalSpecs ? JSON.parse(product.technicalSpecs) : {};
    } catch { technicalSpecs = {}; }

    // Formatar resposta
    const formattedProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      comparePrice: product.comparePrice,
      images: images,
      category: product.category,
      vendor: product.seller,
      stock: product.stock,
      weight: product.weight,
      sizes: sizes,
      colors: product.color ? [product.color] : [],
      brand: product.brand,
      model: product.model,
      gtin: product.gtin,
      mpn: product.mpn,
      specifications: specifications,
      attributes: attributes,
      variants: variants,
      technicalSpecs: technicalSpecs,
      sizeType: product.sizeType,
      sizeCategory: product.sizeCategory,
      // Dimensões
      dimensions: {
        length: product.length,
        width: product.width,
        height: product.height,
        weight: product.weight,
        weightWithPackage: product.weightWithPackage
      },
      isActive: product.active,
      isFeatured: product.featured,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      // Calcular desconto se houver
      discount: product.comparePrice && product.comparePrice > product.price
        ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
        : 0
    };

    return NextResponse.json(formattedProduct);

  } catch (error) {
    console.error('❌ Erro ao buscar produto:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: errorMessage },
      { status: 500 }
    );
  }
}
