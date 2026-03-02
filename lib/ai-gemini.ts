/**
 * Helper reutilizável para Gemini AI
 * Usado por todas as features de IA do MydShop
 */
import { GoogleGenAI } from '@google/genai'
import { prisma } from '@/lib/prisma'

export interface AIConfig {
  enabled: boolean
  provider: string
  apiKey: string
  model: string
}

export async function getAIConfig(): Promise<AIConfig | null> {
  try {
    const config = await prisma.systemConfig.findFirst({
      where: { key: 'ai_config' }
    })
    if (!config?.value) return null
    const parsed = JSON.parse(config.value)
    if (!parsed?.apiKey || !parsed?.enabled) return null
    return parsed as AIConfig
  } catch {
    return null
  }
}

export async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const aiConfig = await getAIConfig()
  if (!aiConfig) throw new Error('IA não configurada')

  const genai = new GoogleGenAI({ apiKey: aiConfig.apiKey })
  const result = await genai.models.generateContent({
    model: aiConfig.model || 'gemini-2.5-flash',
    contents: prompt,
    config: systemInstruction
      ? { systemInstruction }
      : undefined
  })

  return result.text ?? ''
}
