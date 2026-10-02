'use client'

import { useState, useEffect } from 'react'
import { useVetStore } from '@/store/vetStore'
import { PatientHeader } from '@/components/patient/PatientHeader'
import { AnamnesisForm } from '@/components/anamnesis/AnamnesisForm'
import { ExaminationChecklist } from '@/components/examination/ExaminationChecklist'
import { ResultsPanel } from '@/components/results/ResultsPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  PawPrint, ClipboardList, Stethoscope, FileCheck, ArrowRight,
  Timer, CheckCircle2, Clock,
} from 'lucide-react'
import { AuthGuard } from '@/components/auth/AuthGuard'

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

export default function Home() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  )
}

function HomeContent() {
  const activeTab = useVetStore((s) => s.activeTab)
  const setActiveTab = useVetStore((s) => s.setActiveTab)
  const anamnesis = useVetStore((s) => s.anamnesis)
  const examination = useVetStore((s) => s.examination)
  const visitStartedAt = useVetStore((s) => s.visitStartedAt)
  const visitEndedAt = useVetStore((s) => s.visitEndedAt)
  const visitDurationMs = useVetStore((s) => s.visitDurationMs)

  // Тикер обновляет таймер и часы раз в секунду — всегда активен (часы должны идти всегда)
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

  // Текущее время (часы)
  const currentTimeStr = formatClock(new Date())

  // Подсчёт заполненности для индикаторов
  const anamnesisFilled = Object.values(anamnesis).filter(
    (v) => v && String(v).trim().length > 0
  ).length
  const allExamParams = Object.values(examination).flat()
  const examFilled = allExamParams.filter((p) => p.status).length

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/20 via-sky-50/10 to-amber-50/20">
      {/* Хедер — компактный, оптимизирован для мобильных */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-emerald-100 shadow-sm safe-area-top">
        <div className="mx-auto px-3 sm:px-4 py-2.5 sm:py-3 max-w-7xl">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-1.5 sm:p-2.5 shadow-md shrink-0">
                <PawPrint className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl md:text-2xl font-bold text-emerald-800 leading-tight truncate">
                  Ассистент УшиХвост
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">
                  Ветеринарный помощник врача · Анамнез · Осмотр · Заключение
                </p>
              </div>
            </div>

            {/* Часы (текущее время) — всегда видны в шапке */}
            <div
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-mono font-semibold tabular-nums shrink-0 bg-slate-50 border-slate-200 text-slate-700"
              aria-label="Текущее время"
            >
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span>{currentTimeStr}</span>
            </div>

            {/* Таймер приёма в шапке (когда запущен или завершён) */}
            {visitStartedAt !== null && (
              <div
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-mono font-semibold tabular-nums shrink-0 ${
                  isFinished
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                    : 'bg-amber-50 border-amber-300 text-amber-800 timer-running'
                }`}
                aria-live="polite"
              >
                {isFinished ? (
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span className="hidden sm:inline">
                  {isFinished ? 'Завершён: ' : 'Идёт: '}
                </span>
                <span>{formatDuration(currentDuration)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <main className="flex-1 mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl w-full">
        <PatientHeader />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto gap-1 bg-emerald-50/40 border border-emerald-100 p-1.5 rounded-lg">
            <TabsTrigger
              value="anamnesis"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="font-medium">1. Анамнез</span>
              {anamnesisFilled > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  {anamnesisFilled}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="examination"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5"
            >
              <Stethoscope className="h-4 w-4" />
              <span className="font-medium">2. Осмотр</span>
              {examFilled > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                  {examFilled}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5"
            >
              <FileCheck className="h-4 w-4" />
              <span className="font-medium">3. Результаты</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anamnesis" className="space-y-4 mt-2">
            <AnamnesisForm />
            <div className="flex justify-end">
              <Button
                onClick={() => setActiveTab('examination')}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Перейти к осмотру <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="examination" className="space-y-4 mt-2">
            <ExaminationChecklist />
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setActiveTab('anamnesis')}
              >
                <ArrowRight className="h-4 w-4 mr-2 rotate-180" /> К анамнезу
              </Button>
              <Button
                onClick={() => setActiveTab('results')}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Перейти к результатам <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4 mt-2">
            <ResultsPanel />
            <div className="flex justify-start">
              <Button
                variant="outline"
                onClick={() => setActiveTab('examination')}
              >
                <ArrowRight className="h-4 w-4 mr-2 rotate-180" /> К осмотру
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Футер */}
      <footer className="bg-white/80 backdrop-blur border-t border-emerald-100 mt-auto pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto px-3 sm:px-4 py-3 sm:py-4 text-center text-[10px] sm:text-xs text-muted-foreground max-w-7xl">
          <p>
            <PawPrint className="inline h-3 w-3 mr-1 text-emerald-600" />
            Ассистент УшиХвост — вспомогательный инструмент врача. Окончательный диагноз и назначения — по результатам очной консультации специалиста.
          </p>
        </div>
      </footer>
    </div>
  )
}
