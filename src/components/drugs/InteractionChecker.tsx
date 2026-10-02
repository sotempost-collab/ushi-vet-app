'use client'

import { useState, useMemo } from 'react'
import {
  drugDatabase,
  checkInteractions,
  checkContraindications,
  type DrugDose,
  type PatientContraindications,
  type InteractionResult,
  type ContraindicationResult,
} from '@/data/drugDatabase'
import { useVetStore } from '@/store/vetStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Search, AlertOctagon, AlertTriangle, Info, X, Pill, Activity, ShieldAlert,
} from 'lucide-react'

export function InteractionChecker() {
  const patient = useVetStore((s) => s.patient)
  const examination = useVetStore((s) => s.examination)
  const [search, setSearch] = useState('')
  const [selectedDrugs, setSelectedDrugs] = useState<DrugDose[]>([])

  // Определяем противопоказания пациента на основе данных осмотра
  const patientContraindications: PatientContraindications = useMemo(() => {
    const result: PatientContraindications = {
      species: patient.species,
    }

    // Анализируем отклонения в осмотре
    const allParams = Object.values(examination).flat()
    const deviationValues = allParams
      .filter((p) => p.status === 'deviation')
      .map((p) => p.deviationValue.toLowerCase() + ' ' + p.notes.toLowerCase())

    const text = deviationValues.join(' ')

    if (text.includes('хбп') || text.includes('почечн') || text.includes('хпн') || text.includes('анурия') || text.includes('олигурия')) {
      result.hasRenalIssue = true
    }
    if (text.includes('печен') || text.includes('гепат') || text.includes('желтух')) {
      result.hasHepaticIssue = true
    }
    if (text.includes('хсн') || text.includes('сердечн') || text.includes('аритм') || text.includes('отёк лёгких')) {
      result.hasCardiacIssue = true
    }
    if (text.includes('обструк') || text.includes('инородн') || text.includes('заворот')) {
      result.hasGiObstruction = true
    }
    if (text.includes('судорог') || text.includes('эпилепс') || text.includes('судорож')) {
      result.hasSeizures = true
    }
    if (text.includes('кровотечен') || text.includes('анемия') || text.includes('петехии') || text.includes('мелена') || text.includes('гематурия')) {
      result.hasBleedingRisk = true
    }
    if (text.includes('беремен') || text.includes('течка') || text.includes('рожает')) {
      result.isPregnant = true
    }

    return result
  }, [patient.species, examination])

  const filteredDrugs = useMemo(() => {
    if (!search.trim()) return drugDatabase
    const q = search.toLowerCase().trim()
    return drugDatabase.filter(
      (d) =>
        d.drug.toLowerCase().includes(q) ||
        d.indication.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    )
  }, [search])

  const addDrug = (drug: DrugDose) => {
    if (!selectedDrugs.find((d) => d.drug === drug.drug)) {
      setSelectedDrugs([...selectedDrugs, drug])
    }
  }

  const removeDrug = (drug: DrugDose) => {
    setSelectedDrugs(selectedDrugs.filter((d) => d.drug !== drug.drug))
  }

  // Проверяем противопоказания
  const contraindicationResults: ContraindicationResult[] = useMemo(() => {
    return selectedDrugs.map((d) => checkContraindications(d, patientContraindications))
  }, [selectedDrugs, patientContraindications])

  // Проверяем взаимодействия
  const interactions: InteractionResult[] = useMemo(() => {
    return checkInteractions(selectedDrugs)
  }, [selectedDrugs])

  const criticalCount = interactions.filter((i) => i.severity === 'critical').length
  const warningCount = interactions.filter((i) => i.severity === 'warning').length
  const cautionCount = interactions.filter((i) => i.severity === 'caution').length
  const contraindicatedCount = contraindicationResults.filter((c) => c.contraindicated).length

  const severityConfig = {
    critical: { color: 'bg-rose-50 border-rose-300 text-rose-700', icon: AlertOctagon, label: 'Критично — НЕ комбинировать!' },
    warning: { color: 'bg-amber-50 border-amber-300 text-amber-700', icon: AlertTriangle, label: 'Предупреждение' },
    caution: { color: 'bg-sky-50 border-sky-300 text-sky-700', icon: Info, label: 'Осторожность' },
  }

  // Автоопределённые противопоказания пациента
  const detectedIssues = Object.entries(patientContraindications)
    .filter(([k, v]) => v && k !== 'species')
    .map(([k]) => {
      const labels: Record<string, string> = {
        isPuppy: 'Молодое животное (<6 мес)',
        hasRenalIssue: 'Почечная патология',
        hasHepaticIssue: 'Печёночная патология',
        hasCardiacIssue: 'Сердечная патология',
        isPregnant: 'Беременность',
        hasGiObstruction: 'Обструкция ЖКТ',
        hasSeizures: 'Судороги',
        hasBleedingRisk: 'Риск кровотечения',
      }
      return labels[k]
    })

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50/30 to-rose-50/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-violet-600" />
          Проверка взаимодействий и противопоказаний
        </CardTitle>
        <CardDescription>
          Добавьте назначенные препараты — мы автоматически проверим их совместимость
          и противопоказания на основе данных осмотра пациента.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Автоопределённые противопоказания пациента */}
        {detectedIssues.length > 0 && (
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
            <div className="text-xs font-medium text-amber-800 mb-1 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Автоопределённые особенности пациента (из осмотра):
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {detectedIssues.map((label, i) => (
                <Badge key={i} variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Поиск и добавление препаратов */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Search className="h-3 w-3" /> Поиск препарата для добавления
          </Label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Напр.: Маропитант, Мелоксикам, Амоксициллин…"
              className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Список для добавления */}
          <div className="border rounded-md max-h-48 overflow-y-auto">
            {filteredDrugs.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                Ничего не найдено
              </div>
            ) : (
              filteredDrugs.slice(0, 15).map((drug) => {
                // Если уже выбран — не показываем
                if (selectedDrugs.find((d) => d.drug === drug.drug)) return null
                return (
                  <button
                    key={drug.drug}
                    type="button"
                    onClick={() => addDrug(drug)}
                    className="w-full text-left px-3 py-2 hover:bg-accent/20 transition-colors border-b last:border-b-0 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{drug.drug}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {drug.category}
                      </div>
                    </div>
                    <Pill className="h-4 w-4 text-violet-500 shrink-0" />
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Выбранные препараты */}
        {selectedDrugs.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-md">
            Добавьте препараты для проверки взаимодействий
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs">Назначенные препараты ({selectedDrugs.length})</Label>
            <div className="space-y-1.5">
              {selectedDrugs.map((drug) => {
                const contra = contraindicationResults.find((c) => c.drug.drug === drug.drug)!
                return (
                  <div
                    key={drug.drug}
                    className={`p-2.5 rounded-md border flex items-start justify-between gap-2 ${
                      contra.contraindicated
                        ? 'bg-rose-50 border-rose-300'
                        : 'bg-card border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{drug.drug}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {drug.category}
                      </div>
                      {contra.contraindicated && (
                        <div className="text-xs text-rose-700 mt-1 flex items-start gap-1.5">
                          <AlertOctagon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-medium">Противопоказан!</div>
                            <ul className="list-disc pl-4 mt-0.5">
                              {contra.reasons.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDrug(drug)}
                      className="text-muted-foreground hover:text-rose-600 p-1 rounded shrink-0"
                      title="Убрать препарат"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Сводка по результатам проверки */}
        {selectedDrugs.length >= 2 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-3 rounded-md border text-center ${
                criticalCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'
              }`}>
                <div className={`text-2xl font-bold ${
                  criticalCount > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {criticalCount}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Критичных комбинаций
                </div>
              </div>
              <div className={`p-3 rounded-md border text-center ${
                contraindicatedCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300'
              }`}>
                <div className={`text-2xl font-bold ${
                  contraindicatedCount > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {contraindicatedCount}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Противопоказаний пациенту
                </div>
              </div>
            </div>

            {/* Список взаимодействий */}
            {interactions.length === 0 ? (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
                ✅ Опасных взаимодействий между выбранными препаратами не найдено.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Обнаруженные взаимодействия:
                </div>
                {interactions.map((inter, i) => {
                  const config = severityConfig[inter.severity]
                  const Icon = config.icon
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-md border ${config.color}`}
                    >
                      <div className="flex items-start gap-2">
                        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-sm mb-0.5">
                            {inter.drug1.drug.split(' ')[0]} + {inter.drug2.drug.split(' ')[0]}
                          </div>
                          <div className="text-xs font-medium mb-1">
                            {config.label}
                          </div>
                          <div className="text-xs text-current opacity-90">
                            {inter.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {selectedDrugs.length === 1 && (
          <div className="p-3 rounded-md bg-sky-50 border border-sky-200 text-xs text-sky-700 flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            Для проверки взаимодействий добавьте как минимум 2 препарата.
          </div>
        )}

        <div className="text-xs text-muted-foreground italic mt-2">
          💡 Список взаимодействий основан на типовых ветеринарных справочниках.
          Решение о назначении всегда принимает врач с учётом клинической картины.
        </div>
      </CardContent>
    </Card>
  )
}
