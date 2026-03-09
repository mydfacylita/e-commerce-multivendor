import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Force dynamic - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(request: NextRequest) {
  // 🔐 Verificar autenticação (admin ou vendedor)
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized - Login required' }, { status: 401 })
  }
  
  // Apenas admin e vendedor podem fazer upload
  const allowedRoles = ['admin', 'ADMIN', 'SELLER', 'seller']
  if (!allowedRoles.includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden - Upload not allowed' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'products'

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    // Para SVG, ICO e documentos, verificar também pela extensão
    const extension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'ico', 'pdf', 'doc', 'docx']
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension || '')) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPG, PNG, WEBP, GIF, SVG, ICO, PDF, DOC ou DOCX' },
        { status: 400 }
      )
    }

    // Validar tamanho: documentos 20MB, imagens 5MB
    const isDoc = ['pdf', 'doc', 'docx'].includes(extension || '')
    const maxSize = isDoc ? 20 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: isDoc ? 'Arquivo muito grande. Máximo 20MB para documentos' : 'Arquivo muito grande. Máximo 5MB' },
        { status: 400 }
      )
    }

    // Criar nome único para o arquivo
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${timestamp}-${randomString}.${extension}`

    // Criar diretório de uploads se não existir
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Salvar arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    // Retornar URL pública (absoluta para evitar problemas de subdomínio)
    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || ''
    const publicUrl = `${baseUrl}/uploads/${folder}/${fileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('Erro ao fazer upload:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer upload do arquivo' },
      { status: 500 }
    )
  }
}
