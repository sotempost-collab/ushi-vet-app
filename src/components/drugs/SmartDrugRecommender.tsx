'use client'

import { useState, useMemo } from 'react'
import {
  drugDatabase,
  findDrugsByKeywords,
  checkContraindications,
  calculateDose,
  type DrugDose,
  type PatientContraindications,
} from '@/data/drugDatabase'
import { useVetStore } from '@/store/vetStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Search, Lightbulb, AlertCircle, Pill, Calculator, CheckCircle2, X,
} from 'lucide-react'

// Извлечение ключевых слов из анамнеза и осмотра для подбора препаратов
function extractKeywords(
  anamnesis: Record<string, string>,
  examination: Record<string, Array<{ status: string; deviationValue: string; notes: string; name: string }>>,
): string[] {
  const keywords = new Set<string>()

  // Из главной жалобы
  const mainComplaint = anamnesis.mainComplaint || ''
  if (mainComplaint) keywords.add(mainComplaint.toLowerCase())

  // Из опроса по системам
  const systemFields = [
    'generalStatus', 'coughDyspnea', 'polyuriaPolydipsia',
    'appetiteGi', 'urogenital', 'skin', 'nervous', 'musculoskeletal',
  ]
  for (const field of systemFields) {
    const v = anamnesis[field] || ''
    if (v) keywords.add(v.toLowerCase())
  }

  // Из отклонений осмотра
  for (const systemId in examination) {
    const params = examination[systemId] || []
    for (const p of params) {
      if (p.status === 'deviation') {
        keywords.add(p.deviationValue.toLowerCase())
        if (p.notes) keywords.add(p.notes.toLowerCase())
      }
    }
  }

  // Также добавим название системы, где есть отклонения
  for (const systemId in examination) {
    const params = examination[systemId] || []
    const hasDeviation = params.some((p) => p.status === 'deviation')
    if (hasDeviation) {
      keywords.add(systemId.toLowerCase())
    }
  }

  // Нормализуем — разбиваем на отдельные слова
  const result = new Set<string>()
  for (const text of keywords) {
    // Извлекаем ключевые медицинские термины
    const medicalTerms = [
      'рвота', 'диарея', 'понос', 'лихорадка', 'температура', 'кашель', 'одышка',
      'дегидратация', 'обезвоживание', 'шок', 'боль', 'воспаление',
      'инфекция', 'анемия', 'кровотечение', 'гипертензия', 'гипертония',
      'отёк лёгких', 'хсн', 'сердечная', 'язва', 'гастрит', 'панкреатит',
      'артрит', 'хромота', 'судороги', 'эпилепсия', 'зуд', 'аллергия',
      'рвота после еды', 'анорексия', 'отказ от корма', 'запор',
      'цистит', 'мочевые', 'кожа', 'пиодерма', 'отит',
      'обструкция', 'инородное тело', 'хбп', 'пнк', 'почечная',
      'беременность', 'течка', 'псевдобеременность',
    ]
    for (const term of medicalTerms) {
      if (text.includes(term)) {
        result.add(term)
      }
    }
  }

  return Array.from(result)
}

export function SmartDrugRecommender() {
  const patient = useVetStore((s) => s.patient)
  const anamnesis = useVetStore((s) => s.anamnesis)
  const examination = useVetStore((s) => s.examination)
  const results = useVetStore((s) => s.results)
  const setResults = useVetStore((s) => s.setResults)

  const [generatedKeywords, setGeneratedKeywords] = useState<string[]>([])
  const [recommendedDrugs, setRecommendedDrugs] = useState<DrugDose[]>([])

  // Противопоказания пациента (упрощённая версия для подбора)
  const patientContras: PatientContraindications = useMemo(() => {
    const allParams = Object.values(examination).flat()
    const text = allParams
      .filter((p) => p.status === 'deviation')
      .map((p) => (p.deviationValue + ' ' + p.notes).toLowerCase())
      .join(' ')

    return {
      species: patient.species,
      hasRenalIssue: /хбп|почечн|хпн|анурия|олигурия/.test(text),
      hasHepaticIssue: /печен|гепат|желтух/.test(text),
      hasCardiacIssue: /хсн|сердечн|аритм|отёк лёгких/.test(text),
      hasGiObstruction: /обструк|инородн|заворот/.test(text),
      hasSeizures: /судорог|эпилепс/.test(text),
      hasBleedingRisk: /кровотеч|анемия|петехии|мелена|гематурия/.test(text),
      isPregnant: /беремен|течка|рожает/.test(text),
    }
  }, [patient.species, examination])

  // Авто-генерация подбора
  const handleGenerate = () => {
    const keywords = extractKeywords(
      anamnesis as unknown as Record<string, string>,
      examination as unknown as Record<string, Array<{ status: string; deviationValue: string; notes: string; name: string }>>,
    )
    setGeneratedKeywords(keywords)

    if (keywords.length === 0) {
      alert('Недостаточно данных. Заполните анамнез (главная жалоба) и отметьте отклонения в осмотре.')
      return
    }

    const drugs = findDrugsByKeywords(keywords, { species: patient.species })
    setRecommendedDrugs(drugs)
  }

  // Применить препарат — добавляет его в ручное поле предварительных назначений
  const handleApplyToPrescriptions = (drug: DrugDose) => {
    const weightKg = parseFloat(patient.weight) || 0
    const dose = calculateDose(drug, weightKg)
    const doseText = weightKg > 0
      ? `${drug.dosePerKg} мг/кг × ${weightKg} кг = ${dose.displayPerDose}`
      : `${drug.dosePerKg} мг/кг (укажите вес для расчёта)`

    const drugText = `• ${drug.drug} — ${doseText} — ${drug.frequency} — ${drug.route} — показание: ${drug.indication}\n  Способ применения: ${drug.notes || '-'}\n  Противопоказания: ${drug.contraindications || '-'}\n`

    const currentText = results.preliminaryPrescriptions || ''
    setResults({
      preliminaryPrescriptions: currentText + (currentText ? '\n' : '') + drugText,
    })
  }

  // Авто-генерация при изменении данных (через useMemo без побочных эффектов)
  const autoKeywords = useMemo(() => {
    const allParams = Object.values(examination).flat()
    const hasDeviations = allParams.some((p) => p.status === 'deviation')
    if (!hasDeviations || !patient.weight) return []
    const keywords = extractKeywords(
      anamnesis as unknown as Record<string, string>,
      examination as unknown as Record<string, Array<{ status: string; deviationValue: string; notes: string; name: string }>>,
    )
    return keywords
  }, [examination, patient.weight, anamnesis])

  const autoDrugs = useMemo(() => {
    if (autoKeywords.length === 0) return []
    return findDrugsByKeywords(autoKeywords, { species: patient.species })
  }, [autoKeywords, patient.species])

  // Используем либо автоматически вычисленные, либо вручную сгенерированные
  const displayKeywords = generatedKeywords.length > 0 ? generatedKeywords : autoKeywords
  const displayDrugs = recommendedDrugs.length > 0 ? recommendedDrugs : autoDrugs

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-sky-50/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-emerald-600" />
          Автоматический подбор препаратов
        </CardTitle>
        <CardDescription>
          AI подбирает 3-7 препаратов на основе анамнеза, отклонений в осмотре и вида пациента.
          Каждый препарат можно добавить в «Предварительные назначения» одним кликом.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Кнопка генерации */}
        <Button
          onClick={handleGenerate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Search className="h-4 w-4 mr-1.5" />
          Подобрать препараты по клинической картине
        </Button>

        {/* Найденные ключевые слова */}
        {displayKeywords.length > 0 && (
          <div>
            <Label className="text-xs mb-1 block">Найденные симптомы/состояния:</Label>
            <div className="flex flex-wrap gap-1.5">
              {displayKeywords.map((kw, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300"
                >
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Список рекомендованных препаратов */}
        {displayDrugs.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Рекомендованные препараты ({displayDrugs.length})</Label>
            <div className="space-y-2">
              {displayDrugs.map((drug) => {
                const contra = checkContraindications(drug, patientContras)
                const dose = calculateDose(drug, parseFloat(patient.weight) || 0)
                return (
                  <div
                    key={drug.drug}
                    className={`p-3 rounded-md border ${
                      contra.contraindicated
                        ? 'bg-rose-50 border-rose-300'
                        : 'bg-card border-emerald-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm flex items-center gap-1.5 flex-wrap">
                          <Pill className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          {drug.drug}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {drug.indication}
                        </div>
                      </div>
                      {contra.contraindicated && (
                        <Badge className="bg-rose-100 text-rose-700 border border-rose-300 text-xs shrink-0">
                          <AlertCircle className="h-3 w-3 mr-1" /> Противопоказан
                        </Badge>
                      )}
                    </div>

                    {/* Краткая дозировка */}
                    <div className="grid grid-cols-3 gap-1.5 text-xs mb-2">
                      <div className="p-1.5 rounded bg-sky-50 border border-sky-200">
                        <div className="text-sky-700 font-medium">Дозировка</div>
                        <div className="text-sky-900 mt-0.5">{drug.dosePerKg} мг/кг</div>
                      </div>
                      <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200">
                        <div className="text-emerald-700 font-medium">Кратность</div>
                        <div className="text-emerald-900 mt-0.5">{drug.frequency}</div>
                      </div>
                      <div className="p-1.5 rounded bg-violet-50 border border-violet-200">
                        <div className="text-violet-700 font-medium">Путь</div>
                        <div className="text-violet-900 mt-0.5 text-xs">{drug.route}</div>
                      </div>
                    </div>

                    {/* Расчёт по весу */}
                    {patient.weight && parseFloat(patient.weight) > 0 && (
                      <div className="p-2 rounded bg-emerald-100 border border-emerald-300 mb-2 flex items-center gap-1.5">
                        <Calculator className="h-3.5 w-3.5 text-emerald-700" />
                        <span className="text-xs text-emerald-800 font-medium">
                          Расчёт для {patient.weight} кг:
                        </span>
                        <span className="text-xs text-emerald-900 font-semibold">
                          {dose.displayPerDose} на приём · {dose.displayPerDay} в сутки
                        </span>
                        {dose.warningMax && (
                          <div className="text-xs text-rose-700 ml-2">{dose.warningMax}</div>
                        )}
                      </div>
                    )}

                    {/* Противопоказания */}
                    {contra.contraindicated && (
                      <div className="p-2 rounded bg-rose-50 border border-rose-200 mb-2 text-xs text-rose-700">
                        <div className="font-medium flex items-center gap-1 mb-0.5">
                          <AlertCircle className="h-3.5 w-3.5" /> Противопоказания для данного пациента:
                        </div>
                        <ul className="list-disc pl-4">
                          {contra.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Действия */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApplyToPrescriptions(drug)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                        disabled={contra.contraindicated}
                      >
                        {contra.contraindicated ? (
                          <>
                            <X className="h-3 w-3 mr-1" /> Противопоказан — нельзя
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Добавить в назначения
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Способ применения и противопоказания (раскрыто) */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      {drug.notes && (
                        <div className="mt-1">
                          <span className="font-medium text-slate-700">Применение:</span> {drug.notes}
                        </div>
                      )}
                      {drug.contraindications && !contra.contraindicated && (
                        <div className="mt-1">
                          <span className="font-medium text-rose-700">Противопоказания:</span> {drug.contraindications}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {displayDrugs.length === 0 && displayKeywords.length === 0 && (
          <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-sm text-muted-foreground flex items-start gap-2">
            <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <span className="font-medium text-slate-700">Как это работает:</span>
              заполните анамнез (главная жалоба, опрос по системам) и отметьте отклонения в осмотре.
              Подбор запускается автоматически или по кнопке выше.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
