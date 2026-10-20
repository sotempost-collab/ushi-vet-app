import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Введите логин и пароль' }, { status: 400 })
    }

    // Ищем пользователя
    const user = await prisma.clinicUser.findUnique({
      where: { username: username.toLowerCase().trim() },
      include: { clinic: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 401 })
    }

    // Проверяем пароль
    if (!bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }

    // Создаём сессию
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 дней

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        clinicId: user.clinicId,
        expiresAt,
      },
    })

    return NextResponse.json({
      success: true,
      token,
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
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Ошибка входа: ' + e.message }, { status: 500 })
  }
}
