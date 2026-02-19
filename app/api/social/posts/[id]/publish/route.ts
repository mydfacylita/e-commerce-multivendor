import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * Publica um post nas redes sociais
 * POST /api/social/posts/[id]/publish
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params

    // Buscar post com conexão
    const post = await prisma.socialPost.findUnique({
      where: { id },
      include: {
        connection: true,
        product: true
      }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post não encontrado' },
        { status: 404 }
      )
    }

    if (post.status === 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Post já foi publicado' },
        { status: 400 }
      )
    }

    if (!post.connection.isActive) {
      return NextResponse.json(
        { error: 'Conexão inativa' },
        { status: 400 }
      )
    }

    // Atualizar status para PUBLISHING
    await prisma.socialPost.update({
      where: { id },
      data: { status: 'PUBLISHING' }
    })

    let platformPostId: string | null = null
    let platformUrl: string | null = null
    let errorMessage: string | null = null

    try {
      const images = typeof post.images === 'string' ? JSON.parse(post.images) : post.images

      if (post.platform === 'FACEBOOK') {
        // Publicar no Facebook
        const result = await publishToFacebook(
          post.connection.platformId,
          post.connection.accessToken,
          post.caption,
          images
        )
        platformPostId = result.id
        platformUrl = `https://facebook.com/${result.id}`
      } else if (post.platform === 'INSTAGRAM') {
        // Publicar no Instagram
        const result = await publishToInstagram(
          post.connection.platformId,
          post.connection.accessToken,
          post.caption,
          images,
          post.connection.metadata as any
        )
        platformPostId = result.id
        platformUrl = result.permalink
      } else {
        throw new Error(`Plataforma ${post.platform} não suportada ainda`)
      }

      // Atualizar como PUBLISHED
      const updatedPost = await prisma.socialPost.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          platformPostId,
          platformUrl,
          errorMessage: null
        }
      })

      return NextResponse.json(updatedPost)
    } catch (error: any) {
      console.error('Erro ao publicar:', error)
      errorMessage = error.message || 'Erro desconhecido'

      // Atualizar como FAILED
      await prisma.socialPost.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage
        }
      })

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Erro no endpoint de publicação:', error)
    return NextResponse.json(
      { error: 'Erro ao publicar post' },
      { status: 500 }
    )
  }
}

/**
 * Publica no Facebook
 */
async function publishToFacebook(
  pageId: string,
  accessToken: string,
  message: string,
  images: string[]
): Promise<{ id: string }> {
  // Se tem apenas 1 imagem, post simples
  if (images.length === 1) {
    const url = `https://graph.facebook.com/v18.0/${pageId}/photos`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: images[0],
        message,
        access_token: accessToken
      })
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message)
    }

    return { id: data.post_id || data.id }
  }

  // Se tem múltiplas imagens, criar álbum
  // 1. Upload de cada foto
  const photoIds: string[] = []
  for (const imageUrl of images) {
    const uploadUrl = `https://graph.facebook.com/v18.0/${pageId}/photos`
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        published: false, // Não publicar ainda
        access_token: accessToken
      })
    })

    const uploadData = await uploadResponse.json()
    if (uploadData.error) {
      throw new Error(uploadData.error.message)
    }
    
    photoIds.push(uploadData.id)
  }

  // 2. Criar post com as fotos
  const postUrl = `https://graph.facebook.com/v18.0/${pageId}/feed`
  const postResponse = await fetch(postUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      attached_media: photoIds.map(id => ({ media_fbid: id })),
      access_token: accessToken
    })
  })

  const postData = await postResponse.json()
  
  if (postData.error) {
    throw new Error(postData.error.message)
  }

  return { id: postData.id }
}

/**
 * Publica no Instagram
 */
async function publishToInstagram(
  instagramAccountId: string,
  accessToken: string,
  caption: string,
  images: string[],
  metadata: any
): Promise<{ id: string; permalink: string }> {
  // Instagram só aceita 1 imagem por post direto (ou carrossel com process diferente)
  // Por simplicidade, vamos publicar apenas a primeira imagem
  const imageUrl = images[0]

  // 1. Criar container de mídia
  const containerUrl = `https://graph.facebook.com/v18.0/${instagramAccountId}/media`
  const containerResponse = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: accessToken
    })
  })

  const containerData = await containerResponse.json()
  
  if (containerData.error) {
    throw new Error(containerData.error.message)
  }

  const creationId = containerData.id

  // 2. Aguardar processamento (max 30s)
  let ready = false
  let attempts = 0
  while (!ready && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 3000)) // 3s
    
    const statusUrl = `https://graph.facebook.com/v18.0/${creationId}?fields=status_code&access_token=${accessToken}`
    const statusResponse = await fetch(statusUrl)
    const statusData = await statusResponse.json()
    
    if (statusData.status_code === 'FINISHED') {
      ready = true
    } else if (statusData.status_code === 'ERROR') {
      throw new Error('Erro ao processar imagem no Instagram')
    }
    
    attempts++
  }

  if (!ready) {
    throw new Error('Timeout ao aguardar processamento da imagem')
  }

  // 3. Publicar
  const publishUrl = `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`
  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: accessToken
    })
  })

  const publishData = await publishResponse.json()
  
  if (publishData.error) {
    throw new Error(publishData.error.message)
  }

  // 4. Buscar permalink
  const postUrl = `https://graph.facebook.com/v18.0/${publishData.id}?fields=permalink&access_token=${accessToken}`
  const postResponse = await fetch(postUrl)
  const postData = await postResponse.json()

  return {
    id: publishData.id,
    permalink: postData.permalink || `https://instagram.com/p/${publishData.id}`
  }
}
