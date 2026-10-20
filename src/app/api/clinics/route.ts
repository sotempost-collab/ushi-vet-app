// Публичный список клиник — для дропдауна формы входа.
// Возвращает только активные клиники {slug, name}. Без чувствительных данных.
// GET /api/clinics → { clinics: [{ slug, name }] }

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const clinics = await prisma.clinic.findMany({
      where: { status: 'active' },
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ clinics })
  } catch (e: any) {
    console.error('List clinics error:', e)
    return NextResponse.json({ clinics: [] })
  }
}
