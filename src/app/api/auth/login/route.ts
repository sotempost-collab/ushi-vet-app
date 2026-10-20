// Логин с указанием клиники.
// POST /api/auth/login
// body: { clinicSlug, username, password }
// → 200 { success, token, user, clinic }
// → 401 { error }

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { clinicSlug, username, password } = await request.json()

    if (!clinicSlug || !username || !password) {
      return NextResponse.json(
        { error: 'Укажите клинику, логин и пароль' },
        { status: 400 },
      )
    }

    // 1. Клиника по slug
    const clinic = await prisma.clinic.findUnique({
      where: { slug: clinicSlug.toLowerCase().trim() },
      select: { id: true, slug: true, name: true, status: true, plan: true, visitLimit: true },
    })
    if (!clinic) {
      return NextResponse.json({ error: 'Клиника не найдена' }, { status: 404 })
    }
    if (clinic.status !== 'active') {
      return NextResponse.json(
        { error: 'Клиника заблокирована. Обратитесь к администратору.' },
        { status: 403 },
      )
    }

    // 2. Пользователь ВНУТРИ клиники (логин уникален только в пределах клиники)
    const user = await prisma.clinicUser.findFirst({
      where: {
        clinicId: clinic.id,
        username: username.toLowerCase().trim(),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        password: true,
        clinicId: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }

    // 3. Пароль
    if (!bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }

    // 4. Сессия (opaque random token, 30 дней)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await prisma.session.create({
      data: { token, userId: user.id, clinicId: clinic.id, expiresAt },
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
        id: clinic.id,
        slug: clinic.slug,
        name: clinic.name,
        plan: clinic.plan,
        visitLimit: clinic.visitLimit,
      },
      expiresAt: expiresAt.toISOString(),
    })
  } catch (e: any) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
