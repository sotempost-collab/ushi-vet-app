'use client'

import { useState, useEffect } from 'react'
import { useVetStore } from '@/store/vetStore'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  PawPrint, Weight, Calendar, Clock, CheckCircle2, Dog, Cat, Timer, PlayCircle, RotateCcw
} from 'lucide-react'

// Хук для тика таймера (1 раз в секунду) — нужен и для таймера, и для часов
function useTicker(active: boolean) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [active])
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

function formatClock(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function PatientHeader() {
  const patient = useVetStore((s) => s.patient)
  const setPatient = useVetStore((s) => s.setPatient)
  const startVisit = useVetStore((s) => s.startVisit)
  const stopVisit = useVetStore((s) => s.stopVisit)
  const visitStartedAt = useVetStore((s) => s.visitStartedAt)
  const visitEndedAt = useVetStore((s) => s.visitEndedAt)
  const visitDurationMs = useVetStore((s) => s.visitDurationMs)
  const resetAll = useVetStore((s) => s.resetAll)

  // Тикер обновляет таймер и часы раз в секунду
  // Активен всегда — часы должны тикать независимо
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const currentDuration =
    visitEndedAt !== null
      ? visitDurationMs
      : visitStartedAt !== null
      ? Date.now() - visitStartedAt
      : 0

  const isFinished = visitEndedAt !== null
  const isRunning = visitStartedAt !== null && !isFinished
  const isNotStarted = visitStartedAt === null && !isFinished

  // Текущее время в реальных часах
  const currentTime = new Date()
  const currentTimeStr = formatClock(currentTime)

  // Авто-старт при первом вводе данных — убираем, теперь запуск только кнопкой
  const handleChange = (field: keyof typeof patient, value: string) => {
    setPatient({ [field]: value } as Partial<typeof patient>)
  }

  const handleStartVisit = () => {
    startVisit()
  }

  const handleFinish = () => {
    if (!visitStartedAt) {
      alert('Приём ещё не начат. Сначала нажмите «Начать приём».')
      return
    }
    if (confirm('Закончить приём? Таймер будет остановлен, и вы увидите итоговое время.')) {
      stopVisit()
    }
  }

  const handleStartNew = () => {
    if (visitStartedAt && !isFinished) {
      if (!confirm('Прервать текущий приём и начать новый? Все данные будут потеряны.')) {
        return
      }
    }
    resetAll()
  }

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-amber-50/30">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-600 p-2">
              <PawPrint className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-base sm:text-lg leading-tight">Данные пациента</h2>
              <p className="text-xs text-muted-foreground">
                Основная информация о животном
              </p>
            </div>
          </div>

          {/* Часы + Таймер приёма */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Текущее время (часы) — видно всегда */}
            <div
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-mono font-semibold tabular-nums bg-slate-50 border-slate-200 text-slate-700"
              title="Текущее время"
              aria-label="Текущее время"
            >
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span>{currentTimeStr}</span>
            </div>

            {/* Таймер приёма */}
            {(isRunning || isFinished) && (
              <div
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-mono font-semibold tabular-nums ${
                  isFinished
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                    : 'bg-amber-50 border-amber-300 text-amber-800 timer-running'
                }`}
                aria-live="polite"
                aria-atomic="true"
              >
                {isFinished ? (
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span>
                  {isFinished
                    ? `Завершён: ${formatDuration(currentDuration)}`
                    : `Идёт: ${formatDuration(currentDuration)}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Поля: вид, вес, дата */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              {patient.species === 'dog' ? (
                <Dog className="h-3 w-3" />
              ) : patient.species === 'cat' ? (
                <Cat className="h-3 w-3" />
              ) : (
                <PawPrint className="h-3 w-3" />
              )}
              Вид животного
            </Label>
            <Select
              value={patient.species}
              onValueChange={(v) => handleChange('species', v as typeof patient.species)}
              disabled={isFinished} // блокируем только когда приём завершён
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Выберите вид" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dog">🐕 Собака</SelectItem>
                <SelectItem value="cat">🐈 Кошка</SelectItem>
                <SelectItem value="other">🐾 Другое</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Weight className="h-3 w-3" /> Вес (кг)
            </Label>
            <Input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={patient.weight}
              onChange={(e) => handleChange('weight', e.target.value)}
              placeholder="12.5"
              disabled={isFinished}
              className={`h-10 ${!patient.weight ? 'border-amber-400 bg-amber-50' : ''}`}
              title={!patient.weight ? '⚠️ Укажите вес пациента — без него расчёт дозировок в заключении невозможен' : ''}
            />
            {!patient.weight && (
              <div className="text-[10px] text-amber-700 leading-tight">
                ⚠️ Укажите вес — без него AI не сможет рассчитать дозы
              </div>
            )}
          </div>

          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Дата приёма
            </Label>
            <Input
              type="date"
              value={patient.visitDate}
              onChange={(e) => handleChange('visitDate', e.target.value)}
              disabled={isFinished}
              className="h-10"
            />
          </div>
        </div>

        {/* Кнопки управления приёмом */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {isNotStarted && (
            <Button
              onClick={handleStartVisit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <PlayCircle className="h-4 w-4 mr-1.5" />
              Начать приём
            </Button>
          )}

          {isRunning && (
            <Button
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Закончить приём
            </Button>
          )}

          {isFinished && (
            <>
              <Button
                onClick={handleStartNew}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
              <PawPrint className="h-4 w-4 mr-1.5" />
              Новый приём
            </Button>
              <Button
                onClick={() => {
                  if (confirm('Сбросить ВСЕ данные текущего приёма?\n\nБудут очищены:\n• Данные пациента\n• Анамнез\n• Осмотр по системам\n• Аускультация сердца\n• Загруженные исследования\n• Голосовые заметки\n• Результаты и AI-заключение\n\nЭто действие необратимо.')) {
                    resetAll()
                  }
                }}
                variant="outline"
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-300"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Сброс
              </Button>
            </>
          )}

          {isFinished && (
            <div className="flex items-center text-xs text-muted-foreground ml-auto self-center px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200">
              <Clock className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              <span className="font-medium">
                Длительность: {formatDuration(currentDuration)}
              </span>
            </div>
          )}
        </div>

        {/* Подсказка до старта приёма */}
        {isNotStarted && (
          <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
            <Timer className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Нажмите «Начать приём»</span>, чтобы запустить
              таймер. Данные пациента и анамнез будут доступны для заполнения после старта.
            </div>
          </div>
        )}

        {/* Плашка после завершения приёма */}
        {isFinished && (
          <div className="mt-3 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-sm">
            <p className="text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Приём завершён</span>
            </p>
            <p className="text-emerald-700 text-xs mt-1">
              Нажмите <strong>«Новый приём»</strong> для следующего пациента или <strong>«Сброс»</strong> для полной очистки карты.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
