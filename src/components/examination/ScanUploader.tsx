'use client'

import { useRef, useState } from 'react'
import { useVetStore, type ScanFile } from '@/store/vetStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ScanText,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Eye,
  Sparkles,
  X,
} from 'lucide-react'
import { ManualResearchInput } from '@/components/examination/ManualResearchInput'
import { ocrImageDirect } from '@/lib/zai-direct'


const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8 MB
const ACCEPTED = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/html',
  'application/xhtml+xml',
  'text/htm',
]

// Проверка, является ли файл HTML
function isHtmlFile(scan: ScanFile): boolean {
  return (
    scan.type === 'text/html' ||
    scan.type === 'application/xhtml+xml' ||
    /\.(html?|xhtml)$/i.test(scan.name)
  )
}

// Проверка, является ли файл PDF
function isPdfFile(scan: ScanFile): boolean {
  return (
    scan.type === 'application/pdf' ||
    /\.pdf$/i.test(scan.name)
  )
}

export function ScanUploader() {
  const scans = useVetStore((s) => s.scans)
  const addScan = useVetStore((s) => s.addScan)
  const updateScan = useVetStore((s) => s.updateScan)
  const removeScan = useVetStore((s) => s.removeScan)

  const inputRef = useRef<HTMLInputElement>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError('')

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`Файл ${file.name} слишком большой (макс. 8 МБ)`)
        continue
      }
      const isAcceptedType = ACCEPTED.includes(file.type) || /\.(html?|xhtml|pdf|jpe?g|png|webp|gif)$/i.test(file.name)
      if (!isAcceptedType) {
        setError(`Файл ${file.name} не поддерживается (только изображения, PDF и HTML)`)
        continue
      }

      // Для PDF создаём превью на основе иконки (data URL — это сам PDF)
      const dataUrl = await readAsDataUrl(file)

      const isHtml = file.type === 'text/html' || file.type === 'application/xhtml+xml' || /\.(html?|xhtml)$/i.test(file.name)
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)
      const scan: ScanFile = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        type: file.type || (isHtml ? 'text/html' : isPdf ? 'application/pdf' : isImage ? 'image/jpeg' : 'application/octet-stream'),
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString(),
        ocrText: '',
        ocrStatus: 'pending',
      }
      addScan(scan)

      // Авто-запуск OCR для всех типов
      if (isHtml) {
        setTimeout(() => runOcr(scan), 100)
      } else if (isPdf) {
        setTimeout(() => runPdfExtraction(scan), 100)
      } else if (isImage) {
        setTimeout(() => runOcr(scan), 100)
      }
    }
  }

  // 🆕 Клиентское извлечение текста из PDF (без отправки на сервер)
  const runPdfExtraction = async (scan: ScanFile) => {
    updateScan(scan.id, { ocrStatus: 'processing' })
    try {
      const { extractPdfTextClientSide } = await import('@/lib/pdf-client')
      const text = await extractPdfTextClientSide(scan.dataUrl)

      if (text && text.trim().length > 5) {
        // Текст успешно извлечён на клиенте
        updateScan(scan.id, {
          ocrText: text,
          ocrStatus: 'done',
        })
      } else {
        // PDF без текстового слоя (сканированный) — НЕ отправляем на сервер
        // Даём понятное сообщение вместо "Failed to fetch"
        updateScan(scan.id, {
          ocrText: '📋 PDF не содержит текстового слоя (сканированный документ).\n\nДля распознавания сканированного PDF:\n1. Сделайте скриншот страницы\n2. Сохраните как изображение (JPEG/PNG)\n3. Загрузите изображение — оно будет распознано через AI\n\nИли используйте функцию «Ручной ввод данных исследования» ниже — введите данные вручную.',
          ocrStatus: 'error',
        })
      }
    } catch (e) {
      console.error('PDF client extraction error:', e)
      // Ошибка при извлечении — НЕ отправляем на сервер (избегаем "Failed to fetch")
      updateScan(scan.id, {
        ocrText: '📋 Не удалось обработать PDF файл.\n\nВозможные причины:\n• PDF зашифрован или защищён паролем\n• Повреждённый PDF\n• PDF в нестандартном формате\n\nПопробуйте:\n1. Сделать скриншот страницы и загрузить как изображение\n2. Или ввести данные вручную через «Ручной ввод данных исследования» ниже',
        ocrStatus: 'error',
      })
    }
  }

  const runOcr = async (scan: ScanFile) => {
    updateScan(scan.id, { ocrStatus: 'processing' })
    try {
      // HTML — извлекаем текст локально через html-парсер (без AI)
      if (isHtmlFile(scan)) {
        const { extractTextFromHtml, isHtml } = await import('@/lib/html-parser')
        const base64Match = scan.dataUrl.match(/^data:[^;]+;base64,(.+)$/)
        const plainMatch = scan.dataUrl.match(/^data:[^,]+,(.+)$/)
        let htmlContent = ''
        if (base64Match) {
          htmlContent = atob(base64Match[1])
          htmlContent = decodeURIComponent(escape(htmlContent))
        } else if (plainMatch) {
          htmlContent = decodeURIComponent(plainMatch[1])
        } else {
          htmlContent = scan.dataUrl
        }
        if (isHtml(htmlContent)) {
          const text = extractTextFromHtml(htmlContent)
          updateScan(scan.id, { ocrText: text || '', ocrStatus: 'done' })
          return
        }
      }

      // Изображения (JPEG, PNG) — Z.AI Vision через Cloudflare Worker
      console.log('[OCR] Запуск распознавания для', scan.name, 'тип:', scan.type)
      const t0 = Date.now()
      const text = await ocrImageDirect(scan.dataUrl, scan.name)
      console.log(`[OCR] Готово за ${((Date.now() - t0) / 1000).toFixed(1)}s, символов: ${text?.length || 0}`)
      updateScan(scan.id, {
        ocrText: text || '',
        ocrStatus: 'done',
      })
    } catch (e) {
      console.error('[OCR] Ошибка:', e)
      const errMsg = e instanceof Error ? e.message : String(e)
      updateScan(scan.id, {
        ocrStatus: 'error',
        ocrText:
          'Не удалось распознать текст. ' + errMsg +
          '\n\nВозможные причины:\n' +
          '• Нет подключения к интернету\n' +
          '• AI-прокси временно недоступен\n' +
          '• Файл слишком большой или повреждён\n\n' +
          'Попробуйте сделать скриншот с меньшим разрешением или введите данные вручную через «Ручной ввод данных исследования» ниже.',
      })
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    handleFiles(e.dataTransfer.files)
  }

  const previewScan = previewId ? scans.find((s) => s.id === previewId) : null

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
  }

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50/30 to-sky-50/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanText className="h-5 w-5 text-violet-600" />
          Загрузка исследований — сканы, PDF, HTML
        </CardTitle>
        <CardDescription>
          Загрузите сканы анализов, УЗИ-описаний, рентген-заключений, выписок.
          Поддерживаются изображения (OCR через AI), PDF и HTML-файлы лабораторий
          (быстрое извлечение текста без AI).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={handleDrop}
          className="border-2 border-dashed border-violet-300 rounded-lg p-8 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50/50 transition-all"
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',') + ',.html,.htm'}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Upload className="h-10 w-10 text-violet-400 mx-auto mb-2" />
          <div className="font-medium text-violet-700">Перетащите файлы или нажмите для выбора</div>
          <div className="text-xs text-muted-foreground mt-1">
            Поддерживаются: JPEG, PNG, WebP, GIF, PDF, HTML · до 8 МБ
          </div>
          {error && (
            <div className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded p-2 inline-block">
              {error}
            </div>
          )}
        </div>

        {/* 🆕 Окно ручного ввода данных исследования */}
        <ManualResearchInput />

        {/* Список загруженных файлов */}
        {scans.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Пока не загружено ни одного исследования
          </div>
        ) : (
          <div className="space-y-3">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="rounded-lg border bg-card p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <button
                    type="button"
                    onClick={() => setPreviewId(scan.id)}
                    className="shrink-0 rounded-md overflow-hidden border bg-muted"
                  >
                    {scan.type === 'application/pdf' ? (
                      <div className="w-16 h-16 flex items-center justify-center bg-rose-50">
                        <FileText className="h-7 w-7 text-rose-600" />
                      </div>
                    ) : scan.type === 'text/html' || scan.type === 'application/xhtml+xml' || /\.(html?|xhtml)$/i.test(scan.name) ? (
                      <div className="w-16 h-16 flex items-center justify-center bg-orange-50">
                        <FileText className="h-7 w-7 text-orange-600" />
                      </div>
                    ) : (
                      <img
                        src={scan.dataUrl}
                        alt={scan.name}
                        className="w-16 h-16 object-cover"
                      />
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-2">
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {scan.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatSize(scan.size)} · {new Date(scan.uploadedAt).toLocaleString('ru-RU')}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {isHtmlFile(scan) && (
                        <Badge variant="outline" className="text-orange-700 bg-orange-50 border-orange-300">
                          📄 HTML
                        </Badge>
                      )}
                      {isPdfFile(scan) && (
                        <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-300">
                          📄 PDF
                        </Badge>
                      )}
                      {scan.ocrStatus === 'pending' && (
                        <Badge variant="outline" className="text-slate-600">Не распознано</Badge>
                      )}
                      {scan.ocrStatus === 'processing' && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Распознаётся…
                        </Badge>
                      )}
                      {scan.ocrStatus === 'done' && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                          <Sparkles className="h-3 w-3 mr-1" /> Распознано
                        </Badge>
                      )}
                      {scan.ocrStatus === 'error' && (
                        <Badge className="bg-rose-100 text-rose-700 border-rose-300">Ошибка</Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => runOcr(scan)}
                      disabled={scan.ocrStatus === 'processing'}
                    >
                      {scan.ocrStatus === 'processing' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ScanText className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1">{isHtmlFile(scan) || isPdfFile(scan) ? 'Извлечь текст' : 'OCR'}</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewId(scan.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => removeScan(scan.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Распознанный текст */}
                {scan.ocrStatus === 'done' && scan.ocrText && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Распознанный текст (можно отредактировать)
                    </div>
                    <Textarea
                      rows={6}
                      value={scan.ocrText}
                      onChange={(e) => updateScan(scan.id, { ocrText: e.target.value })}
                      className="font-mono text-xs"
                    />
                  </div>
                )}
                {scan.ocrStatus === 'error' && scan.ocrText && (
                  <div className="text-xs text-rose-600 p-2 bg-rose-50 border border-rose-200 rounded">
                    {scan.ocrText}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Превью в диалоге */}
      <Dialog open={!!previewScan} onOpenChange={(open) => !open && setPreviewId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {previewScan?.name}
            </DialogTitle>
            <DialogDescription>
              Превью исследования · {previewScan ? formatSize(previewScan.size) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/30 rounded-lg flex items-center justify-center p-2 min-h-[300px]">
            {previewScan?.type === 'application/pdf' ? (
              <iframe
                src={previewScan.dataUrl}
                className="w-full h-[70vh]"
                title={previewScan.name}
              />
            ) : previewScan?.type === 'text/html' || previewScan?.type === 'application/xhtml+xml' || (previewScan && /\.(html?|xhtml)$/i.test(previewScan.name)) ? (
              <iframe
                src={previewScan.dataUrl}
                className="w-full h-[70vh] bg-white rounded-md"
                title={previewScan.name}
                sandbox=""
              />
            ) : (
              previewScan && (
                <img
                  src={previewScan.dataUrl}
                  alt={previewScan.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )
            )}
          </div>
          {previewScan?.ocrText && previewScan.ocrStatus === 'done' && (
            <div className="mt-2 p-3 bg-muted/50 rounded-md max-h-40 overflow-y-auto text-sm whitespace-pre-wrap">
              {previewScan.ocrText}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
