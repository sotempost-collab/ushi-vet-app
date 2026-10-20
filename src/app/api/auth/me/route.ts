// Проверка текущей сессии — возвращает user + clinic (с slug).
// GET /api/auth/me
// Headers: Authorization: Bearer <token>

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
    if (!token) {
      return NextResponse.json({ success: false, error: 'Нет токена' }, { status: 401 })
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: { select: { id: true, username: true, displayName: true, role: true, clinicId: true } },
        clinic: { select: { id: true, slug: true, name: true, status: true, plan: true, visitLimit: true } },
      },
    })

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Сессия истекла' }, { status: 401 })
    }
    if (session.clinic.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Клиника заблокирована' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      user: session.user,
      clinic: session.clinic,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
