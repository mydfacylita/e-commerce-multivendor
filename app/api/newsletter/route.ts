import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, source } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
    }

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } })

    if (existing) {
      if (existing.active) {
        return NextResponse.json({ message: 'already_subscribed' }, { status: 200 })
      }
      // Reativar inscrição cancelada
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: { active: true },
      })
      return NextResponse.json({ message: 'resubscribed' }, { status: 200 })
    }

    await prisma.newsletterSubscriber.create({
      data: { email, source: source || 'footer' },
    })

    return NextResponse.json({ message: 'subscribed' }, { status: 201 })
  } catch (error: any) {
    console.error('[newsletter]', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
