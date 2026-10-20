// Сброс пароля другого пользователя (только админ).
// POST /api/auth/reset-password
// body: { userId, newPassword }

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const ctx = await requireAdmin(request)
  if (ctx instanceof NextResponse) return ctx

  try {
    const { userId, newPassword } = await request.json()
    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Укажите ID пользователя и новый пароль' }, { status: 400 })
    }
    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Пароль не короче 4 символов' }, { status: 400 })
    }

    // Сбрасываем только пользователя из текущей клиники.
    const target = await prisma.clinicUser.findFirst({
      where: { id: userId, clinicId: ctx.clinic.id },
    })
    if (!target) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    await prisma.clinicUser.update({
      where: { id: userId },
      data: { password: bcrypt.hashSync(newPassword, 10) },
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
