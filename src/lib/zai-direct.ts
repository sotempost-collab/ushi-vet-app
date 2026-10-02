/**
 * Z.AI / AnyModel / Tesseract — унифицированный доступ к AI.
 *
 * Источники (по приоритету):
 * 1. Tesseract.js — локальный OCR в браузере (работает офлайн, не зависит от Worker).
 * 2. Cloudflare Worker (ushi-zai-proxy) — glm-4.5v для OCR и glm-4.5-air для текста.
 * 3. AnyModel.org — OpenAI-compatible API (если пользователь задаст ANYMODEL_API_KEY в localStorage).
 *
 * Storage keys (localStorage):
 * - `anymodel_api_key` — если задан, AI-запросы идут через AnyModel.org (вместо Worker).
 * - `anymodel_text_model` — модель для текста (по умолчанию "gpt-4o-mini").
 * - `anymodel_vision_model` — модель для vision/OCR (по умолчанию "gpt-4o").
 */

const WORKER_URL = 'https://ushi-zai-proxy.sotem-post.workers.dev'
const ANYMODEL_BASE_URL = 'https://anymodel.org/v1'

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
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('anymodel_api_key') || ''
}

function getAnyModelTextModel(): string {
  if (typeof window === 'undefined') return 'cx/gpt-5.6-sol'
  return localStorage.getItem('anymodel_text_model') || 'cx/gpt-5.6-sol'
}

function getAnyModelVisionModel(): string {
  if (typeof window === 'undefined') return 'glm/glm-5.3-flash'
  return localStorage.getItem('anymodel_vision_model') || 'glm/glm-5.3-flash'
}

// ─────────────────────────────────────────────────────────────────────
// Canvas ресайз изображений (для Worker и AnyModel)
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
// Canvas preprocessing для OCR (grayscale + контраст)
// ─────────────────────────────────────────────────────────────────────

async function preprocessImageForOcr(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width
        const h = img.naturalHeight || img.height
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D context недоступен'))
          return
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0)

        // Получаем пиксели
        const imageData = ctx.getImageData(0, 0, w, h)
        const data = imageData.data

        // Конвертация в grayscale + повышение контраста (1.5x)
        const contrast = 1.5
        const intercept = 128 * (1 - contrast)
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale (luminosity formula)
          let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          // Контраст
          gray = contrast * gray + intercept
          // Clip
          gray = Math.max(0, Math.min(255, gray))
          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
        }
        ctx.putImageData(imageData, 0, 0)

        resolve(canvas.toDataURL('image/png'))
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Ошибка preprocessing'))
      }
    }
    img.onerror = () => reject(new Error('Не удалось загрузить изображение'))
    img.src = dataUrl
  })
}

// ─────────────────────────────────────────────────────────────────────
// Локальный OCR через Tesseract.js (работает офлайн в браузере)
// ─────────────────────────────────────────────────────────────────────

async function ocrLocal(dataUrl: string): Promise<string> {
  // Динамический импорт — tesseract.js тяжёлый (~2MB), грузим только когда нужен
  const { default: Tesseract } = await import('tesseract.js')

  console.log('[OCR-Local] Запуск tesseract.js (русский + английский)...')
  const t0 = Date.now()

  // Параметры tesseract для лучшего качества на сканах анализов:
  // - PSM_AUTO_OSD (3) — автоопределение ориентации и сегментации
  // - OEM_LSTM_ONLY (1) — современный LSTM engine (точнее чем default)
  // - preserve_interword_spaces — сохранять пробелы между колонками
  const worker = await Tesseract.recognize(
    dataUrl,
    'rus+eng',
    {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR-Local] Прогресс: ${Math.round(m.progress * 100)}%`)
        }
      },
      // @ts-ignore — tesseract.js принимает эти параметры
      tessedit_pageseg_mode: 'PSM_AUTO_OSD',
      tessedit_ocr_engine_mode: 'OEM_LSTM_ONLY',
      preserve_interword_spaces: '1',
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯabcdefghijklmnopqrstuvwxyzабвгдеёжзийклмнопрстуфхцчшщъыьэюя0123456789.,:;-/+()=<>%№#°µмкММ/лЛмг%гдLЕдУаАbcCmзЗйЙиИтТяЯюЮ',
    }
  )

  const text = worker.data.text || ''
  console.log(`[OCR-Local] Готово за ${((Date.now() - t0) / 1000).toFixed(1)}s, символов: ${text.length}`)
  return text
}

// ─────────────────────────────────────────────────────────────────────
// AI через Worker (Z.AI прокси)
// ─────────────────────────────────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  body: any,
  options: { maxAttempts?: number; timeoutMs?: number } = {}
): Promise<Response> {
  const { maxAttempts = 3, timeoutMs = 60000 } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      console.log(`[Fetch] Попытка ${attempt}/${maxAttempts} → ${url}`)
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (e: any) {
      clearTimeout(timeoutId)
      const isLast = attempt === maxAttempts
      const isRetryable = (
        e?.name === 'AbortError' ||
        e?.message?.includes('Failed to fetch') ||
        e?.message?.includes('NetworkError') ||
        e?.message?.includes('Load failed') ||
        e?.message?.includes('The operation was aborted') ||
        e?.message?.includes('ERR_')
      )
      console.warn(`[Fetch] Попытка ${attempt} не удалась: ${e?.message}`)
      if (!isRetryable || isLast) throw e
      await new Promise((r) => setTimeout(r, 1500))
    }
  }

  throw new Error('Все попытки fetch провалились')
}

async function callWorker(
  model: string,
  messages: any[],
  options: { maxAttempts?: number; timeoutMs?: number } = {}
): Promise<string> {
  const response = await fetchWithRetry(WORKER_URL, {
    model,
    messages,
    thinking: { type: 'disabled' },
  }, options)

  if (!response.ok) {
    let errorText = ''
    try { errorText = await response.text() } catch {}
    if (response.status === 413) {
      throw new Error(`Запрос слишком большой даже после сжатия. Уменьшите изображение.`)
    }
    if (response.status === 403) {
      throw new Error(`Доступ к AI-прокси запрещён (403). Попробуйте через 1-2 минуты.`)
    }
    throw new Error(`Ошибка AI (HTTP ${response.status}). ${errorText.slice(0, 200)}`)
  }

  let result: any
  try {
    result = await response.json()
  } catch {
    throw new Error('Некорректный JSON-ответ от Worker.')
  }

  const content = result?.choices?.[0]?.message?.content
  if (!content) throw new Error('AI вернул пустой ответ.')
  return content
}

// ─────────────────────────────────────────────────────────────────────
// AI через AnyModel.org (OpenAI-compatible)
// ─────────────────────────────────────────────────────────────────────

async function callAnyModel(
  apiKey: string,
  model: string,
  messages: any[],
  options: { maxAttempts?: number; timeoutMs?: number } = {}
): Promise<string> {
  const response = await fetchWithRetry(
    `${ANYMODEL_BASE_URL}/chat/completions`,
    {
      model,
      messages,
      max_tokens: 4000,
    },
    {
      ...options,
      // AnyModel требует Authorization header — добавим через body обёртку
    }
  ).catch(async (e) => {
    // Сделаем ручной fetch с Authorization (наш fetchWithRetry не добавляет Authorization)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 60000)
    try {
      return await fetch(`${ANYMODEL_BASE_URL}/chat/completions`, {
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
    } finally {
      clearTimeout(timeoutId)
    }
  })

  if (!response.ok) {
    let errorText = ''
    try { errorText = await response.text() } catch {}
    if (response.status === 401) {
      // Удаляем невалидный ключ
      localStorage.removeItem('anymodel_api_key')
      throw new Error(`Неверный API ключ AnyModel (401). Ключ удалён — переключаюсь на Worker.\n\n${errorText.slice(0, 200)}`)
    }
    throw new Error(`Ошибка AnyModel (HTTP ${response.status}). ${errorText.slice(0, 200)}`)
  }

  let result: any
  try {
    result = await response.json()
  } catch {
    throw new Error('Некорректный JSON-ответ от AnyModel.')
  }

  const content = result?.choices?.[0]?.message?.content
  if (!content) throw new Error('AnyModel вернул пустой ответ.')
  return content
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
Учитывай вид пациента (${patient.species === 'cat' ? 'Кошка: метаболизм отличается, парацетамол/карпрофен нельзя' : 'Собака'}).`

  const messages = [
    { role: 'system', content: 'Ты ветеринарный эксперт-консультант. Отвечаешь на русском языке, в медицинском стиле.' },
    { role: 'user', content: prompt },
  ]

  const anyModelKey = getAnyModelApiKey()
  if (anyModelKey) {
    console.log('[AI] Использую AnyModel.org, модель:', getAnyModelTextModel())
    try {
      return await callAnyModel(anyModelKey, getAnyModelTextModel(), messages)
    } catch (e: any) {
      console.warn('[AI] AnyModel не сработал:', e.message, '— переключаюсь на Worker')
    }
  }

  console.log('[AI] Использую Worker (glm-4.5-air)')
  return callWorker('glm-4.5-air', messages)
}

export async function ocrImageDirect(imageDataUrl: string, fileName?: string): Promise<string> {
  const originalMime = getMimeFromDataUrl(imageDataUrl)

  // 1) Ресайз через canvas (для Worker и AnyModel)
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

  // 2) Сначала пробуем AI через AnyModel или Worker (они лучше справляются со сканами)
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

  // 3) Сначала AnyModel (если задан API key)
  const anyModelKey = getAnyModelApiKey()
  if (anyModelKey) {
    console.log('[OCR] Шаг 1: AnyModel.org, модель:', getAnyModelVisionModel())
    try {
      const result = await callAnyModel(anyModelKey, getAnyModelVisionModel(), messages)
      // Проверим что AnyModel вернул вменяемый результат (не мусор)
      if (result && result.trim().length > 30 && looksLikeText(result)) {
        return result
      }
      console.warn('[OCR] AnyModel вернул мусор — пробую Worker')
    } catch (e: any) {
      console.warn('[OCR] AnyModel не сработал:', e.message, '— пробую Worker')
    }
  }

  // 4) Worker (если недоступен — fallback на tesseract)
  try {
    console.log('[OCR] Шаг 2: Worker (glm-4.5v)')
    const result = await callWorker('glm-4.5v', messages)
    if (result && result.trim().length > 30 && looksLikeText(result)) {
      return result
    }
    console.warn('[OCR] Worker вернул мусор — пробую tesseract')
  } catch (e: any) {
    console.warn('[OCR] Worker не сработал:', e.message, '— пробую локальный tesseract')
  }

  // 5) Fallback: локальный tesseract.js (работает офлайн)
  try {
    console.log('[OCR] Шаг 3: локальный tesseract.js (с preprocessing)')
    // Preprocessing: grayscale + контраст для лучшего распознавания
    let preprocessed = finalDataUrl
    try {
      preprocessed = await preprocessImageForOcr(finalDataUrl)
    } catch (e) {
      console.warn('[OCR] Preprocessing не удался, использую оригинал')
    }

    const localText = await ocrLocal(preprocessed)
    if (localText && localText.trim().length > 20 && looksLikeText(localText)) {
      console.log('[OCR] Tesseract вернул распознанный текст')
      return localText + '\n\n⚠️ Текст распознан локальным OCR (tesseract.js) — проверьте корректность. Для лучшего качества подключите AnyModel API key или используйте ручной ввод.'
    }
    console.warn('[OCR] Tesseract вернул слишком мало текста')
  } catch (e: any) {
    console.warn('[OCR] Tesseract не сработал:', e.message)
  }

  // 6) Все источники провалились — понятное сообщение
  throw new Error(
    'Не удалось распознать текст ни одним из доступных источников (AnyModel, Worker, Tesseract).\n\n' +
    'Что попробовать:\n' +
    '• Подключите AnyModel API key: F12 → Console → localStorage.setItem(\'anymodel_api_key\', \'ВАШ_КЛЮЧ\')\n' +
    '  Получить ключ: https://anymodel.org (платный, $0.25/1M токенов)\n' +
    '• Проверьте интернет-соединение (Worker требует доступ к Cloudflare)\n' +
    '• Используйте «Ручной ввод данных исследования» ниже — введите данные вручную'
  )
}

// Эвристическая проверка: похож ли текст на нормальный или это мусор
function looksLikeText(text: string): boolean {
  if (!text) return false
  const trimmed = text.trim()
  if (trimmed.length < 10) return false

  // Считаем "осмысленные" символы: буквы, цифры, основные знаки препинания
  const meaningfulChars = (trimmed.match(/[a-zA-Zа-яА-ЯёЁ0-9\s.,;:!?()\-+=/]/g) || []).length
  // Считаем "мусорные" символы: =, |, _, непечатные
  const garbageChars = (trimmed.match(/[=_|<>~^*#@$&]/g) || []).length
  // Считаем строки с реальными словами (3+ буквы подряд)
  const wordCount = (trimmed.match(/[a-zA-Zа-яА-ЯёЁ]{3,}/g) || []).length

  // Если "мусорных" символов больше 30% — это вероятно мусор
  const garbageRatio = garbageChars / trimmed.length
  if (garbageRatio > 0.3) return false

  // Если слов меньше 3 на 100 символов — мало реального текста
  if (wordCount < trimmed.length / 100) return false

  // Если meaningfulChars меньше 50% — не похоже на текст
  if (meaningfulChars / trimmed.length < 0.5) return false

  return true
}
