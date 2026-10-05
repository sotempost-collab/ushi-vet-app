import { NextRequest, NextResponse } from 'next/server'

const POLZA_API_URL = 'https://api.polza.ai/api/v1/chat/completions'
const POLZA_API_KEY = 'pza_MrBJA4y-AXOtKYPtE7KkQAgULygUsYjD'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const response = await fetch(POLZA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${POLZA_API_KEY}`,
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
