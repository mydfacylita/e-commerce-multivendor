import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

/**
 * Extrai e valida o token JWT do header Authorization
 */
function getUserFromToken(request: NextRequest): { id: string; email: string; role: string } | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: string }
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role
    }
  } catch {
    return null
  }
}

/**
 * GET /api/user/address
 * Retorna os endereços do usuário autenticado
 */
export async function GET(request: NextRequest) {
  const user = getUserFromToken(request)
  
  if (!user) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    )
  }

  try {
    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Formatar endereços para o app
    const formattedAddresses = addresses.map(addr => ({
      id: addr.id,
      label: addr.label,
      recipientName: addr.recipientName,
      street: addr.street,
      number: addr.street.match(/,?\s*(\d+)/)?.[1] || '',
      complement: addr.complement,
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      phone: addr.phone,
      isDefault: addr.isDefault
    }))

    return NextResponse.json({
      addresses: formattedAddresses,
      defaultAddress: formattedAddresses.find(a => a.isDefault) || formattedAddresses[0] || null
    })

  } catch (error) {
    console.error('[USER/ADDRESS] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar endereços' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/address
 * Cria ou atualiza um endereço do usuário
 */
export async function POST(request: NextRequest) {
  const user = getUserFromToken(request)
  
  if (!user) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { 
      id, // Se fornecido, atualiza; senão, cria
      label,
      recipientName,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
      phone,
      reference,
      notes,
      isDefault
    } = body

    // Validação básica
    if (!street || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: rua, cidade, estado, CEP' },
        { status: 400 }
      )
    }

    // Montar endereço completo
    const fullStreet = number ? `${street}, ${number}` : street

    // Se vai ser padrão, remover padrão dos outros
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false }
      })
    }

    let address
    if (id) {
      // Atualizar existente
      address = await prisma.address.update({
        where: { id, userId: user.id },
        data: {
          label,
          recipientName,
          street: fullStreet,
          complement,
          neighborhood,
          city,
          state,
          zipCode: zipCode.replace(/\D/g, ''),
          phone,
          reference,
          notes,
          isDefault: isDefault || false
        }
      })
    } else {
      // Criar novo
      // Se é o primeiro endereço, definir como padrão
      const addressCount = await prisma.address.count({ where: { userId: user.id } })
      
      address = await prisma.address.create({
        data: {
          userId: user.id,
          label: label || 'Casa',
          recipientName,
          street: fullStreet,
          complement,
          neighborhood,
          city,
          state,
          zipCode: zipCode.replace(/\D/g, ''),
          phone,
          reference,
          notes,
          isDefault: isDefault || addressCount === 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      address: {
        id: address.id,
        label: address.label,
        recipientName: address.recipientName,
        street: address.street,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        phone: address.phone,
        isDefault: address.isDefault
      }
    })

  } catch (error) {
    console.error('[USER/ADDRESS] Erro ao salvar:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar endereço' },
      { status: 500 }
    )
  }
}
