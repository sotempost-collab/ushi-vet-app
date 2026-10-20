// Управление пользователями клиники.
// Все операции — в пределах текущей клиники (clinicId из сессии).
// Логин уникален только внутри клиники (@@unique([clinicId, username])).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { requireAdmin } from '@/lib/auth'

// Список пользователей клиники.
export async function GET(request: NextRequest) {
  const ctx = await requireAdmin(request)
  if (ctx instanceof NextResponse) return ctx

  try {
    const users = await prisma.clinicUser.findMany({
      where: { clinicId: ctx.clinic.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ users })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Создать пользователя в текущей клинике.
export async function POST(request: NextRequest) {
  const ctx = await requireAdmin(request)
  if (ctx instanceof NextResponse) return ctx

  try {
    const { username, password, displayName, role } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Логин и пароль обязательны' }, { status: 400 })
    }
    if (password.length < 4) {
      return NextResponse.json({ error: 'Пароль не короче 4 символов' }, { status: 400 })
    }

    const normalizedUsername = username.toLowerCase().trim()

    // Логин уникален только ВНУТРИ клиники.
    const existing = await prisma.clinicUser.findFirst({
      where: { clinicId: ctx.clinic.id, username: normalizedUsername },
    })
    if (existing) {
      return NextResponse.json({ error: 'Логин уже занят в этой клинике' }, { status: 409 })
    }

    const user = await prisma.clinicUser.create({
      data: {
        clinicId: ctx.clinic.id,
        username: normalizedUsername,
        password: bcrypt.hashSync(password, 10),
        displayName: displayName?.trim() || normalizedUsername,
        role: role === 'admin' ? 'admin' : 'vet',
      },
      select: { id: true, username: true, displayName: true, role: true },
    })
    return NextResponse.json({ success: true, user })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Удалить пользователя из текущей клиники.
export async function DELETE(request: NextRequest) {
  const ctx = await requireAdmin(request)
  if (ctx instanceof NextResponse) return ctx

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')
    if (!userId || userId === ctx.user.id) {
      return NextResponse.json({ error: 'Нельзя удалить себя' }, { status: 400 })
    }

    const target = await prisma.clinicUser.findFirst({
      where: { id: userId, clinicId: ctx.clinic.id },
    })
    if (!target) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    await prisma.clinicUser.delete({ where: { id: userId } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
