import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'
import { extractTextFromHtml, isHtml } from '@/lib/html-parser'




interface OcrRequestBody {
  imageDataUrl: string
  fileName?: string
  fileType?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OcrRequestBody
    const { imageDataUrl, fileName, fileType } = body

    if (!imageDataUrl) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 })
    }

    // Проверяем HTML
    const isHtmlFile =
      (fileType && fileType.includes('html')) ||
      imageDataUrl.startsWith('data:text/html') ||
      (fileName && /\.(html?|xhtml)$/i.test(fileName))

    if (isHtmlFile) {
      try {
        const base64Match = imageDataUrl.match(/^data:[^;]+;base64,(.+)$/)
        const utf8Match = imageDataUrl.match(/^data:[^;]+;utf8,(.+)$/)
        const plainMatch = imageDataUrl.match(/^data:[^,]+,(.+)$/)

        let htmlContent = ''
        if (base64Match) {
          // Edge runtime: используем atob вместо Buffer
          htmlContent = atob(base64Match[1])
          htmlContent = decodeURIComponent(escape(htmlContent))
        } else if (utf8Match) {
          htmlContent = decodeURIComponent(utf8Match[1])
        } else if (plainMatch) {
          htmlContent = decodeURIComponent(plainMatch[1])
        } else {
          htmlContent = imageDataUrl
        }

        if (!isHtml(htmlContent)) {
          return NextResponse.json({ text: '⚠️ Файл не содержит HTML-разметки.' })
        }

        const text = extractTextFromHtml(htmlContent)
        if (!text || text.length < 10) {
          return NextResponse.json({ text: 'Не удалось извлечь текст из HTML.' })
        }

        return NextResponse.json({ text, method: 'html-parser' })
      } catch (e) {
        return NextResponse.json(
          { error: 'Не удалось обработать HTML-файл', details: e instanceof Error ? e.message : String(e) },
          { status: 500 }
        )
      }
    }

    // PDF — обрабатывается на клиенте (pdfjs-dist в браузере)
    // Если PDF попал сюда — значит текст не извлечён на клиенте
    const isPdfFile =
      (fileType && fileType.includes('pdf')) ||
      imageDataUrl.startsWith('data:application/pdf') ||
      (fileName && /\.pdf$/i.test(fileName))

    if (isPdfFile) {
      return NextResponse.json({
        text: '📋 PDF обрабатывается в браузере. Если текст не извлечён — возможно, это сканированный PDF без текстового слоя. Попробуйте сделать скриншот и загрузить как изображение.',
        method: 'pdf-client-only'
      })
    }

    // Для изображений — AI Vision OCR
    const zai = await getZai()

    const prompt = `Ты — ветеринарный помощник. Перед тобой скан ветеринарного исследования.
Извлеки и структурируй ВЕСЬ текст с изображения, сохраняя:
1. Название исследования / заголовок
2. Дату исследования
3. Все показатели и их значения (с единицами измерения)
4. Референсные значения (если есть)
5. Заключение / интерпретацию
6. Подпись врача / печать

Если что-то неразборчиво — отметь [неразборчиво].
Название файла: ${fileName || 'неизвестно'}`

    const completion = await zai.chat.completions.create({
      model: 'glm-4.5v',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ] as any,
      thinking: { type: 'disabled' },
    } as any)

    const text = completion?.choices?.[0]?.message?.content || 'Не удалось распознать текст'

    return NextResponse.json({ text, method: 'ai-vision' })
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: 'Ошибка OCR', details: errorMessage },
      { status: 500 }
    )
  }
}
