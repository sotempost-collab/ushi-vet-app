import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Получить токен из заголовка
async function getSession(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      clinic: true,
    },
  })

  if (!session || session.expiresAt < new Date()) return null
  return session
}

// GET — список визитов клиники
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const visits = await prisma.visit.findMany({
      where: { clinicId: session.clinicId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        species: true,
        weight: true,
        visitDate: true,
        visitSummary: true,
        createdAt: true,
        doctor: { select: { displayName: true } },
      },
    })

    return NextResponse.json({ visits })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — создать новый визит
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await request.json()
    const visit = await prisma.visit.create({
      data: {
        clinicId: session.clinicId,
        doctorId: session.userId,
        species: body.species || 'dog',
        weight: body.weight || '',
        visitDate: body.visitDate || new Date().toISOString().split('T')[0],
        anamnesis: body.anamnesis || {},
        examination: body.examination || {},
        auscultation: body.auscultation || {},
        scans: body.scans || [],
        results: body.results || {},
        aiResult: body.aiResult || null,
        aiGeneratedAt: body.aiGeneratedAt || null,
        visitStartedAt: body.visitStartedAt || null,
        visitEndedAt: body.visitEndedAt || null,
        visitDurationMs: body.visitDurationMs || 0,
        visitSummary: body.visitSummary || '',
      },
    })

    return NextResponse.json({ success: true, id: visit.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT — обновить визит
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...data } = body

    // Проверяем что визит принадлежит клинике
    const existing = await prisma.visit.findFirst({
      where: { id, clinicId: session.clinicId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Визит не найден' }, { status: 404 })
    }

    const visit = await prisma.visit.update({
      where: { id },
      data: {
        species: data.species,
        weight: data.weight,
        visitDate: data.visitDate,
        anamnesis: data.anamnesis,
        examination: data.examination,
        auscultation: data.auscultation,
        scans: data.scans,
        results: data.results,
        aiResult: data.aiResult,
        aiGeneratedAt: data.aiGeneratedAt,
        visitStartedAt: data.visitStartedAt,
        visitEndedAt: data.visitEndedAt,
        visitDurationMs: data.visitDurationMs,
        visitSummary: data.visitSummary,
      },
    })

    return NextResponse.json({ success: true, id: visit.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — удалить визит
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID визита не указан' }, { status: 400 })
    }

    // Проверяем что визит принадлежит клинике
    const existing = await prisma.visit.findFirst({
      where: { id, clinicId: session.clinicId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Визит не найден' }, { status: 404 })
    }

    await prisma.visit.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
