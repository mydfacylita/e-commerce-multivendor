import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenAI } from '@google/genai'

export const dynamic = 'force-dynamic'

async function getAIConfig() {
  const config = await prisma.systemConfig.findFirst({
    where: { key: 'ai_config' }
  })
  
  if (!config?.value) return null
  
  try {
    return JSON.parse(config.value)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { description, productName, action = 'improve' } = body

    if (!description && !productName) {
      return NextResponse.json({ error: 'Descrição ou nome do produto é obrigatório' }, { status: 400 })
    }

    // Buscar configuração da IA
    const aiConfig = await getAIConfig()
    
    if (!aiConfig?.apiKey) {
      return NextResponse.json({ 
        error: 'API de IA não configurada. Configure em Configurações > Inteligência Artificial.' 
      }, { status: 400 })
    }

    if (!aiConfig.enabled) {
      return NextResponse.json({ 
        error: 'IA está desativada. Ative em Configurações > Inteligência Artificial.' 
      }, { status: 400 })
    }

    const provider = aiConfig.provider || 'gemini'
    
    // Montar o prompt baseado na ação
    let prompt = ''
    
    if (action === 'improve') {
      prompt = `Você é um redator de e-commerce brasileiro. Reescreva a descrição do produto abaixo de forma mais atraente e profissional.

Produto: ${productName || 'Produto'}

Descrição original:
${description}

Regras OBRIGATÓRIAS:
- NÃO inclua título ou cabeçalho - comece direto com o texto da descrição
- Escreva em português do Brasil
- Use linguagem persuasiva mas natural
- Destaque os benefícios para o cliente
- Use bullet points (•) para listar características
- NÃO invente especificações que não existem no original
- NÃO use emojis
- Tamanho: entre 100 e 250 palavras

Responda APENAS com a descrição, sem títulos, sem explicações.`
    } else if (action === 'generate') {
      prompt = `Você é um especialista em e-commerce brasileiro. Crie uma descrição atraente e profissional para o seguinte produto:

Nome do Produto: ${productName}

Instruções:
- Escreva em português do Brasil
- Use linguagem persuasiva e profissional
- Destaque possíveis benefícios para o cliente
- Organize em parágrafos ou bullet points
- Não use emojis em excesso
- Tamanho ideal: 100-200 palavras

Retorne APENAS a descrição, sem explicações adicionais.`
    } else if (action === 'translate') {
      prompt = `Traduza a seguinte descrição de produto para português do Brasil, mantendo o tom profissional e adaptando para o mercado brasileiro:

${description}

Instruções:
- Traduza para português brasileiro
- Adapte medidas para o sistema métrico se necessário
- Mantenha o tom profissional
- Não invente informações

Retorne APENAS a tradução, sem explicações adicionais.`
    } else if (action === 'summarize') {
      prompt = `Resuma a seguinte descrição de produto em um texto mais conciso, mantendo as informações mais importantes:

${description}

Instruções:
- Escreva em português do Brasil
- Mantenha apenas as informações essenciais
- Tamanho ideal: 50-100 palavras

Retorne APENAS o resumo, sem explicações adicionais.`
    }

    let improvedDescription = ''

    if (provider === 'gemini') {
      // Google Gemini API usando novo SDK @google/genai
      try {
        const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey })
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          }
        })
        
        improvedDescription = response.text || ''
      } catch (error: any) {
        console.error('Erro Gemini SDK:', error)
        const errorMessage = error?.message || 'Erro ao processar com IA'
        
        // Verificar se é erro de quota
        if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
          return NextResponse.json({ 
            error: 'IA indisponível no momento. Tente novamente mais tarde.' 
          }, { status: 429 })
        }
        
        // Verificar se é erro de chave expirada
        if (errorMessage.includes('expired') || errorMessage.includes('API_KEY_INVALID')) {
          return NextResponse.json({ 
            error: 'Chave de API expirada ou inválida. Crie uma nova chave no Google AI Studio.' 
          }, { status: 401 })
        }
        
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
      
    } else if (provider === 'openai') {
      // OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: aiConfig.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Você é um especialista em e-commerce brasileiro.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1024
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Erro OpenAI:', error)
        return NextResponse.json({ error: 'Erro ao processar com IA' }, { status: 500 })
      }

      const data = await response.json()
      improvedDescription = data.choices?.[0]?.message?.content || ''
    }

    if (!improvedDescription) {
      return NextResponse.json({ error: 'Não foi possível gerar a descrição' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      description: improvedDescription.trim()
    })

  } catch (error) {
    console.error('Erro ao melhorar descrição:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
