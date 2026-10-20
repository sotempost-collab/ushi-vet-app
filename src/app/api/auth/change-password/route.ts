// Смена своего пароля.
// POST /api/auth/change-password
// body: { oldPassword, newPassword }

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const ctx = await requireAuth(request)
  if (ctx instanceof NextResponse) return ctx

  try {
    const { oldPassword, newPassword } = await request.json()
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Укажите старый и новый пароль' }, { status: 400 })
    }
    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Новый пароль не короче 4 символов' }, { status: 400 })
    }

    const user = await prisma.clinicUser.findUnique({
      where: { id: ctx.user.id },
      select: { password: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    if (!bcrypt.compareSync(oldPassword, user.password)) {
      return NextResponse.json({ error: 'Неверный старый пароль' }, { status: 401 })
    }

    await prisma.clinicUser.update({
      where: { id: ctx.user.id },
      data: { password: bcrypt.hashSync(newPassword, 10) },
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
