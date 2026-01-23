import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('certificado') as File

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Validar extensão
    if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
      return NextResponse.json(
        { error: 'Apenas arquivos .pfx ou .p12 são permitidos' },
        { status: 400 }
      )
    }

    // Criar diretório de certificados se não existir
    const certDir = join(process.cwd(), 'private', 'certificates')
    if (!existsSync(certDir)) {
      await mkdir(certDir, { recursive: true })
    }

    // Salvar arquivo com nome único
    const timestamp = Date.now()
    const filename = `cert_${timestamp}.pfx`
    const filepath = join(certDir, filename)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    console.log('[Certificado] Upload realizado:', filename)

    return NextResponse.json({
      success: true,
      path: filepath,
      filename,
    })
  } catch (error: any) {
    console.error('[Certificado Upload] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer upload do certificado', details: error.message },
      { status: 500 }
    )
  }
}
