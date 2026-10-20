import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function getSession(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token } })
  if (!session || session.expiresAt < new Date()) return null
  const user = await prisma.clinicUser.findUnique({ where: { id: session.userId } })
  if (!user) return null
  return { session, user }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getSession(request)
    if (!ctx) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    const users = await prisma.clinicUser.findMany({
      where: { clinicId: ctx.user.clinicId },
      select: { id: true, username: true, displayName: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ users })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getSession(request)
    if (!ctx) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    if (ctx.user.role !== 'admin') return NextResponse.json({ error: 'Только администратор' }, { status: 403 })
    const { username, password, displayName, role } = await request.json()
    if (!username || !password) return NextResponse.json({ error: 'Логин и пароль обязательны' }, { status: 400 })
    const existing = await prisma.clinicUser.findUnique({ where: { username: username.toLowerCase().trim() } })
    if (existing) return NextResponse.json({ error: 'Логин занят' }, { status: 409 })
    await prisma.clinicUser.create({
      data: { username: username.toLowerCase().trim(), password: bcrypt.hashSync(password, 10), displayName: displayName || username, role: role || 'vet', clinicId: ctx.user.clinicId },
    })
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getSession(request)
    if (!ctx) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    if (ctx.user.role !== 'admin') return NextResponse.json({ error: 'Только администратор' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')
    if (!userId || userId === ctx.user.id) return NextResponse.json({ error: 'Нельзя удалить' }, { status: 400 })
    await prisma.clinicUser.delete({ where: { id: userId } })
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
