import { NextRequest, NextResponse } from 'next/server'

const ANYMODEL_API_URL = 'https://anymodel.org/v1/chat/completions'
const ANYMODEL_API_KEY = 'sk-dc9d4b7df36ba555-i2dh6j-2ec5b5b2'

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
