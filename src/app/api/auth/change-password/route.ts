import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const session = await prisma.session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) return NextResponse.json({ error: 'Сессия истекла' }, { status: 401 })

    const { oldPassword, newPassword } = await request.json()
    if (!oldPassword || !newPassword) return NextResponse.json({ error: 'Укажите старый и новый пароль' }, { status: 400 })
    if (newPassword.length < 4) return NextResponse.json({ error: 'Новый пароль не короче 4 символов' }, { status: 400 })

    const user = await prisma.clinicUser.findUnique({ where: { id: session.userId } })
    if (!user) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

    if (!bcrypt.compareSync(oldPassword, user.password)) {
      return NextResponse.json({ error: 'Неверный старый пароль' }, { status: 401 })
    }

    await prisma.clinicUser.update({
      where: { id: user.id },
      data: { password: bcrypt.hashSync(newPassword, 10) },
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
