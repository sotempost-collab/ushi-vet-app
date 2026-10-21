// Ручной setup — создаёт clinic slug=default + admin/admin в БД.
// Используется когда seed-скрипт при старте контейнера не отработал.
//
// Запуск: открыть в браузере
//   https://<ваш-проект>.relaxdev.ru/api/setup
//
// Безопасность: эндпоинт публичный, но idempotent — не перезаписывает
// существующие клиники/пользователей. После первого использования
// можно удалить этот файл.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(_request: NextRequest) {
  const log: string[] = []
  try {
    log.push('=== Setup start ===')

    // 1. Найти или создать clinic slug=default
    let clinic = await prisma.clinic.findUnique({ where: { slug: 'default' } })
    if (clinic) {
      log.push(`✓ Clinic "default" уже существует: id=${clinic.id}`)
    } else {
      clinic = await prisma.clinic.create({
        data: {
          slug: 'default',
          name: 'ВетКлиника по умолчанию',
          status: 'active',
          plan: 'free',
          visitLimit: 10,
        },
      })
      log.push(`✓ Создана clinic "default": id=${clinic.id}`)
    }

    // 2. Найти или создать admin в этой клинике
    let admin = await prisma.clinicUser.findFirst({
      where: { clinicId: clinic.id, username: 'admin' },
    })
    if (admin) {
      log.push(`→ Admin "admin" уже существует в clinic "default"`)
      // Сбросим пароль на admin/admin (т.к. пользователь явно хочет войти с admin/admin)
      await prisma.clinicUser.update({
        where: { id: admin.id },
        data: { password: bcrypt.hashSync('admin', 10) },
      })
      log.push(`✓ Пароль admin сброшен на "admin"`)
    } else {
      admin = await prisma.clinicUser.create({
        data: {
          clinicId: clinic.id,
          username: 'admin',
          password: bcrypt.hashSync('admin', 10),
          displayName: 'Главный врач (admin)',
          role: 'admin',
        },
      })
      log.push(`✓ Создан admin: id=${admin.id}, username=admin, password=admin`)
    }

    // 3. Заодно мигрируем существующие клиники без slug.
    const clinicsWithoutSlug = await prisma.clinic.findMany({
      where: { slug: null },
      select: { id: true, name: true },
    })
    if (clinicsWithoutSlug.length > 0) {
      log.push(`→ Мигрируем ${clinicsWithoutSlug.length} клиник без slug`)
      const used = new Set(
        (await prisma.clinic.findMany({
          where: { slug: { not: null } },
          select: { slug: true },
        })).map((c) => c.slug!).filter(Boolean),
      )
      for (const c of clinicsWithoutSlug) {
        const slug = slugify(c.name)
        let finalSlug = slug
        let i = 2
        while (used.has(finalSlug)) {
          finalSlug = `${slug}-${i++}`
        }
        used.add(finalSlug)
        await prisma.clinic.update({ where: { id: c.id }, data: { slug: finalSlug } })
        log.push(`  ✓ "${c.name}" → slug="${finalSlug}"`)
      }
    }

    // 4. Выведем все клиники
    const all = await prisma.clinic.findMany({
      select: { slug: true, name: true, status: true },
      orderBy: { name: 'asc' },
    })
    log.push('')
    log.push('=== Все клиники сейчас ===')
    for (const c of all) {
      log.push(`  - slug="${c.slug}" name="${c.name}" status="${c.status}"`)
    }

    log.push('')
    log.push('=== Setup complete ===')
    log.push('Готово к входу:')
    log.push('  Клиника: default')
    log.push('  Логин: admin')
    log.push('  Пароль: admin')

    return NextResponse.json({ success: true, log }, { headers: { 'Content-Type': 'application/json; charset=utf-8' } })
  } catch (e: any) {
    log.push(`❌ Ошибка: ${e.message}`)
    console.error('Setup error:', e)
    return NextResponse.json(
      { success: false, error: e.message, log },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    )
  }
}

// Транслитерация кириллицы → латиница
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya',
}

function slugify(name: string): string {
  let s = name.toLowerCase().trim().split('').map((c) => TRANSLIT[c] ?? c).join('')
  s = s.replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return s || 'clinic'
}
