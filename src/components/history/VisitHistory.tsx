'use client'

import { useState } from 'react'
import { useVetStore, type VisitRecord } from '@/store/vetStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  History,
  Trash2,
  Eye,
  Save,
  Clock,
  Calendar,
  PawPrint,
  AlertCircle,
  Download,
} from 'lucide-react'

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function VisitHistory() {
  const visitHistory = useVetStore((s) => s.visitHistory)
  const saveVisitToHistory = useVetStore((s) => s.saveVisitToHistory)
  const deleteVisitFromHistory = useVetStore((s) => s.deleteVisitFromHistory)
  const loadVisitFromHistory = useVetStore((s) => s.loadVisitFromHistory)
  const clearVisitHistory = useVetStore((s) => s.clearVisitHistory)
  const patient = useVetStore((s) => s.patient)
  const visitStartedAt = useVetStore((s) => s.visitStartedAt)
  const visitEndedAt = useVetStore((s) => s.visitEndedAt)

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const hasData = visitStartedAt !== null || patient.weight || patient.visitDate

  const handleSave = () => {
    if (!hasData) {
      alert('Нет данных для сохранения. Заполните хотя бы данные пациента.')
      return
    }
    const id = saveVisitToHistory()
    if (id) {
      setSavedId(id)
      setTimeout(() => setSavedId(null), 3000)
    }
  }

  const handleLoad = (id: string) => {
    if (visitStartedAt && !visitEndedAt) {
      if (!confirm('У вас есть незавершённый приём. Загрузить запись из истории? Текущие данные будут заменены.')) {
        return
      }
    } else if (hasData) {
      if (!confirm('Загрузить запись из истории? Текущие данные будут заменены.')) {
        return
      }
    }
    loadVisitFromHistory(id)
  }

  const handleDelete = (id: string) => {
    deleteVisitFromHistory(id)
    setConfirmDelete(null)
  }

  const handleClearAll = () => {
    clearVisitHistory()
    setConfirmClear(false)
  }

  const exportVisit = (visit: VisitRecord) => {
    let txt = `ВЕТЕРИНАРНЫЙ ПРОТОКОЛ\nАссистент УшиХвост\n`
    txt += `Дата сохранения: ${formatDate(visit.savedAt)}\n\n`
    txt += `=== ПАЦИЕНТ ===\n`
    txt += `Вид: ${visit.patient.species === 'dog' ? 'Собака' : visit.patient.species === 'cat' ? 'Кошка' : 'Другое'}\n`
    txt += `Вес: ${visit.patient.weight || '—'} кг\n`
    txt += `Дата приёма: ${visit.patient.visitDate || '—'}\n`
    txt += `Длительность приёма: ${formatDuration(visit.visitDurationMs)}\n\n`
    txt += `=== АНАМНЕЗ ===\n`
    Object.entries(visit.anamnesis).forEach(([k, v]) => {
      if (v && String(v).trim()) txt += `- ${k}: ${v}\n`
    })
    if (visit.results.aiGenerated || visit.results.preliminaryDiagnoses || visit.results.plannedExaminations) {
      txt += `\n=== ЗАКЛЮЧЕНИЕ ===\n`
      if (visit.results.aiGenerated) txt += visit.results.aiGenerated + '\n'
      if (visit.results.preliminaryDiagnoses) txt += `\nДиагнозы:\n${visit.results.preliminaryDiagnoses}\n`
      if (visit.results.plannedExaminations) txt += `\nОбследования:\n${visit.results.plannedExaminations}\n`
    }
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `protocol-${visit.patient.species}-${visit.patient.visitDate || 'visit'}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50/30 to-emerald-50/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-violet-600" />
          История приёмов
        </CardTitle>
        <CardDescription>
          Сохраняйте завершённые приёмы и возвращайтесь к ним позже.
          Все записи хранятся локально на этом устройстве.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Кнопки действий */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleSave}
            disabled={!hasData}
            className="bg-violet-600 hover:bg-violet-700 text-white"
            size="sm"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Сохранить текущий приём
          </Button>
          {visitHistory.length > 0 && (
            <Button
              onClick={() => setConfirmClear(true)}
              variant="outline"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Очистить всё
            </Button>
          )}
        </div>

        {/* Уведомление о сохранении */}
        {savedId && (
          <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
            <PawPrint className="h-4 w-4" />
            Приём сохранён в историю ✓
          </div>
        )}

        {/* Список приёмов */}
        {visitHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p>История пуста</p>
            <p className="text-xs mt-1">
              Сохраните текущий приём, чтобы он появился здесь
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {visitHistory.map((visit) => (
              <div
                key={visit.id}
                className="p-3 rounded-lg border bg-card hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      <PawPrint className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                      <span className="truncate">{visit.visitSummary || 'Приём без описания'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(visit.savedAt)}
                      </span>
                      {visit.visitDurationMs > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(visit.visitDurationMs)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      visit.patient.species === 'dog'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : visit.patient.species === 'cat'
                        ? 'bg-slate-50 text-slate-700 border-slate-200'
                        : 'bg-violet-50 text-violet-700 border-violet-200'
                    }
                  >
                    {visit.patient.species === 'dog'
                      ? '🐕'
                      : visit.patient.species === 'cat'
                      ? '🐈'
                      : '🐾'}{' '}
                    {visit.patient.weight && `${visit.patient.weight} кг`}
                  </Badge>
                </div>

                {/* Кнопки действий с записью */}
                <div className="flex gap-1.5 flex-wrap">
                  <Button
                    onClick={() => handleLoad(visit.id)}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Открыть
                  </Button>
                  <Button
                    onClick={() => exportVisit(visit)}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Экспорт
                  </Button>
                  <Button
                    onClick={() => setConfirmDelete(visit.id)}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Подсказка */}
        {visitHistory.length === 0 && hasData && (
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Совет</p>
              <p className="mt-0.5">
                После завершения приёма нажмите «Сохранить текущий приём», чтобы
                вернуться к данным позже. Это удобно при повторных визитах пациента.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Диалог подтверждения удаления записи */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить запись из истории?</DialogTitle>
            <DialogDescription>
              Это действие необратимо. Запись будет удалена навсегда.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения очистки всей истории */}
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Очистить всю историю приёмов?</DialogTitle>
            <DialogDescription>
              Будут удалены все {visitHistory.length}{' '}
              {visitHistory.length === 1 ? 'запись' : 'записей'}. Это действие необратимо.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleClearAll}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Очистить всё
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
