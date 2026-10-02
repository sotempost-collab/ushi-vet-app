'use client'

/**
 * Клиентский парсер PDF — извлекает текст прямо в браузере.
 * Не отправляет PDF на сервер — работает мгновенно и без ограничений по размеру.
 * Использует pdfjs-dist с web worker (работает в браузере).
 */

let pdfjsLibPromise: Promise<any> | null = null

async function getPdfjsLib() {
  if (pdfjsLibPromise) return pdfjsLibPromise

  pdfjsLibPromise = (async () => {
    // Динамический импорт pdfjs-dist для браузера
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs')

    // Устанавливаем worker — в браузере это работает корректно
    // Используем CDN для worker файла (надёжнее чем локальный путь в bundle)
    const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

    return pdfjsLib
  })()

  return pdfjsLibPromise
}

/**
 * Извлекает текст из PDF файла прямо в браузере.
 * @param dataUrl — data URL PDF файла (data:application/pdf;base64,...)
 * @returns извлечённый текст или null если не удалось
 */
export async function extractPdfTextClientSide(dataUrl: string): Promise<string | null> {
  try {
    const pdfjsLib = await getPdfjsLib()

    // Извлекаем base64 из data URL
    const base64Match = dataUrl.match(/^data:[^;]+;base64,(.+)$/)
    if (!base64Match) return null

    // Конвертируем base64 в Uint8Array
    const binaryString = atob(base64Match[1])
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Загружаем PDF
    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      useSystemFonts: true,
      disableWorker: false,
    })

    const doc = await loadingTask.promise
    let fullText = ''

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const text = content.items
        .map((item: any) => item.str)
        .join(' ')

      if (doc.numPages > 1) {
        fullText += `--- Страница ${i} ---\n${text}\n\n`
      } else {
        fullText += text + '\n'
      }
    }

    const result = fullText.trim()
    return result.length > 5 ? result : null
  } catch (e) {
    console.error('Client-side PDF parse error:', e)
    return null
  }
}

/**
 * Проверяет, есть ли в PDF текстовый слой.
 * Если pdfjs-dist не находит ни одного текстового элемента — PDF сканированный.
 */
export async function isPdfScanned(dataUrl: string): Promise<boolean> {
  try {
    const text = await extractPdfTextClientSide(dataUrl)
    return !text || text.trim().length < 5
  } catch {
    return true
  }
}
