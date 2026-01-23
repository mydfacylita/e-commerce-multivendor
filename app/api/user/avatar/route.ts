import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

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
 * POST /api/user/avatar
 * Upload de avatar do usuário
 */
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromToken(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('avatar') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF' },
        { status: 400 }
      )
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 5MB' },
        { status: 400 }
      )
    }

    // Gerar nome único para o arquivo
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `${crypto.randomUUID()}.${extension}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
    const filePath = path.join(uploadDir, fileName)

    // Criar diretório se não existir
    await mkdir(uploadDir, { recursive: true })

    // Salvar arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // URL pública do avatar (completa para funcionar no app mobile)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const avatarUrl = `${baseUrl}/uploads/avatars/${fileName}`

    // Atualizar usuário no banco
    await prisma.user.update({
      where: { id: user.id },
      data: { image: avatarUrl }
    })

    return NextResponse.json({
      message: 'Avatar atualizado com sucesso',
      url: avatarUrl
    })
  } catch (error) {
    console.error('[Avatar POST] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer upload do avatar' },
      { status: 500 }
    )
  }
}
