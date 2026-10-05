/**
 * Polza.ai + AnyModel.org — источники AI.
 *
 * Приоритет:
 * 1. Polza.ai (https://api.polza.ai/api/v1) — БЫСТРЫЙ (3-5с), дешёвый
 *    - gpt-4o-mini для текста (дифдиагнозы) — 0.012 руб/запрос
 *    - google/gemini-2.5-flash для vision (OCR) — 3.4с, НЕ блокирует мед.документы
 * 2. AnyModel.org — fallback если Polza.ai недоступен
 *    - DeepSeek V4 Flash для текста — $0.05/1M
 *    - Gemini 3.7 Flash Medium для OCR — $0.6/1M
 *
 * 🔒 Ключи читаются из переменных окружения (process.env.NEXT_PUBLIC_*).
 *    Они НЕ хранятся в исходном коде — задаются на сервере (relaxdev).
 *    На GitHub Pages (без env) — пользователь вводит ключи через настройки ✨.
 */

const POLZA_API_URL = 'https://polza-proxy.sotem-post.workers.dev'
const ANYMODEL_API_URL = 'https://anymodel.org/v1/chat/completions'

// 🔑 Ключи из переменных окружения (задаются на relaxdev в «Переменные окружения»)
// NEXT_PUBLIC_ префикс нужен чтобы Next.js встроил их в клиентский bundle при сборке
// 🆕 Обработка заглушки relaxdev: если env не задан, relaxdev подставляет
// "auto-generated-stub-for-build" — отбрасываем такие значения
function cleanEnvKey(val: string | undefined): string {
  if (!val) return ''
  const trimmed = val.trim()
  // Заглушки от relaxdev и других PaaS
  if (trimmed === 'auto-generated-stub-for-build' || trimmed.startsWith('auto-generated')) return ''
  // Ключи обычно длиннее 10 символов
  if (trimmed.length < 10) return ''
  return trimmed
}

const DEFAULT_POLZA_API_KEY = ''  // ключ в Cloudflare Worker, не в коде
const DEFAULT_ANYMODEL_API_KEY = cleanEnvKey(process.env.NEXT_PUBLIC_ANYMODEL_API_KEY)

// 🎯 Модели
const POLZA_TEXT_MODEL = 'gpt-4o-mini'            // быстрый, дешёвый
const POLZA_VISION_MODEL = 'google/gemini-2.5-flash' // НЕ блокирует мед.документы, 3.4с
const ANYMODEL_TEXT_MODEL = 'ds/deepseek-v4-flash'
const ANYMODEL_VISION_MODEL = 'ag/gemini-3.7-flash-medium'

// ─────────────────────────────────────────────────────────────────────
// Утилиты
// ─────────────────────────────────────────────────────────────────────

function getMimeFromDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;,]+)/)
  return m ? m[1] : 'image/jpeg'
}

function guessFileName(dataUrl: string, fallback?: string): string {
  if (fallback) return fallback
  const m = dataUrl.match(/name=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : 'image'
}

function getAnyModelApiKey(): string {
  if (typeof window === 'undefined') return DEFAULT_ANYMODEL_API_KEY
  return localStorage.getItem('anymodel_api_key') || DEFAULT_ANYMODEL_API_KEY
}

function getPolzaApiKey(): string {
  if (typeof window === 'undefined') return DEFAULT_POLZA_API_KEY
  return localStorage.getItem('polza_api_key') || DEFAULT_POLZA_API_KEY
}

// 🆕 Проверка: есть ли рабочий ключ для сервиса
// 🆕 Polza через Worker — всегда доступен (ключ в Cloudflare Worker, не в коде)
const hasPolzaKey = (): boolean => true  // Worker всегда работает
const hasAnyModelKey = (): boolean => !!getAnyModelApiKey()

// ─────────────────────────────────────────────────────────────────────
// Canvas ресайз изображений (для OCR)
// ─────────────────────────────────────────────────────────────────────

const MAX_IMAGE_DIM = 1600
const JPEG_QUALITY = 0.85

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
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, targetW, targetH)
        ctx.drawImage(img, 0, 0, targetW, targetH)

        const jpegDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        const base64 = jpegDataUrl.split(',')[1] || ''
        const bytes = Math.floor(base64.length * 3 / 4)
        resolve({ dataUrl: jpegDataUrl, bytes, resized })
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Ошибка canvas'))
      }
    }
    img.onerror = () => reject(new Error('Не удалось загрузить изображение в Image()'))
    img.src = dataUrl
  })
}

// ─────────────────────────────────────────────────────────────────────
// Очередь запросов — чтобы не превышать лимит API
// ─────────────────────────────────────────────────────────────────────

let lastRequestTime = 0
const MIN_INTERVAL_MS = 1000  // минимум 1 секунда между запросами

async function waitForRateLimit() {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < MIN_INTERVAL_MS) {
    const wait = MIN_INTERVAL_MS - elapsed
    console.log(`[RateLimit] Ждём ${wait}мс...`)
    await new Promise((r) => setTimeout(r, wait))
  }
  lastRequestTime = Date.now()
}

// ─────────────────────────────────────────────────────────────────────
// Polza.ai API — ОСНОВНОЙ источник (быстрый, 3-5с)
// ─────────────────────────────────────────────────────────────────────

async function callPolza(
  model: string,
  messages: any[],
  options: { maxAttempts?: number; timeoutMs?: number } = {}
): Promise<string> {
  const { maxAttempts = 3, timeoutMs = 60000 } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      console.log(`[Polza] Попытка ${attempt}/${maxAttempts} → ${model}`)
      await waitForRateLimit()
      const response = await fetch(POLZA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 🆕 Authorization НЕ нужен — Cloudflare Worker добавляет ключ сам
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorText = ''
        try { errorText = await response.text() } catch {}

        if (response.status === 401) {
          throw new Error(`Неверный Polza.ai API ключ (401). ${errorText.slice(0, 200)}`)
        }

        if (response.status === 429) {
          const delays = [5000, 15000, 30000]
          const delay = delays[Math.min(attempt - 1, delays.length - 1)]
          console.warn(`[Polza] Rate limit (429) — ждём ${delay/1000}с...`)
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, delay))
            continue
          }
          throw new Error(`Polza.ai: лимит запросов (429). Подождите 1-2 минуты.`)
        }

        throw new Error(`Polza.ai HTTP ${response.status}. ${errorText.slice(0, 200)}`)
      }

      let result: any
      try {
        result = await response.json()
      } catch {
        throw new Error('Polza.ai вернул некорректный JSON.')
      }

      const content = result?.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('Polza.ai вернул пустой ответ.')
      }
      return content
    } catch (e: any) {
      clearTimeout(timeoutId)
      lastError = e
      console.warn(`[Polza] Попытка ${attempt} не удалась: ${e?.message}`)
      const isLast = attempt === maxAttempts
      if (e?.message?.includes('429')) {
        if (isLast) throw e
        continue
      }
      const isRetryable = (
        e?.name === 'AbortError' ||
        e?.message?.includes('Failed to fetch') ||
        e?.message?.includes('NetworkError') ||
        e?.message?.includes('Load failed') ||
        e?.message?.includes('The operation was aborted') ||
        e?.message?.includes('ERR_')
      )
      if (!isRetryable || isLast) throw e
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  throw lastError || new Error('Polza.ai: все попытки провалились')
}

// ─────────────────────────────────────────────────────────────────────
// AnyModel.org API — основной вызов
// ─────────────────────────────────────────────────────────────────────

async function callAnyModel(
  model: string,
  messages: any[],
  options: { maxAttempts?: number; timeoutMs?: number } = {}
): Promise<string> {
  const { maxAttempts = 3, timeoutMs = 120000 } = options  // 2 минуты timeout для vision
  const apiKey = getAnyModelApiKey()

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      console.log(`[AnyModel] Попытка ${attempt}/${maxAttempts} → ${model}`)
      await waitForRateLimit()
      const response = await fetch(ANYMODEL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 4000,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorText = ''
        try { errorText = await response.text() } catch {}

        if (response.status === 401) {
          throw new Error(`Неверный AnyModel API ключ (401). ${errorText.slice(0, 200)}`)
        }

        if (response.status === 429) {
          // 🆕 Расширенный backoff для 429: 10с, 30с, 60с, 90с
          const delays = [10000, 30000, 60000, 90000]
          const delay = delays[Math.min(attempt - 1, delays.length - 1)]
          console.warn(`[AnyModel] Rate limit (429) — попытка ${attempt}/${maxAttempts}, ждём ${delay/1000}с...`)
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, delay))
            continue
          }
          throw new Error(
            `AnyModel: превышен лимит запросов (429).\n\n` +
            `Что делать:\n` +
            `• Подождите 1-2 минуты — лимит сбросится\n` +
            `• Не отправляйте несколько запросов одновременно\n` +
            `• Используйте «Ручной ввод данных исследования» ниже`
          )
        }

        throw new Error(`AnyModel HTTP ${response.status}. ${errorText.slice(0, 200)}`)
      }

      let result: any
      try {
        result = await response.json()
      } catch {
        throw new Error('AnyModel вернул некорректный JSON.')
      }

      const content = result?.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('AnyModel вернул пустой ответ.')
      }
      return content
    } catch (e: any) {
      clearTimeout(timeoutId)
      lastError = e
      console.warn(`[AnyModel] Попытка ${attempt} не удалась: ${e?.message}`)
      const isLast = attempt === maxAttempts
      if (e?.message?.includes('429')) {
        if (isLast) throw e
        continue
      }
      const isRetryable = (
        e?.name === 'AbortError' ||
        e?.message?.includes('Failed to fetch') ||
        e?.message?.includes('NetworkError') ||
        e?.message?.includes('Load failed') ||
        e?.message?.includes('The operation was aborted') ||
        e?.message?.includes('ERR_')
      )
      if (!isRetryable || isLast) throw e
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  throw lastError || new Error('AnyModel: все попытки провалились')
}

// ─────────────────────────────────────────────────────────────────────
// Публичные функции
// ─────────────────────────────────────────────────────────────────────

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
ВАЖНО: каждый препарат указывай ТОЛЬКО ОДИН РАЗ — не дублируй препараты в списке назначений.
Учитывай вид пациента (${patient.species === 'cat' ? 'Кошка: метаболизм отличается, парацетамол/карпрофен нельзя' : 'Собака'}).`

  const messages = [
    { role: 'system', content: 'Ты ветеринарный эксперт-консультант. Отвечаешь на русском языке, в медицинском стиле.' },
    { role: 'user', content: prompt },
  ]

  // 1) Polza.ai — БЫСТРЫЙ (gpt-4o-mini, 3-5с) — только если есть ключ
  if (hasPolzaKey()) {
    console.log('[AI] Использую Polza.ai, модель:', POLZA_TEXT_MODEL)
    try {
      return await callPolza(POLZA_TEXT_MODEL, messages, { timeoutMs: 60000 })
    } catch (e: any) {
      console.warn('[AI] Polza.ai не сработал:', e.message, '— переключаюсь на AnyModel')
    }
  } else {
    console.log('[AI] Polza.ai: ключ не задан — использую AnyModel')
  }

  // 2) AnyModel — fallback (DeepSeek V4 Flash, ~50с) — только если есть ключ
  if (hasAnyModelKey()) {
    console.log('[AI] Использую AnyModel, модель:', ANYMODEL_TEXT_MODEL)
    try {
      return await callAnyModel(ANYMODEL_TEXT_MODEL, messages, { timeoutMs: 120000 })
    } catch (e: any) {
      console.warn('[AI] AnyModel не сработал:', e.message)
    }
  }

  throw new Error(
    'Не настроены API ключи для AI.\n\n' +
    'Что делать:\n' +
    '• Нажмите ✨ в правом нижнем углу\n' +
    '• Введите ключ Polza.ai или AnyModel\n' +
    '• Сохранить → перезагрузить страницу'
  )
}

export async function ocrImageDirect(imageDataUrl: string, fileName?: string): Promise<string> {
  const originalMime = getMimeFromDataUrl(imageDataUrl)

  // 1) Ресайз через canvas
  let finalDataUrl = imageDataUrl
  if (originalMime.startsWith('image/') && typeof document !== 'undefined') {
    try {
      const r = await resizeImageToJpegDataUrl(imageDataUrl)
      finalDataUrl = r.dataUrl
      console.log(`[OCR] Ресайз: ${Math.round(r.bytes / 1024)} KB`)
    } catch (e) {
      console.warn('[OCR] Canvas-ресайз не удался:', e)
    }
  }

  // 2) Промпт для OCR
  const prompt = `Ты — ветеринарный помощник. Перед тобой скан ветеринарного исследования.
Извлеки и структурируй ВЕСЬ текст с изображения, сохраняя:
1. Название исследования / заголовок
2. Дату исследования
3. Все показатели и их значения (с единицами измерения)
4. Референсные значения (если есть)
5. Заключение / интерпретацию
6. Подпись врача / печать

Название файла: ${guessFileName(imageDataUrl, fileName)}`

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: finalDataUrl } },
      ],
    },
  ]

  // 1) Polza.ai (Gemini 2.5 Flash) — БЫСТРЫЙ OCR, 3-5с — только если есть ключ
  if (hasPolzaKey()) {
    console.log('[OCR] Polza.ai (' + POLZA_VISION_MODEL + ')')
    try {
      const result = await callPolza(POLZA_VISION_MODEL, messages, { timeoutMs: 60000 })
      if (result && result.trim().length > 0) {
        return result
      }
      throw new Error('Polza.ai вернул пустой ответ')
    } catch (e: any) {
      console.warn('[OCR] Polza.ai не сработал:', e.message, '— пробую AnyModel')
    }
  } else {
    console.log('[OCR] Polza.ai: ключ не задан — использую AnyModel')
  }

  // 2) AnyModel (Gemini 3.7 Flash) — fallback, ~13с — только если есть ключ
  if (hasAnyModelKey()) {
    console.log('[OCR] AnyModel (gemini-3.7-flash-medium)')
    try {
      const result = await callAnyModel(ANYMODEL_VISION_MODEL, messages, { timeoutMs: 120000 })
      if (result && result.trim().length > 0) {
        return result
      }
      throw new Error('AnyModel вернул пустой ответ')
    } catch (e: any) {
      console.warn('[OCR] AnyModel не сработал:', e.message)
    }
  }

  // Все источники недоступны — понятное сообщение
  throw new Error(
    'Не удалось распознать текст.\n\n' +
    'Что делать:\n' +
    '• Нажмите ✨ в правом нижнем углу\n' +
    '• Проверьте что ключ Polza.ai задан\n' +
    '• Подождите 1-2 минуты если превышен лимит\n' +
    '• Используйте «Ручной ввод данных исследования» ниже'
  )
}
