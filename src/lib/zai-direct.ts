/**
 * Прямые вызовы Z.AI через Cloudflare Worker прокси (CORS + обход блокировки РФ).
 * Worker URL: https://ushi-zai-proxy.sotem-post.workers.dev
 *
 * ВАЖНО:
 * - Worker поддерживает glm-4.5v (vision) и glm-4.5-air (текст). Подтверждено тестами.
 * - Cloudflare Workers free tier: тело запроса до ~100 KB. Большие изображения
 *   ресайзятся на клиенте через canvas (max 1600px, JPEG quality 0.85) —
 *   это даёт ~50-150 KB base64, что спокойно проходит через Worker.
 * - CORS настроен корректно (access-control-allow-origin: *).
 */

const WORKER_URL = 'https://ushi-zai-proxy.sotem-post.workers.dev'

// Максимальный размер стороны изображения после ресайза.
// 1600px достаточно для читаемости ветеринарных анализов и держит base64 < 100 KB.
const MAX_IMAGE_DIM = 1600
const JPEG_QUALITY = 0.85

/**
 * Ресайз изображения через canvas.
 * Принимает data URL (любой формат: JPEG/PNG/WebP/GIF), отдаёт JPEG data URL.
 * Если изображение уже маленькое — только перекодируем в JPEG (унификация).
 */
async function resizeImageToJpegDataUrl(dataUrl: string): Promise<{ dataUrl: string; bytes: number; resized: boolean }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width
        const origH = img.naturalHeight || img.height
        const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(origW, origH))
        const targetW = Math.max(1, Math.round(origW * scale))
        const targetH = Math.max(1, Math.round(origH * scale))
        const resized = scale < 1

        const canvas = document.createElement('canvas')
        canvas.width = targetW
        canvas.height = targetH
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D context недоступен'))
          return
        }
        // white background for transparent PNGs
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, targetW, targetH)
        ctx.drawImage(img, 0, 0, targetW, targetH)

        const jpegDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        // data URL формат: data:image/jpeg;base64,XXXX
        const base64 = jpegDataUrl.split(',')[1] || ''
        // base64 → bytes: примерно 3/4 от длины
        const bytes = Math.floor(base64.length * 3 / 4)
        resolve({ dataUrl: jpegDataUrl, bytes, resized })
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Ошибка canvas'))
      }
    }
    img.onerror = () => reject(new Error('Не удалось загрузить изображение в Image() — возможно, неверный формат или data URL повреждён'))
    img.src = dataUrl
  })
}

/**
 * Извлечь имя файла из data URL (если оно там закодировано).
 */
function guessFileName(dataUrl: string, fallback?: string): string {
  if (fallback) return fallback
  // Иногда data URL содержит name=...
  const m = dataUrl.match(/name=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : 'image'
}

/**
 * Извлечь MIME из data URL.
 */
function getMimeFromDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;,]+)/)
  return m ? m[1] : 'image/jpeg'
}

export async function generateResultsDirect(data: {
  patient: any
  anamnesis: Record<string, string>
  examination: any[]
  auscultation: any
  scanTexts: string[]
  voiceNotes: string[]
}): Promise<string> {
  const { patient, anamnesis, examination, auscultation, scanTexts, voiceNotes } = data

  const deviations = examination.filter((e) => e.status === 'deviation')
  const deviationsSummary = deviations
    .map((d) => `- ${d.system} / ${d.param}: ${d.deviationValue || 'отклонение'}${d.notes ? ` (примечание: ${d.notes})` : ''}`)
    .join('\n')

  const anamnesisSummary = Object.entries(anamnesis)
    .filter(([, v]) => v && v.trim().length > 0)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')

  const scanSummary = scanTexts.filter((t) => t && t.trim()).join('\n\n---\n\n')
  const voiceNotesSummary = (voiceNotes || [])
    .filter((n) => n && n.trim().length > 0)
    .map((n, i) => `- Заметка ${i + 1}: ${n}`)
    .join('\n')

  const prompt = `Ты — ветеринарный врач-эксперт с многолетним опытом. На основе представленных данных пациента составь:
1. ПРЕДВАРИТЕЛЬНЫЕ ДИФФЕРЕНЦИАЛЬНЫЕ ДИАГНОЗЫ (3-7 диагнозов, ранжированные по вероятности, с кратким обоснованием)
2. ПЛАНОВЫЕ ОБСЛЕДОВАНИЯ
3. РЕКОМЕНДАЦИИ ПО ОБЯЗАТЕЛЬНОЙ ЛАБОРАТОРНОЙ И ИНСТРУМЕНТАЛЬНОЙ ДИАГНОСТИКЕ
4. ДОПОЛНИТЕЛЬНАЯ ВИЗУАЛИЗАЦИОННАЯ ДИАГНОСТИКА
5. ПРЕДВАРИТЕЛЬНЫЕ НАЗНАЧЕНИЯ (терапия) с дозировкой по весу
6. РЕКОМЕНДАЦИИ ПО СИМПТОМАТИЧЕСКОЙ ТЕРАПИИ

Пациент:
- Вид: ${patient.species === 'dog' ? 'Собака' : patient.species === 'cat' ? 'Кошка' : 'Другое'}
- Вес: ${patient.weight || '—'} кг
- Дата приёма: ${patient.visitDate || '—'}

АНАМНЕЗ:
${anamnesisSummary || 'нет данных'}

ОСМОТР — ОТКЛОНЕНИЯ:
${deviationsSummary || 'отклонений не выявлено'}

АУСКУЛЬТАЦИЯ СЕРДЦА:
- Ритм: ${auscultation.rhythm || 'не зафиксирован'}
- ЧСС: ${auscultation.bpm || '—'}
- Шумы: ${auscultation.murmurs || 'нет'}

РЕЗУЛЬТАТЫ ИССЛЕДОВАНИЙ:
${scanSummary || 'нет загруженных исследований'}

ГОЛОСОВЫЕ ЗАМЕТКИ ВРАЧА ПРИ ОСМОТРЕ:
${voiceNotesSummary || 'нет голосовых заметок'}

ОТВЕТ ДАЙ В СТРУКТУРИРОВАННОМ ВИДЕ С РАЗДЕЛАМИ:
### Дифференциальные диагнозы
### План обследований
### Обязательная лабораторная и инструментальная диагностика
### Дополнительная визуализационная диагностика
### Предварительные назначения (терапия)
### Предупреждения о взаимодействиях
### Рекомендации

Для назначений укажи: название, дозировка мг/кг × вес = доза, частота, путь введения, показание, противопоказания.
Учитывай вид пациента (${patient.species === 'cat' ? 'Кошка: метаболизм отличается, парацетамол/карпрофен нельзя' : 'Собака'}).`

  let response: Response
  try {
    response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'glm-4.5-air',
        messages: [
          { role: 'system', content: 'Ты ветеринарный эксперт-консультант. Отвечаешь на русском языке, в медицинском стиле.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      }),
    })
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    throw new Error(`Сеть недоступна (Worker): ${err.message}. Проверьте интернет-соединение.`)
  }

  if (!response.ok) {
    let errorText = ''
    try { errorText = await response.text() } catch {}
    throw new Error(`Ошибка AI (HTTP ${response.status}). ${errorText.slice(0, 200)}`)
  }

  let result: any
  try {
    result = await response.json()
  } catch (e) {
    throw new Error('Некорректный JSON-ответ от Worker. Возможно, прокси временно недоступен.')
  }

  const content = result?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('AI вернул пустой ответ. Попробуйте ещё раз.')
  }
  return content
}

export async function ocrImageDirect(imageDataUrl: string, fileName?: string): Promise<string> {
  const originalMime = getMimeFromDataUrl(imageDataUrl)

  let finalDataUrl = imageDataUrl
  let sizeInfo = ''

  // Если изображение — сначала ресайзим через canvas.
  // Это унифицирует формат в JPEG и сжимает до < 100 KB base64 (лимит Cloudflare Worker free).
  // Также решает проблему с WebP/GIF/BMP, которые Worker может не принять.
  if (originalMime.startsWith('image/') && typeof document !== 'undefined') {
    try {
      const { dataUrl: resizedUrl, bytes, resized } = await resizeImageToJpegDataUrl(imageDataUrl)
      finalDataUrl = resizedUrl
      sizeInfo = resized
        ? ` (ресайз до ≤${MAX_IMAGE_DIM}px, ${Math.round(bytes / 1024)} KB)`
        : ` (перекодировано в JPEG, ${Math.round(bytes / 1024)} KB)`

      // Если после ресайза всё ещё > ~250 KB — это подозрительно, но пробуем
      if (bytes > 500_000) {
        console.warn(`[OCR] Изображение слишком большое даже после ресайза: ${Math.round(bytes / 1024)} KB. Worker может отклонить.`)
      }
    } catch (e) {
      // Если canvas не справился — пробуем отправить как есть, но предупреждаем
      console.warn('[OCR] Canvas-ресайз не удался, отправляю оригинал:', e)
    }
  }

  const prompt = `Ты — ветеринарный помощник. Перед тобой скан ветеринарного исследования.
Извлеки и структурируй ВЕСЬ текст с изображения, сохраняя:
1. Название исследования / заголовок
2. Дату исследования
3. Все показатели и их значения (с единицами измерения)
4. Референсные значения (если есть)
5. Заключение / интерпретацию
6. Подпись врача / печать

Название файла: ${guessFileName(imageDataUrl, fileName)}`

  let response: Response
  try {
    response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'glm-4.5v',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: finalDataUrl } },
            ],
          },
        ],
        thinking: { type: 'disabled' },
      }),
    })
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    throw new Error(`Сеть недоступна (Worker): ${err.message}. Проверьте интернет-соединение.`)
  }

  if (!response.ok) {
    let errorText = ''
    try { errorText = await response.text() } catch {}
    // 1010 — Cloudflare bot-fight, 403 — firewall, 413 — payload too large
    if (response.status === 413) {
      throw new Error(`Файл слишком большой даже после сжатия${sizeInfo}. Сделайте скриншот меньшего размера.`)
    }
    if (response.status === 403) {
      throw new Error(`Доступ к AI-прокси запрещён (403). Попробуйте через 1-2 минуты.`)
    }
    throw new Error(`Ошибка OCR (HTTP ${response.status}). ${errorText.slice(0, 200)}`)
  }

  let result: any
  try {
    result = await response.json()
  } catch (e) {
    throw new Error('Некорректный JSON-ответ от Worker. Возможно, прокси временно недоступен.')
  }

  const content = result?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('AI вернул пустой ответ. Попробуйте ещё раз.')
  }
  return content
}
