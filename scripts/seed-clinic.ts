// Provisioning новой клиники + админа по умолчанию.
//
// Запуск:
//   npx tsx scripts/seed-clinic.ts --slug default --name "ВетКлиника по умолчанию" --admin-username admin --admin-password admin
//
// Все параметры опциональны — дефолты ниже.
// Idempotent по slug: если клиника уже существует — обновляет name.
// Если admin уже существует — пропускает (если не передан --force-reset).

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function arg(name: string, fallback: string): string {
  const i = process.argv.findIndex((a) => a === `--${name}`)
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1]
  return fallback
}

async function main() {
  const slug = arg('slug', 'default').toLowerCase().trim()
  const name = arg('name', 'ВетКлиника по умолчанию')
  const adminUsername = arg('admin-username', 'admin').toLowerCase().trim()
  const adminPassword = arg('admin-password', 'admin')
  const adminDisplayName = arg('admin-display-name', 'Главный врач (admin)')

  console.log(`→ Создаём клинику: slug="${slug}", name="${name}"`)

  // Create or update clinic (idempotent by slug).
  const clinic = await prisma.clinic.upsert({
    where: { slug },
    update: { name },
    create: {
      slug,
      name,
      status: 'active',
      plan: 'free',
      visitLimit: 10,
    },
  })
  console.log(`  ✓ Клиника: id=${clinic.id}, slug=${clinic.slug}`)

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
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
