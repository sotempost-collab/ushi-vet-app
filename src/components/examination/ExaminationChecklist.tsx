'use client'

import { useEffect, useState, useMemo } from 'react'
import { useVetStore } from '@/store/vetStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { examinationSystems, getNormalForSpecies, type ExaminationParam } from '@/data/examinationData'
import { HeartAuscultation } from './HeartAuscultation'
import { ScanUploader } from './ScanUploader'
import { VoiceNotes } from './VoiceNotes'
import * as Icons from 'lucide-react'
import { CheckCircle2, CircleDot, AlertCircle, MinusCircle, Info, Dog, Cat } from 'lucide-react'

const statusLabels: Record<string, { label: string; color: string }> = {
  normal: { label: 'Норма', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  deviation: { label: 'Отклонение', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  not_evaluated: { label: 'Не оценено', color: 'bg-slate-100 text-slate-500 border-slate-300' },
}

export function ExaminationChecklist() {
  const examination = useVetStore((s) => s.examination)
  const updateParameter = useVetStore((s) => s.updateExaminationParameter)
  const patientSpecies = useVetStore((s) => s.patient.species)

  const [activeSystem, setActiveSystem] = useState(examinationSystems[0].id)

  // Инициализация examination при первом рендере
  useEffect(() => {
    if (Object.keys(examination).length === 0) {
      const initial: Record<string, typeof examinationSystems[0]['params']> = {}
      for (const system of examinationSystems) {
        initial[system.id] = system.params.map((p) => ({
          id: p.id,
          name: p.name,
          normalValue: '',
          status: '',
          deviationValue: '',
          notes: '',
        }))
      }
      useVetStore.setState((state) => ({ examination: { ...state.examination, ...initial } }))
    }
  }, [examination])

  const currentSystem = examinationSystems.find((s) => s.id === activeSystem)!
  const currentSystemParams = examination[activeSystem] || []

  // Подсчёт прогресса
  const allParams = Object.values(examination).flat()
  const totalParams = allParams.length
  const evaluatedParams = allParams.filter((p) => p.status).length
  const deviationParams = allParams.filter((p) => p.status === 'deviation').length
  const normalParams = allParams.filter((p) => p.status === 'normal').length

  const speciesLabel = patientSpecies === 'dog' ? 'собаки' : patientSpecies === 'cat' ? 'кошки' : 'животного'
  const SpeciesIcon = patientSpecies === 'dog' ? Dog : patientSpecies === 'cat' ? Cat : Info

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span>Протокол первичного осмотра</span>
            <div className="flex items-center gap-2 text-sm font-normal">
              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Норма: {normalParams}
              </Badge>
              <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-300">
                <AlertCircle className="h-3.5 w-3.5 mr-1" /> Отклонения: {deviationParams}
              </Badge>
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                <CircleDot className="h-3.5 w-3.5 mr-1" /> Оценено: {evaluatedParams}/{totalParams}
              </Badge>
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                <SpeciesIcon className="h-3.5 w-3.5 mr-1" /> Нормы: {speciesLabel}
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Посистемный осмотр. Нормы автоматически адаптированы под вид пациента.
            Для каждого параметра: норма и показатель нормы, отклонение и показатель при отклонении.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeSystem} onValueChange={setActiveSystem}>
        <TabsList className="flex w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {examinationSystems.map((system) => {
            const params = examination[system.id] || []
            const evaluatedCount = params.filter((p) => p.status).length
            const deviationCount = params.filter((p) => p.status === 'deviation').length
            const IconComp = (Icons as unknown as Record<string, Icons.LucideIcon>)[system.icon] || Icons.Circle
            return (
              <TabsTrigger
                key={system.id}
                value={system.id}
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <IconComp className="h-4 w-4" />
                <span className="hidden lg:inline">{system.name}</span>
                <span className="lg:hidden">{system.name.split(' ')[0]}</span>
                {evaluatedCount > 0 && (
                  <Badge
                    variant="outline"
                    className={`ml-1 h-5 px-1.5 text-xs ${
                      deviationCount > 0
                        ? 'bg-rose-100 text-rose-700 border-rose-300'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    }`}
                  >
                    {evaluatedCount}/{params.length}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {examinationSystems.map((system) => (
          <TabsContent key={system.id} value={system.id} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {(() => {
                    const IconComp = (Icons as unknown as Record<string, Icons.LucideIcon>)[system.icon] || Icons.Circle
                    return <IconComp className="h-5 w-5 text-emerald-600" />
                  })()}
                  {system.name}
                </CardTitle>
                {system.description && (
                  <CardDescription className="text-foreground/70">
                    {system.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {(examination[system.id] || []).map((param, idx) => {
                  const systemParam = system.params.find((p) => p.id === param.id)!
                  // Видоспецифичная норма
                  const normalForSpecies = getNormalForSpecies(systemParam, patientSpecies)
                  // Описание выбранного отклонения
                  const selectedDeviation = systemParam.deviationOptions.find(
                    (opt) => opt.value === param.deviationValue
                  )
                  // 🆕 Множественный выбор отклонений
                  const selectedDeviations = param.deviationValue
                    ? param.deviationValue.split(';').map((v) => v.trim()).filter(Boolean)
                    : []
                  const toggleDeviation = (value: string) => {
                    const current = selectedDeviations.includes(value)
                      ? selectedDeviations.filter((v) => v !== value)
                      : [...selectedDeviations, value]
                    updateParameter(system.id, param.id, {
                      deviationValue: current.join('; '),
                    })
                  }
                  return (
                    <div
                      key={param.id}
                      className="grid gap-3 md:grid-cols-12 p-3 rounded-lg border bg-card hover:bg-accent/20 transition-colors"
                    >
                      {/* Левая — параметр и видоспецифичная норма */}
                      <div className="md:col-span-4 space-y-1.5">
                        <Label className="font-semibold">
                          {idx + 1}. {param.name}
                          {systemParam.unit && (
                            <span className="text-muted-foreground font-normal text-xs ml-1">
                              ({systemParam.unit})
                            </span>
                          )}
                        </Label>
                        {systemParam.description && (
                          <div className="text-xs text-muted-foreground italic">
                            {systemParam.description}
                          </div>
                        )}
                        <div className="text-xs p-2 rounded bg-emerald-50 border border-emerald-200">
                          <div className="font-medium text-emerald-700 flex items-center gap-1">
                            <SpeciesIcon className="h-3 w-3" /> Норма ({speciesLabel}):
                          </div>
                          <div className="text-emerald-700 mt-0.5">{normalForSpecies}</div>
                        </div>
                      </div>

                      {/* Средняя — статус и выбор отклонения */}
                      <div className="md:col-span-5 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={param.status === 'normal' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              updateParameter(system.id, param.id, { status: 'normal', deviationValue: '' })
                            }
                            className={
                              param.status === 'normal'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Норма
                          </Button>
                          <Button
                            type="button"
                            variant={param.status === 'deviation' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              updateParameter(system.id, param.id, { status: 'deviation' })
                            }
                            className={
                              param.status === 'deviation'
                                ? 'bg-rose-600 hover:bg-rose-700'
                                : 'hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                            }
                          >
                            <AlertCircle className="h-3.5 w-3.5 mr-1" /> Отклонение
                          </Button>
                          <Button
                            type="button"
                            variant={param.status === 'not_evaluated' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              updateParameter(system.id, param.id, { status: 'not_evaluated', deviationValue: '' })
                            }
                            className={
                              param.status === 'not_evaluated'
                                ? 'bg-slate-600 hover:bg-slate-700'
                                : 'hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300'
                            }
                          >
                            <MinusCircle className="h-3.5 w-3.5 mr-1" /> Не оценено
                          </Button>
                        </div>

                        {param.status === 'deviation' && (
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground">
                              Выберите варианты отклонений (можно несколько):
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto p-2 rounded-md border border-rose-200 bg-rose-50/30">
                              {systemParam.deviationOptions.map((opt) => {
                                const isSelected = selectedDeviations.includes(opt.value)
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => toggleDeviation(opt.value)}
                                    className={`text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                                      isSelected
                                        ? 'bg-rose-600 text-white border-rose-700'
                                        : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-100'
                                    }`}
                                    title={opt.description}
                                  >
                                    {isSelected && '✓ '}{opt.value}
                                  </button>
                                )
                              })}
                            </div>
                            {selectedDeviations.length > 0 && (
                              <div className="text-xs p-2 rounded bg-rose-50 border border-rose-200 space-y-1">
                                <div className="font-medium text-rose-700">
                                  Описание отклонений:
                                </div>
                                {selectedDeviations.map((selValue) => {
                                  const opt = systemParam.deviationOptions.find((o) => o.value === selValue)
                                  return (
                                    <div key={selValue} className="text-rose-700">
                                      <span className="font-medium">{selValue}:</span> {opt?.description}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            <Textarea
                              placeholder="Дополнительные показатели (напр.: ЧСС 180, ритм неправильный, ВРТ 4 с)"
                              value={param.notes}
                              onChange={(e) => updateParameter(system.id, param.id, { notes: e.target.value })}
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>

                      {/* Правая — текущее состояние */}
                      <div className="md:col-span-3">
                        {param.status === 'normal' && (
                          <div className="text-sm p-2 rounded-md bg-emerald-50 border border-emerald-200 h-full">
                            <div className="font-medium text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Норма ({speciesLabel})
                            </div>
                            <div className="text-xs text-emerald-700 mt-0.5">{normalForSpecies}</div>
                          </div>
                        )}
                        {param.status === 'deviation' && (
                          <div className="text-sm p-2 rounded-md bg-rose-50 border border-rose-200 h-full overflow-hidden">
                            <div className="font-medium text-rose-700 flex items-center gap-1">
                              <AlertCircle className="h-3.5 w-3.5" /> Отклонение ({selectedDeviations.length})
                            </div>
                            {selectedDeviations.length > 0 && (
                              <div className="text-xs text-rose-700 mt-1 space-y-0.5">
                                {selectedDeviations.map((val, i) => (
                                  <div key={i} className="font-medium">{val}</div>
                                ))}
                              </div>
                            )}
                            {selectedDeviations.length > 0 && (
                              <div className="text-xs text-rose-600 mt-1 space-y-1">
                                {selectedDeviations.slice(0, 3).map((selValue) => {
                                  const opt = systemParam.deviationOptions.find((o) => o.value === selValue)
                                  return (
                                    <div key={selValue} className="line-clamp-2">
                                      {opt?.description}
                                    </div>
                                  )
                                })}
                                {selectedDeviations.length > 3 && (
                                  <div className="text-rose-400 italic">+{selectedDeviations.length - 3} ещё</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {param.status === 'not_evaluated' && (
                          <div className="text-sm p-2 rounded-md bg-slate-50 border border-slate-200 h-full">
                            <div className="font-medium text-slate-600 flex items-center gap-1">
                              <MinusCircle className="h-3.5 w-3.5" /> Не оценено
                            </div>
                          </div>
                        )}
                        {!param.status && (
                          <div className="text-sm p-2 rounded-md bg-muted/30 border border-dashed text-muted-foreground text-center h-full flex items-center justify-center">
                            Выберите статус
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Специальные модули для сердечно-сосудистой системы */}
      <HeartAuscultation />

      {/* Модуль загрузки сканов с OCR */}
      <ScanUploader />

      {/* 🆕 Голосовые заметки при осмотре (микрофон → текст) */}
      <VoiceNotes />
    </div>
  )
}
