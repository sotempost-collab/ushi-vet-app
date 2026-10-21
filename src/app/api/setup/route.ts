// Ручной setup — накатывает схему БД + создаёт clinic slug=default + admin/admin.
// Используется когда prisma db push при старте контейнера не отработал.
//
// Запуск: открыть в браузере
//   https://<ваш-проект>.relaxdev.ru/api/setup
//
// Что делает (idempotent):
// 1. ALTER TABLE — добавляет недостающие колонки (slug, status, dbUrl, updatedAt)
// 2. Создаёт индексы и composite unique [clinicId, username]
// 3. Создаёт clinic slug=default + admin/admin (если нет)
// 4. Сбрасывает пароль admin на 'admin' (если админ есть, но пароль неизвестен)
// 5. Возвращает JSON { success, log } с подробным логом

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(_request: NextRequest) {
  const log: string[] = []
  try {
    log.push('=== Setup start ===')

    // ── Шаг 1: накатываем схему через raw SQL (idempotent) ──────────────
    log.push('')
    log.push('→ Шаг 1: Проверка и накат схемы БД')

    await execSQL(log, `ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "slug" TEXT`)
    await execSQL(log, `ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active'`)
    await execSQL(log, `ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "dbUrl" TEXT`)
    await execSQL(log, `ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`)
    await execSQL(log, `CREATE UNIQUE INDEX IF NOT EXISTS "Clinic_slug_key" ON "Clinic"("slug")`)

    await execSQL(log, `ALTER TABLE "ClinicUser" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`)

    // Composite unique [clinicId, username] — нужно удалить старый глобальный
    // unique constraint на username, если он есть, и создать составной.
    try {
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "ClinicUser_username_key"`)
      log.push(`  ✓ Удалён старый индекс ClinicUser_username_key (если был)`)
    } catch (e: any) {
      log.push(`  → Пропуск: ${e.message}`)
    }
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "ClinicUser" DROP CONSTRAINT IF EXISTS "ClinicUser_username_key"`)
      log.push(`  ✓ Удалён старый constraint ClinicUser_username_key (если был)`)
    } catch (e: any) {
      log.push(`  → Пропуск: ${e.message}`)
    }
    await execSQL(log, `CREATE UNIQUE INDEX IF NOT EXISTS "ClinicUser_clinicId_username_key" ON "ClinicUser"("clinicId", "username")`)
    await execSQL(log, `CREATE INDEX IF NOT EXISTS "ClinicUser_clinicId_idx" ON "ClinicUser"("clinicId")`)

    await execSQL(log, `ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`)
    await execSQL(log, `CREATE INDEX IF NOT EXISTS "Session_clinicId_idx" ON "Session"("clinicId")`)

    // ── Шаг 2: миграция существующих клиник без slug ────────────────────
    log.push('')
    log.push('→ Шаг 2: Миграция slug для существующих клиник')
    const clinicsWithoutSlug = await prisma.clinic.findMany({
      where: { slug: null },
      select: { id: true, name: true },
    })
    if (clinicsWithoutSlug.length === 0) {
      log.push('  → Все клиники уже имеют slug')
    } else {
      const used = new Set(
        (await prisma.clinic.findMany({
          where: { slug: { not: null } },
          select: { slug: true },
        })).map((c) => c.slug!).filter(Boolean),
      )
      for (const c of clinicsWithoutSlug) {
        let slug = slugify(c.name)
        let i = 2
        while (used.has(slug)) slug = `${slugify(c.name)}-${i++}`
        used.add(slug)
        await prisma.clinic.update({ where: { id: c.id }, data: { slug } })
        log.push(`  ✓ "${c.name}" → slug="${slug}"`)
      }
    }

    // ── Шаг 3: создать или обновить clinic slug=default ────────────────
    log.push('')
    log.push('→ Шаг 3: Создание clinic slug=default')
    let clinic = await prisma.clinic.findUnique({ where: { slug: 'default' } })
    if (clinic) {
      log.push(`  ✓ Clinic "default" уже существует: id=${clinic.id}`)
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
      log.push(`  ✓ Создана clinic "default": id=${clinic.id}`)
    }

    // ── Шаг 4: создать admin/admin в этой клинике ───────────────────────
    log.push('')
    log.push('→ Шаг 4: Создание admin/admin в clinic "default"')
    let admin = await prisma.clinicUser.findFirst({
      where: { clinicId: clinic.id, username: 'admin' },
    })
    if (admin) {
      log.push(`  → Admin "admin" уже существует — сбрасываем пароль на "admin"`)
      await prisma.clinicUser.update({
        where: { id: admin.id },
        data: { password: bcrypt.hashSync('admin', 10) },
      })
      log.push(`  ✓ Пароль сброшен`)
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
      log.push(`  ✓ Создан admin: id=${admin.id}`)
    }

    // ── Шаг 5: вывести все клиники ──────────────────────────────────────
    log.push('')
    log.push('→ Шаг 5: Все клиники в БД сейчас')
    const all = await prisma.clinic.findMany({
      select: { slug: true, name: true, status: true },
      orderBy: { name: 'asc' },
    })
    for (const c of all) {
      log.push(`  - slug="${c.slug}" name="${c.name}" status="${c.status}"`)
    }

    log.push('')
    log.push('=== Setup complete ===')
    log.push('')
    log.push('✓ Готово к входу:')
    log.push('  Клиника: default')
    log.push('  Логин:   admin')
    log.push('  Пароль:  admin')

    return NextResponse.json(
      { success: true, log },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    )
  } catch (e: any) {
    log.push(`❌ Ошибка: ${e.message}`)
    console.error('Setup error:', e)
    return NextResponse.json(
      { success: false, error: e.message, log },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    )
  }
}

// Helper — выполняет SQL с защитой от ошибок (idempotent).
async function execSQL(log: string[], sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql)
    log.push(`  ✓ ${sql.substring(0, 80)}${sql.length > 80 ? '…' : ''}`)
  } catch (e: any) {
    // Если колонка уже существует — это OK (idempotent)
    if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
      log.push(`  → OK (уже существует): ${sql.substring(0, 60)}…`)
    } else {
      log.push(`  ⚠️ ${e.message}: ${sql.substring(0, 60)}…`)
    }
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
