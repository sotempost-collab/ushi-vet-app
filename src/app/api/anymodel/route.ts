import { NextRequest, NextResponse } from 'next/server'

const ANYMODEL_API_URL = 'https://anymodel.org/v1/chat/completions'
// 🔑 Ключ из переменной окружения (задаётся на relaxdev в «Переменные окружения»)
const ANYMODEL_API_KEY = process.env.ANYMODEL_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const response = await fetch(ANYMODEL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANYMODEL_API_KEY}`,
      },
      body: body,
    })
    const result = await response.text()
    return new NextResponse(result, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
