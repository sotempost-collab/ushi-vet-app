const ANYMODEL_API_URL = 'https://anymodel.org/v1/chat/completions'
const ANYMODEL_API_KEY = 'sk-dc9d4b7df36ba555-i2dh6j-2ec5b5b2'

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }
    try {
      const body = await request.text()
      const response = await fetch(ANYMODEL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANYMODEL_API_KEY,
        },
        body: body,
      })
      const result = await response.text()
      return new Response(result, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
  },
}
