/**
 * Cloudflare Worker — прокси для Polza.ai API
 * 
 * Ключ хранится ВНУТРИ Worker кода (на сервере Cloudflare).
 * Браузер делает запрос к Worker → Worker добавляет ключ → отправляет в Polza.ai.
 * В клиентском bundle ключа НЕТ — только URL Worker'а.
 * 
 * Деплой:
 * 1. Зарегистрируйтесь на https://dash.cloudflare.com (бесплатно)
 * 2. Workers & Pages → Create Worker
 * 3. Вставьте этот код
 * 4. Замените POLZA_API_KEY на свой ключ
 * 5. Deploy → получите URL вида https://your-name.your-subdomain.workers.dev
 */

const POLZA_API_URL = 'https://api.polza.ai/api/v1/chat/completions'
const POLZA_API_KEY = 'pza_MrBJA4y-AXOtKYPtE7KkQAgULygUsYjD' // ← ЗАМЕНИТЕ НА СВОЙ КЛЮЧ

export default {
  async fetch(request) {
    // Handle CORS preflight
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

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    try {
      // Get the request body from browser
      const body = await request.text()
      
      // Forward to Polza.ai with API key
      const response = await fetch(POLZA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${POLZA_API_KEY}`,
        },
        body: body,
      })

      // Return response with CORS headers
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
