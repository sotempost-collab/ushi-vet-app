// Provisioning новой клиники + админа по умолчанию + миграция slug.
//
// Запуск:
//   npx tsx scripts/seed-clinic.ts --slug default --name "ВетКлиника по умолчанию" --admin-username admin --admin-password admin
//
// Все параметры опциональны — дефолты ниже.
// Idempotent по slug: если клиника уже существует — обновляет name.
// Если admin уже существует — пропускает (если не передан --force-reset).
//
// ВАЖНО: при первом запуске после обновления схемы (добавление slug), в БД могут быть
// клиники БЕЗ slug. Скрипт мигрирует их — сгенерирует slug из name.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function arg(name: string, fallback: string): string {
  const i = process.argv.findIndex((a) => a === `--${name}`)
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1]
  return fallback
}

// Транслитерация кириллицы → латиница для генерации slug из русских названий.
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya',
}

function slugify(name: string): string {
  let s = name
    .toLowerCase()
    .trim()
    .split('')
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
  s = s.replace(/[^a-z0-9\s-]/g, '') // оставляем только латиницу/цифры/пробелы/дефис
  s = s.replace(/[\s_]+/g, '-') // пробелы/подчёркивания → дефис
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '') // удаляем лишние дефисы
  return s || 'clinic'
}

// Мигрирует существующие клиники без slug — генерирует slug из name.
async function migrateMissingSlugs() {
  const clinicsWithoutSlug = await prisma.clinic.findMany({
    where: { slug: null },
    select: { id: true, name: true },
  })

  if (clinicsWithoutSlug.length === 0) {
    console.log('  → Все клиники уже имеют slug — миграция не нужна')
    return
  }

  console.log(`  → Найдено ${clinicsWithoutSlug.length} клиник без slug — мигрируем`)

  const usedSlugs = new Set<string>(
    (await prisma.clinic.findMany({
      where: { slug: { not: null } },
      select: { slug: true },
    })).map((c) => c.slug!).filter(Boolean),
  )

  for (const clinic of clinicsWithoutSlug) {
    let baseSlug = slugify(clinic.name)
    let slug = baseSlug
    let i = 2
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${i}`
      i++
    }
    usedSlugs.add(slug)
    await prisma.clinic.update({ where: { id: clinic.id }, data: { slug } })
    console.log(`    ✓ "${clinic.name}" → slug="${slug}"`)
  }
}

async function main() {
  // Сначала мигрируем существующие клиники без slug.
  console.log('→ Шаг 1: Миграция slug для существующих клиник')
  await migrateMissingSlugs()

  // Затем создаём/обновляем дефолтную клинику.
  const slug = arg('slug', 'default').toLowerCase().trim()
  const name = arg('name', 'ВетКлиника по умолчанию')
  const adminUsername = arg('admin-username', 'admin').toLowerCase().trim()
  const adminPassword = arg('admin-password', 'admin')
  const adminDisplayName = arg('admin-display-name', 'Главный врач (admin)')

  console.log('')
  console.log(`→ Шаг 2: Создаём/обновляем клинику: slug="${slug}", name="${name}"`)

  // Find by slug (после миграции slug уже есть у всех клиник).
  const existing = await prisma.clinic.findUnique({ where: { slug } })

  let clinic
  if (existing) {
    console.log(`  → Клиника "${slug}" уже существует — обновляем name`)
    clinic = await prisma.clinic.update({
      where: { slug },
      data: { name },
    })
  } else {
    clinic = await prisma.clinic.create({
      data: {
        slug,
        name,
        status: 'active',
        plan: 'free',
        visitLimit: 10,
      },
    })
    console.log(`  ✓ Создана клиника: id=${clinic.id}, slug=${clinic.slug}`)
  }

  // Create or update admin user inside the clinic.
  const existingAdmin = await prisma.clinicUser.findFirst({
    where: { clinicId: clinic.id, username: adminUsername },
  })

  if (existingAdmin) {
    console.log(`  → Админ "${adminUsername}" уже существует — пропускаем создание`)
    if (process.argv.includes('--force-reset')) {
      await prisma.clinicUser.update({
        where: { id: existingAdmin.id },
        data: { password: bcrypt.hashSync(adminPassword, 10) },
      })
      console.log(`  ✓ Пароль сброшен на "${adminPassword}"`)
    } else {
      console.log(
        `  → Чтобы сбросить пароль: npm run seed:clinic:custom -- --slug ${slug} --admin-username ${adminUsername} --admin-password <new> --force-reset`,
      )
    }
  } else {
    const admin = await prisma.clinicUser.create({
      data: {
        clinicId: clinic.id,
        username: adminUsername,
        password: bcrypt.hashSync(adminPassword, 10),
        displayName: adminDisplayName,
        role: 'admin',
      },
    })
    console.log(
      `  ✓ Админ: id=${admin.id}, username=${admin.username}, password=${adminPassword}`,
    )
  }

  console.log('')
  console.log('Готово. Вход:')
  console.log(`  Клиника: ${slug}`)
  console.log(`  Логин:   ${adminUsername}`)
  console.log(`  Пароль:  ${adminPassword}`)
  console.log('')
  console.log('Все клиники сейчас:')
  const allClinics = await prisma.clinic.findMany({
    select: { slug: true, name: true },
    orderBy: { name: 'asc' },
  })
  for (const c of allClinics) {
    console.log(`  - slug="${c.slug}" name="${c.name}"`)
  }
}

main()
  .catch((e) => {
    // Не падаем с ненулевым кодом — это позволило бы контейнеру стартовать
    // даже если seed временно недоступен (например, БД ещё поднимается).
    // Логируем ошибку, но выходим с 0.
    console.error('⚠️  Seed не выполнен (вероятно БД недоступна):')
    console.error('   ', e.message || e)
    console.error('   Приложение продолжит запуск — это не блокирующая ошибка.')
    process.exit(0)
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
  })
