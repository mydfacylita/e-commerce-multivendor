import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, statSync, existsSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

// Serve vídeos locais com suporte a Range requests (seek/progress no player HTML5)
export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename
  // Sanitize: só aceita alphanumeric, hifens, underscores e extensão de vídeo
  if (!/^[\w\-]+\.(mp4|webm|ogg|mov|avi|mkv|mpeg|mpg)$/i.test(filename)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const filePath = join(process.cwd(), 'public', 'uploads', 'videos', filename)
  if (!existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const stat = statSync(filePath)
  const fileSize = stat.size

  const MIME: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    mpeg: 'video/mpeg',
    mpg: 'video/mpeg',
  }
  const ext = filename.split('.').pop()!.toLowerCase()
  const contentType = MIME[ext] || 'video/mp4'

  const rangeHeader = req.headers.get('range')

  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1)
    const chunkSize = end - start + 1

    const stream = createReadStream(filePath, { start, end })
    const webStream = Readable.toWeb(stream) as ReadableStream

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  // Sem range - serve o arquivo completo
  const stream = createReadStream(filePath)
  const webStream = Readable.toWeb(stream) as ReadableStream

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Length': String(fileSize),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
