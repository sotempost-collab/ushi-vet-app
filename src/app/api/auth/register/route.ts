import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { clinicName, address, phone, adminUsername, adminPassword, adminDisplayName } = await request.json()

    if (!clinicName || !adminUsername || !adminPassword) {
      return NextResponse.json({ error: 'Заполните название клиники, логин и пароль администратора' }, { status: 400 })
    }

    // Проверка — не занят ли логин
    const existing = await prisma.clinicUser.findUnique({ where: { username: adminUsername.toLowerCase().trim() } })
    if (existing) {
      return NextResponse.json({ error: 'Логин уже занят' }, { status: 409 })
    }

    // Создаём клинику
    const clinic = await prisma.clinic.create({
      data: {
        name: clinicName,
        address: address || null,
        phone: phone || null,
        plan: 'free',
        visitLimit: 10,
        users: {
          create: {
            username: adminUsername.toLowerCase().trim(),
            password: bcrypt.hashSync(adminPassword, 10),
            displayName: adminDisplayName || adminUsername,
            role: 'admin',
          },
        },
      },
      include: { users: true },
    })

    return NextResponse.json({
      success: true,
      clinicId: clinic.id,
      message: 'Клиника зарегистрирована. Войдите с вашими данными.'
    })
  } catch (e: any) {
    console.error('Register error:', e)
    return NextResponse.json({ error: 'Ошибка регистрации: ' + e.message }, { status: 500 })
  }
}
