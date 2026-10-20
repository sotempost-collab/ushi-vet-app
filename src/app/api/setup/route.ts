import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    try {
      await prisma.clinic.count()
      return NextResponse.json({ success: true, message: 'Таблицы уже существуют' })
    } catch {}

    const sqlStatements = [
      `CREATE TABLE IF NOT EXISTS "Clinic" (id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT, phone TEXT, plan TEXT NOT NULL DEFAULT 'free', "visitLimit" INTEGER NOT NULL DEFAULT 10, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS "ClinicUser" (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL, "displayName" TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'vet', "clinicId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ClinicUser_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS "Visit" (id TEXT PRIMARY KEY, "clinicId" TEXT NOT NULL, "doctorId" TEXT NOT NULL, species TEXT NOT NULL DEFAULT 'dog', weight TEXT NOT NULL DEFAULT '', "visitDate" TEXT NOT NULL DEFAULT '', anamnesis JSONB NOT NULL DEFAULT '{}', examination JSONB NOT NULL DEFAULT '{}', auscultation JSONB NOT NULL DEFAULT '{}', scans JSONB NOT NULL DEFAULT '[]', results JSONB NOT NULL DEFAULT '{}', "aiResult" TEXT, "aiGeneratedAt" TEXT, "visitStartedAt" INTEGER, "visitEndedAt" INTEGER, "visitDurationMs" INTEGER NOT NULL DEFAULT 0, "visitSummary" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Visit_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"(id) ON DELETE CASCADE, CONSTRAINT "Visit_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "ClinicUser"(id));`,
      `CREATE TABLE IF NOT EXISTS "Session" (id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, "userId" TEXT NOT NULL, "clinicId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE INDEX IF NOT EXISTS "Visit_clinicId_idx" ON "Visit"("clinicId");`,
      `CREATE INDEX IF NOT EXISTS "Visit_doctorId_idx" ON "Visit"("doctorId");`,
      `CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"(token);`,
    ]

    for (const sql of sqlStatements) {
      await prisma.$executeRawUnsafe(sql)
    }

    return NextResponse.json({ success: true, message: 'Таблицы созданы!' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    await prisma.clinic.count()
    return NextResponse.json({ success: true, message: 'Таблицы существуют' })
  } catch (e: any) {
    return NextResponse.json({ error: 'Таблицы не созданы. POST /api/setup', details: e.message }, { status: 500 })
  }
}
