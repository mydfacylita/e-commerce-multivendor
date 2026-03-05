import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key'

async function getUser(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return { id: session.user.id }

  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.substring(7), JWT_SECRET) as { sub: string }
      return { id: decoded.sub }
    } catch {}
  }
  return null
}

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
const IMAGE_EXTS  = ['jpg', 'jpeg', 'png', 'webp', 'gif']
const VIDEO_EXTS  = ['mp4', 'webm', 'mov', 'avi']

const MAX_IMAGE = 8  * 1024 * 1024  // 8 MB
const MAX_VIDEO = 50 * 1024 * 1024  // 50 MB

export async function POST(request: NextRequest) {
  const user = await getUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Faça login para enviar mídia' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const ext  = file.name.split('.').pop()?.toLowerCase() || ''
    const isImage = IMAGE_TYPES.includes(file.type) || IMAGE_EXTS.includes(ext)
    const isVideo = VIDEO_TYPES.includes(file.type) || VIDEO_EXTS.includes(ext)

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Formato não suportado. Imagens: JPG, PNG, WEBP, GIF. Vídeos: MP4, WEBM, MOV' },
        { status: 400 }
      )
    }

    const maxSize = isVideo ? MAX_VIDEO : MAX_IMAGE
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: isVideo ? 'Vídeo muito grande. Máximo 50MB' : 'Imagem muito grande. Máximo 8MB' },
        { status: 400 }
      )
    }

    const timestamp    = Date.now()
    const rand         = Math.random().toString(36).substring(2, 10)
    const fileName     = `${timestamp}-${rand}.${ext}`
    const uploadDir    = join(process.cwd(), 'public', 'uploads', 'reviews')

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, fileName), Buffer.from(bytes))

    const baseUrl  = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || ''
    const publicUrl = `${baseUrl}/uploads/reviews/${fileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      type: isVideo ? 'video' : 'image',
      fileName,
      size: file.size,
    })
  } catch (error) {
    console.error('[reviews/upload] Erro:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
  }
}
