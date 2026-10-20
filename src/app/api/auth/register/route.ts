// Публичная регистрация новой клиники + admin.
// POST /api/auth/register
// body: { clinicSlug, clinicName, address?, phone?, adminUsername, adminPassword, adminDisplayName? }
// → 200 { success, clinicSlug, adminUsername }

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const {
      clinicSlug,
      clinicName,
      address,
      phone,
      adminUsername,
      adminPassword,
      adminDisplayName,
    } = await request.json()

    if (!clinicSlug || !clinicName || !adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: 'Укажите slug клиники, название, логин и пароль админа' },
        { status: 400 },
      )
    }
    if (adminPassword.length < 4) {
      return NextResponse.json(
        { error: 'Пароль не короче 4 символов' },
        { status: 400 },
      )
    }

    const slug = clinicSlug.toLowerCase().trim()
    const username = adminUsername.toLowerCase().trim()

    // slug должен быть уникальным
    const existingClinic = await prisma.clinic.findUnique({ where: { slug } })
    if (existingClinic) {
      return NextResponse.json(
        { error: 'Клиника с таким slug уже существует' },
        { status: 409 },
      )
    }

    // Создаём клинику + admin одной транзакцией
    const clinic = await prisma.clinic.create({
      data: {
        slug,
        name: clinicName,
        address: address || null,
        phone: phone || null,
        plan: 'free',
        visitLimit: 10,
        status: 'active',
        users: {
          create: {
            username,
            password: bcrypt.hashSync(adminPassword, 10),
            displayName: adminDisplayName || username,
            role: 'admin',
          },
        },
      },
      include: { users: true },
    })

    return NextResponse.json({
      success: true,
      clinicSlug: clinic.slug,
      adminUsername: clinic.users[0].username,
    })
  } catch (e: any) {
    console.error('Register error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
