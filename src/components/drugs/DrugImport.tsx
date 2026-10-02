'use client'

import { useState, useRef } from 'react'
import { useVetStore } from '@/store/vetStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Upload, FileText, Download, Trash2, Plus, AlertCircle, CheckCircle2, Info, X,
} from 'lucide-react'

interface ParsedDrug {
  drug: string
  category: string
  indication: string
  dosePerKg: number
  frequency: string
  route: string
  notes?: string
  contraindications?: string
  keywords?: string[]
}

// Пример CSV для шаблона
const CSV_TEMPLATE = `drug,category,indication,dosePerKg,frequency,route,notes,contraindications,keywords
Фуразолидон,Антипротозойное,Лямблиоз у кошек и собак,2,2 раза/день,внутрь,5 мг/кг — курс 7 дней,не применять при почечной недостаточности,"лямблиоз;диарея;протозой"
Верошпирон,Диуретик (калийсберегающий),Асцит ХСН,1,2 раза/день,внутрь,1-2 мг/кг/день,гиперкалиемия,"асцит;хсн;диуретик"`

export function DrugImport() {
  const customDrugs = useVetStore((s) => s.customDrugs)
  const addCustomDrug = useVetStore((s) => s.addCustomDrug)
  const removeCustomDrug = useVetStore((s) => s.removeCustomDrug)
  const clearCustomDrugs = useVetStore((s) => s.clearCustomDrugs)

  const [showImport, setShowImport] = useState(false)
  const [parsedDrugs, setParsedDrugs] = useState<ParsedDrug[]>([])
  const [error, setError] = useState('')
  const [importedCount, setImportedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const parseCSV = (text: string): ParsedDrug[] => {
    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) {
      throw new Error('CSV должен содержать заголовок и минимум одну строку данных')
    }

    // Разбор заголовка
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

    // Проверка обязательных полей
    const required = ['drug', 'category', 'indication', 'doseperkg', 'frequency', 'route']
    const missing = required.filter((r) => !headers.includes(r))
    if (missing.length > 0) {
      throw new Error(`В CSV отсутствуют обязательные колонки: ${missing.join(', ')}`)
    }

    const result: ParsedDrug[] = []

    // Парсинг строк (поддержка кавычек для полей с запятыми)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Простой парсер с поддержкой кавычек
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())

      // Маппинг значений по заголовкам
      const drug: ParsedDrug = {
        drug: values[headers.indexOf('drug')] || '',
        category: values[headers.indexOf('category')] || '',
        indication: values[headers.indexOf('indication')] || '',
        dosePerKg: parseFloat(values[headers.indexOf('doseperkg')] || '0') || 0,
        frequency: values[headers.indexOf('frequency')] || '',
        route: values[headers.indexOf('route')] || '',
        notes: values[headers.indexOf('notes')] || undefined,
        contraindications: values[headers.indexOf('contraindications')] || undefined,
        keywords: (values[headers.indexOf('keywords')] || '')
          .split(';')
          .map((k) => k.trim())
          .filter(Boolean),
      }

      if (!drug.drug || drug.dosePerKg <= 0) {
        throw new Error(`Строка ${i + 1}: нет названия или некорректная доза`)
      }

      result.push(drug)
    }

    return result
  }

  const handleFileSelect = async (file: File) => {
    setError('')
    try {
      const text = await file.text()
      const parsed = parseCSV(text)
      setParsedDrugs(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка парсинга CSV')
      setParsedDrugs([])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleImport = () => {
    let count = 0
    for (const drug of parsedDrugs) {
      addCustomDrug(drug)
      count++
    }
    setImportedCount(count)
    setParsedDrugs([])
    setShowImport(false)
    setTimeout(() => setImportedCount(0), 4000)
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ushihvost-drugs-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Card className="border-violet-200 bg-gradient-to-br from-violet-50/30 to-sky-50/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-violet-600" />
            Мои препараты (CSV импорт)
            <Badge variant="outline" className="ml-1 text-xs bg-amber-100 text-amber-700 border-amber-300">
              ⭐ Приоритет — в наличии
            </Badge>
          </CardTitle>
          <CardDescription>
            Загрузите препараты, которые есть в наличии в клинике.
            <strong> Препараты из этого списка имеют приоритет</strong> при подборе —
            AI и калькулятор сначала предлагают именно их, так как они доступны сразу.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowImport(true)}
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Импортировать препараты из CSV
            </Button>
            <Button
              onClick={downloadTemplate}
              size="sm"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Скачать шаблон CSV
            </Button>
            {customDrugs.length > 0 && (
              <Button
                onClick={() => setConfirmClear(true)}
                size="sm"
                variant="outline"
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Очистить все ({customDrugs.length})
              </Button>
            )}
          </div>

          {/* Уведомление об успешном импорте */}
          {importedCount > 0 && (
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Импортировано {importedCount} препаратов ✓
            </div>
          )}

          {/* Список пользовательских препаратов */}
          {customDrugs.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Добавленные препараты ({customDrugs.length}):
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {customDrugs.map((drug) => (
                  <div
                    key={drug.drug}
                    className="p-2.5 rounded-md border border-violet-200 bg-violet-50/30 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        <span className="text-violet-700">⭐</span>
                        {drug.drug}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {drug.category} · {drug.indication}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        💊 {drug.dosePerKg} мг/кг · {drug.frequency} · {drug.route}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCustomDrug(drug.drug)}
                      className="text-muted-foreground hover:text-rose-600 p-1 rounded shrink-0"
                      title="Удалить препарат"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-md">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              Нет добавленных препаратов
              <div className="text-xs mt-1">
                Скачайте шаблон, заполните в Excel/Google Sheets и загрузите обратно
              </div>
            </div>
          )}

          {/* Инструкция по CSV */}
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium mb-1">Формат CSV файла:</div>
              <div className="font-mono text-[11px] bg-slate-100 p-1.5 rounded">
                drug,category,indication,dosePerKg,frequency,route,notes,contraindications,keywords
              </div>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                <li><b>drug</b> — название (обязательно)</li>
                <li><b>category</b> — категория (обязательно)</li>
                <li><b>indication</b> — показание (обязательно)</li>
                <li><b>dosePerKg</b> — доза мг/кг (обязательно, число)</li>
                <li><b>frequency</b> — частота (обязательно, "2 раза/день")</li>
                <li><b>route</b> — путь введения (обязательно, "внутрь/в/в/п/к")</li>
                <li><b>notes</b>, <b>contraindications</b> — опционально</li>
                <li><b>keywords</b> — опционально, через ";"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Диалог импорта CSV */}
      <Dialog open={showImport} onOpenChange={(open) => {
        if (!open) {
          setParsedDrugs([])
          setError('')
        }
        setShowImport(open)
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-violet-600" />
              Импорт препаратов из CSV
            </DialogTitle>
            <DialogDescription>
              Загрузите CSV-файл с вашими препаратами. После парсинга вы увидите предпросмотр
              и сможете подтвердить импорт.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-violet-300 rounded-lg p-6 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50/50 transition-all"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileInput}
              />
              <Upload className="h-10 w-10 text-violet-400 mx-auto mb-2" />
              <div className="font-medium text-violet-700 text-sm">
                Перетащите CSV файл или нажмите для выбора
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Формат: .csv, поддерживаются кавычки для полей с запятыми
              </div>
            </div>

            {/* Кнопка скачать шаблон */}
            <div className="flex gap-2">
              <Button
                onClick={downloadTemplate}
                size="sm"
                variant="outline"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Скачать шаблон
              </Button>
            </div>

            {/* Ошибка */}
            {error && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Ошибка парсинга</div>
                  <div className="text-xs mt-0.5">{error}</div>
                </div>
              </div>
            )}

            {/* Предпросмотр распарсенных препаратов */}
            {parsedDrugs.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Распознано препаратов: {parsedDrugs.length}
                </div>
                <div className="border rounded-md max-h-64 overflow-y-auto">
                  {parsedDrugs.map((drug, i) => (
                    <div
                      key={i}
                      className="p-2.5 border-b last:border-b-0 hover:bg-accent/10"
                    >
                      <div className="font-medium text-sm">{drug.drug}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {drug.category} · {drug.indication}
                      </div>
                      <div className="text-xs mt-1 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {drug.dosePerKg} мг/кг
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {drug.frequency}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {drug.route}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImport(false)
                setParsedDrugs([])
                setError('')
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsedDrugs.length === 0}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Импортировать {parsedDrugs.length > 0 ? `(${parsedDrugs.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения очистки всех препаратов */}
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить все пользовательские препараты?</DialogTitle>
            <DialogDescription>
              Будут удалены все {customDrugs.length}{' '}
              {customDrugs.length === 1 ? 'препарат' : 'препаратов'}. Это действие необратимо.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearCustomDrugs()
                setConfirmClear(false)
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Удалить все
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
