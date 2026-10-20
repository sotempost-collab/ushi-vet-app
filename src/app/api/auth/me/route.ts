import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, error: 'Нет токена' }, { status: 401 })
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {},
    })

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Сессия истекла' }, { status: 401 })
    }

    const user = await prisma.clinicUser.findUnique({
      where: { id: session.userId },
      include: { clinic: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
      clinic: {
        id: user.clinic.id,
        name: user.clinic.name,
        plan: user.clinic.plan,
        visitLimit: user.clinic.visitLimit,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
