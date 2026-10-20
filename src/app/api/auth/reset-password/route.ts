import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
const bcrypt = require('bcryptjs')

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const session = await prisma.session.findUnique({ where: { token } })
    if (!session || session.expiresAt < new Date()) return NextResponse.json({ error: 'Сессия истекла' }, { status: 401 })

    const admin = await prisma.clinicUser.findUnique({ where: { id: session.userId } })
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Только администратор может сбрасывать пароли' }, { status: 403 })
    }

    const { userId, newPassword } = await request.json()
    if (!userId || !newPassword) return NextResponse.json({ error: 'Укажите ID пользователя и новый пароль' }, { status: 400 })
    if (newPassword.length < 4) return NextResponse.json({ error: 'Пароль не короче 4 символов' }, { status: 400 })

    // Проверяем что пользователь из той же клиники
    const target = await prisma.clinicUser.findFirst({ where: { id: userId, clinicId: admin.clinicId } })
    if (!target) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })

    await prisma.clinicUser.update({
      where: { id: userId },
      data: { password: bcrypt.hashSync(newPassword, 10) },
    })
    return NextResponse.json({ success: true, message: 'Пароль изменён для ' + target.username })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
