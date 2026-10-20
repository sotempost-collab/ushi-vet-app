// Helper для извлечения сессии из Authorization-заголовка.
// Используется во всех API-роутах, требующих авторизацию.
//
// Все запросы внутри клиники идут через prisma с where: { clinicId: ctx.clinic.id }.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface AuthContext {
  session: { id: string; token: string; expiresAt: Date }
  user: {
    id: string
    clinicId: string
    username: string
    displayName: string
    role: string
  }
  clinic: {
    id: string
    slug: string
    name: string
    status: string
  }
}

export async function getAuthContext(
  request: NextRequest,
): Promise<AuthContext | null> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: { id: true, clinicId: true, username: true, displayName: true, role: true },
      },
      clinic: { select: { id: true, slug: true, name: true, status: true } },
    },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  if (session.clinic.status !== 'active') return null

  return {
    session: { id: session.id, token: session.token, expiresAt: session.expiresAt },
    user: session.user,
    clinic: session.clinic,
  }
}

export async function requireAuth(
  request: NextRequest,
): Promise<AuthContext | NextResponse> {
  const ctx = await getAuthContext(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }
  return ctx
}

export async function requireAdmin(
  request: NextRequest,
): Promise<AuthContext | NextResponse> {
  const ctx = await requireAuth(request)
  if (ctx instanceof NextResponse) return ctx
  if (ctx.user.role !== 'admin') {
    return NextResponse.json({ error: 'Только администратор' }, { status: 403 })
  }
  return ctx
}
