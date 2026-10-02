'use client'

import { useState } from 'react'
import { useVetStore, type ScanFile } from '@/store/vetStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { PenLine, Plus, X, CheckCircle2 } from 'lucide-react'

/**
 * Окно свободного ручного ввода данных исследований.
 * Врач может вручную ввести результаты анализов, описания УЗИ, рентгена и т.д.
 * Сохраняется как обычный scan-файл с ocrText (готовый текст, без OCR).
 */
export function ManualResearchInput() {
  const addScan = useVetStore((s) => s.addScan)
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (!text.trim()) {
      alert('Введите текст исследования')
      return
    }

    const scan: ScanFile = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: title.trim() || 'Ручной ввод',
      type: 'manual/text',
      size: text.length,
      dataUrl: '',
      uploadedAt: new Date().toISOString(),
      ocrText: text.trim(),
      ocrStatus: 'done',
    }
    addScan(scan)

    setSaved(true)
    setTitle('')
    setText('')
    setTimeout(() => {
      setSaved(false)
      setExpanded(false)
    }, 2000)
  }

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left hover:bg-sky-50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-sky-600" />
          <span className="font-medium text-sm text-sky-700">
            Ручной ввод данных исследования
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {expanded ? 'Свернуть ▲' : 'Развернуть ▼'}
        </span>
      </button>

      {expanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-sky-200">
          <div className="pt-3">
            <div className="text-xs text-muted-foreground mb-2">
              💡 Введите результаты анализов, описания УЗИ, рентгена или других исследований
              вручную — без загрузки файла. Текст будет учтён в AI-заключении.
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Название исследования</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Напр.: Общий анализ крови, УЗИ брюшной полости, Рентген грудной клетки…"
                className="h-9"
              />
            </div>

            <div className="space-y-2 mt-2">
              <Label className="text-xs">Текст / результаты</Label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Введите данные вручную, например:\n\nГемоглобин: 180 г/л (норма 120-180)\nЛейкоциты: 22.0 ×10⁹/л (норма 6.0-15.0) — отклонение\nЭритроциты: 6.5 ×10¹²/л (норма 5.5-8.5)\n\nЗаключение: лейкоцитоз`}
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 mt-3">
              {saved ? (
                <div className="text-sm text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Сохранено ✓
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTitle('')
                      setText('')
                      setExpanded(false)
                    }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSave}
                    className="bg-sky-600 hover:bg-sky-700 text-white"
                    disabled={!text.trim()}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Добавить в список
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
