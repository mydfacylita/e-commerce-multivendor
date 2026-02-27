import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
// Allow large video bodies in App Router
export const maxDuration = 60 // seconds (Vercel/self-hosted)

const ALLOWED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',   // .mov
  'video/x-msvideo',  // .avi
  'video/x-matroska', // .mkv
  'video/mpeg',
]
const ALLOWED_EXT = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'mpeg', 'mpg']
const MAX_SIZE = 500 * 1024 * 1024 // 500 MB

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const allowedRoles = ['admin', 'ADMIN', 'SELLER', 'seller']
  if (!allowedRoles.includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || ''

    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.includes(extension)) {
      return NextResponse.json(
        { error: 'Formato não suportado. Use MP4, WebM, MOV, AVI ou MKV.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 500 MB.' },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    const fileName = `${timestamp}-${random}.${extension}`

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'videos')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(join(uploadDir, fileName), buffer)

    const publicUrl = `/uploads/videos/${fileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('Erro ao fazer upload de vídeo:', error)
    return NextResponse.json({ error: 'Erro ao salvar vídeo' }, { status: 500 })
  }
}
