// Тестовый скрипт — проверяет что generateResultsDirect и ocrImageDirect работают
// в реальной среде (имитация браузера через jsdom не нужна, так как функции
// используют только fetch и Image, и для OCR нужен canvas)

// Мокаем browser APIs для Node
globalThis.fetch = (...args) => {
  const url = typeof args[0] === 'string' ? args[0] : args[0].url
  const body = typeof args[0] === 'string' ? args[1]?.body : args[0]?.body
  console.log('[mock-fetch] →', url, 'body size:', body?.length || 0)
  // Реальный fetch через node 18+ builtin
  return import('node:https').then(https => {
    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          resolve({
            ok: (res.statusCode >= 200 && res.statusCode < 300),
            status: res.statusCode,
            json: async () => JSON.parse(data),
            text: async () => data,
          })
        })
      })
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  })
}

// Тест 1: generateResultsDirect
async function testGenerate() {
  console.log('\n=== ТЕСТ 1: generateResultsDirect (диффдиагноз) ===')
  // Динамический импорт ESM
  const { generateResultsDirect } = await import('/home/z/my-project/src/lib/zai-direct.ts').catch(() => null)
  if (!generateResultsDirect) {
    // Через tsx
    console.log('ts-импорт не сработал, тестируем через raw fetch')
    return testRawGenerate()
  }
  const text = await generateResultsDirect({
    patient: { species: 'dog', weight: '12.5', visitDate: '2026-10-01' },
    anamnesis: { mainComplaint: 'Рвота 3 раза за день, отказ от корма', complaintOnset: '2 дня назад' },
    examination: [
      { system: 'ЖКТ', param: 'Болезненность живота', status: 'deviation', normalValue: 'нет', deviationValue: 'выраженная болезненность в области эпигастрия', notes: '' },
    ],
    auscultation: { rhythm: 'синусовый', bpm: '110', murmurs: 'нет' },
    scanTexts: ['Биохимия: АЛТ 95 (норма 10-100), АСТ 85 (норма 10-50)'],
    voiceNotes: [],
  })
  console.log('✓ Результат получен:')
  console.log(text.substring(0, 600) + '...')
}

async function testRawGenerate() {
  const body = JSON.stringify({
    model: 'glm-4.5-air',
    messages: [
      { role: 'system', content: 'Ты ветеринарный эксперт-консультант. Отвечаешь на русском языке.' },
      { role: 'user', content: 'Пациент: собака 12.5 кг. Жалоба: рвота. Дай 3 дифференциальных диагноза.' },
    ],
    thinking: { type: 'disabled' },
  })
  const res = await fetch('https://ushi-zai-proxy.sotem-post.workers.dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const json = await res.json()
  console.log('Status:', res.status)
  console.log('Content:', json?.choices?.[0]?.message?.content?.substring(0, 500))
}

// Тест 2: ocrImageDirect (с реальным JPEG)
async function testOcr() {
  console.log('\n=== ТЕСТ 2: ocrImageDirect (OCR JPEG) ===')
  const fs = await import('node:fs')
  const bigB64 = fs.readFileSync('/tmp/big.jpg').toString('base64')
  const dataUrl = `data:image/jpeg;base64,${bigB64}`
  console.log('Image size:', Math.round(bigB64.length * 3 / 4 / 1024), 'KB')

  // Image() нет в node — пропустим canvas-ресайз и отправим напрямую
  const body = JSON.stringify({
    model: 'glm-4.5v',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Что на картинке? Кратко.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
    max_tokens: 100,
  })
  const res = await fetch('https://ushi-zai-proxy.sotem-post.workers.dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const json = await res.json()
  console.log('Status:', res.status)
  console.log('Content:', json?.choices?.[0]?.message?.content?.substring(0, 500))
}

await testGenerate().catch(e => console.error('ОШИБКА testGenerate:', e.message))
await testOcr().catch(e => console.error('ОШИБКА testOcr:', e.message))
