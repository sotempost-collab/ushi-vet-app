'use client'

import { useState, useMemo } from 'react'
import { useVetStore } from '@/store/vetStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  drugDatabase, drugCategories, calculateDose, calculateIVInfusion,
  type DrugDose, type DoseMode,
} from '@/data/drugDatabase'
import {
  Pill, Search, Syringe, Stethoscope, AlertCircle, Calculator,
  Droplet, Activity,
} from 'lucide-react'

// Получение полного списка препаратов (база + пользовательские)
function useAllDrugs(): DrugDose[] {
  const customDrugs = useVetStore((s) => s.customDrugs)
  return useMemo(() => {
    const customTyped = customDrugs.map((d) => ({
      ...d,
      isCustom: true,
    })) as DrugDose[]
    return [...drugDatabase, ...customTyped]
  }, [customDrugs])
}

export function DrugDoseCalculator() {
  const patientWeight = useVetStore((s) => s.patient.weight)
  const patientSpecies = useVetStore((s) => s.patient.species)
  const allDrugs = useAllDrugs()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [customWeight, setCustomWeight] = useState('')
  const [showCustomOnly, setShowCustomOnly] = useState(false)

  const weightKg = parseFloat(customWeight || patientWeight) || 0
  const hasWeight = weightKg > 0

  const allCategories = useMemo(() => {
    const cats = new Set<string>(drugCategories)
    allDrugs.forEach((d) => cats.add(d.category))
    return Array.from(cats)
  }, [allDrugs])

  const filteredDrugs = useMemo(() => {
    let list = allDrugs
    if (showCustomOnly) {
      list = list.filter((d) => (d as any).isCustom)
    }
    if (categoryFilter !== 'all') {
      list = list.filter((d) => d.category === categoryFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (d) =>
          d.drug.toLowerCase().includes(q) ||
          d.indication.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
      )
    }
    return list
  }, [search, categoryFilter, allDrugs, showCustomOnly])

  const customCount = allDrugs.filter((d) => (d as any).isCustom).length

  return (
    <Card className="border-sky-200 bg-gradient-to-br from-sky-50/30 to-emerald-50/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-sky-600" />
          Калькулятор дозировок препаратов
          {customCount > 0 && (
            <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-300">
              +{customCount} моих
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          База препаратов с расчётом дозы по весу пациента.
          Поддержка лечебной и профилактической дозы, а также в/в инфузий.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Поле веса пациента */}
        <div className="grid gap-3 sm:grid-cols-2 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Calculator className="h-3 w-3" />
              Вес пациента (кг)
              {patientWeight && !customWeight && (
                <span className="text-muted-foreground">
                  · из шапки: {patientWeight} кг
                </span>
              )}
            </Label>
            <Input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={customWeight || patientWeight}
              onChange={(e) => setCustomWeight(e.target.value)}
              placeholder="Напр.: 12.5"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Вид пациента</Label>
            <div className="text-sm font-medium text-emerald-700 py-1.5">
              {patientSpecies === 'dog'
                ? '🐕 Собака'
                : patientSpecies === 'cat'
                ? '🐈 Кошка'
                : '🐾 Другое'}
            </div>
          </div>
        </div>

        {/* Предупреждение для кошек */}
        {patientSpecies === 'cat' && (
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Внимание для кошек!</span> У кошек
              метаболизм отличается от собак. Внимательно проверяйте противопоказания.
              <span className="font-medium text-rose-700"> Парацетамол категорически нельзя кошкам!</span>
            </div>
          </div>
        )}

        {/* Поиск и фильтр */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск: название, показание, категория…"
              className="pl-8 h-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              {allCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Переключатель: только мои (пользовательские) препараты */}
        {customCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              id="show-custom-only"
              checked={showCustomOnly}
              onChange={(e) => setShowCustomOnly(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <label htmlFor="show-custom-only" className="text-muted-foreground cursor-pointer">
              Показать только мои препараты ({customCount})
            </label>
          </div>
        )}

        {/* Если вес не указан — предупреждение */}
        {!hasWeight && (
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Введите вес пациента в шапке или в поле выше, чтобы получить расчёт дозы.
              Сейчас показаны только справочные мг/кг.
            </div>
          </div>
        )}

        {/* Список препаратов */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredDrugs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Ничего не найдено. Измените запрос или категорию.
            </div>
          ) : (
            filteredDrugs.map((drug) => (
              <DrugCard
                key={drug.drug}
                drug={drug}
                weightKg={weightKg}
                species={patientSpecies}
              />
            ))
          )}
        </div>

        {/* Дисклеймер */}
        <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
          <Stethoscope className="h-4 w-4 shrink-0 mt-0.5 text-slate-500" />
          <div>
            Дозировки приведены из открытых ветеринарных справочников и могут
            отличаться в зависимости от производителя, формы выпуска и состояния
            пациента. <span className="font-medium">Окончательную дозировку определяет врач.</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DrugCard({
  drug,
  weightKg,
  species,
}: {
  drug: DrugDose
  weightKg: number
  species: 'dog' | 'cat' | 'other'
}) {
  const [expanded, setExpanded] = useState(false)
  const [doseMode, setDoseMode] = useState<DoseMode>('therapeutic')
  const [showIVCalc, setShowIVCalc] = useState(false)
  const dose = calculateDose(drug, weightKg, doseMode)
  const ivCalc = useMemo(() => (weightKg > 0 ? calculateIVInfusion(drug, weightKg) : null), [drug, weightKg])

  // Спецпредупреждения для кошек
  const catWarning =
    species === 'cat' &&
    (drug.drug.toLowerCase().includes('парацетамол') ||
     drug.drug.toLowerCase().includes('carprofen') ||
     drug.drug.toLowerCase().includes('карпрофен'))

  const isCustom = (drug as any).isCustom === true
  const removeCustomDrug = useVetStore((s) => s.removeCustomDrug)

  return (
    <div
      className={`rounded-lg border bg-card overflow-hidden ${
        catWarning ? 'border-rose-300 bg-rose-50/30' : isCustom ? 'border-violet-300' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left hover:bg-accent/10 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm flex items-center gap-1.5 flex-wrap">
              <Syringe className="h-3.5 w-3.5 text-sky-600 shrink-0" />
              <span>{drug.drug}</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0">
                {drug.category}
              </Badge>
              {catWarning && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-rose-100 text-rose-700 border-rose-300">
                  ⚠ Опасно для кошек
                </Badge>
              )}
              {isCustom && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-violet-100 text-violet-700 border-violet-300">
                  ⭐ Мой
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {drug.indication}
            </div>
          </div>
        </div>

        {/* Расчёт дозы */}
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
          <div className="p-2 rounded bg-sky-50 border border-sky-200">
            <div className="text-sky-700 font-medium">
              {doseMode === 'prophylactic' ? 'Профилактическая' : 'Лечебная'} дозировка
            </div>
            <div className="text-sky-900 mt-0.5">
              {doseMode === 'prophylactic' && drug.prophylacticDosePerKg
                ? `${drug.prophylacticDosePerKg} мг/кг`
                : `${drug.dosePerKg} мг/кг`}
            </div>
          </div>
          <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
            <div className="text-emerald-700 font-medium">Частота</div>
            <div className="text-emerald-900 mt-0.5">
              {doseMode === 'prophylactic' && drug.prophylacticFrequency
                ? drug.prophylacticFrequency
                : drug.frequency}
            </div>
          </div>
          <div className="p-2 rounded bg-violet-50 border border-violet-200">
            <div className="text-violet-700 font-medium">Путь введения</div>
            <div className="text-violet-900 mt-0.5">{drug.route}</div>
          </div>
        </div>

        {/* Переключатель лечебная/профилактическая (если есть проф. доза) */}
        {drug.prophylacticDosePerKg && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Режим дозы:</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDoseMode('therapeutic') }}
              className={`px-2 py-1 rounded-md border transition-colors ${
                doseMode === 'therapeutic'
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-card text-muted-foreground border-slate-300'
              }`}
            >
              Лечебная
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDoseMode('prophylactic') }}
              className={`px-2 py-1 rounded-md border transition-colors ${
                doseMode === 'prophylactic'
                  ? 'bg-sky-600 text-white border-sky-700'
                  : 'bg-card text-muted-foreground border-slate-300'
              }`}
            >
              Профилактическая
            </button>
          </div>
        )}

        {/* Расчёт для веса */}
        {weightKg > 0 && (
          <div className="mt-2 p-2.5 rounded bg-emerald-100 border border-emerald-300">
            <div className="text-emerald-800 font-medium text-sm flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5" />
              Расчёт для {weightKg} кг ({doseMode === 'prophylactic' ? 'проф.' : 'леч.'}):
            </div>
            <div className="text-emerald-900 mt-1 text-sm">
              <span className="font-semibold">{dose.displayPerDose}</span> на приём ·{' '}
              <span className="font-semibold">{dose.displayPerDay}</span> в сутки
            </div>
            {dose.warningMax && (
              <div className="text-rose-700 text-xs mt-1 flex items-start gap-1">
                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                {dose.warningMax}
              </div>
            )}
            {doseMode === 'prophylactic' && drug.prophylacticDuration && (
              <div className="text-xs text-emerald-700 mt-1">
                📅 Курс: {drug.prophylacticDuration}
              </div>
            )}
          </div>
        )}

        {/* Кнопка IV расчёта (если есть ivData) */}
        {ivCalc && (
          <div className="mt-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowIVCalc(!showIVCalc) }}
              className="text-xs px-2 py-1 rounded-md bg-sky-50 border border-sky-300 text-sky-700 hover:bg-sky-100 transition-colors flex items-center gap-1"
            >
              <Droplet className="h-3 w-3" />
              {showIVCalc ? 'Скрыть' : 'Показать'} расчёт в/в инфузии
            </button>
          </div>
        )}
      </button>

      {/* Расчёт IV инфузии */}
      {showIVCalc && ivCalc && (
        <div className="px-3 pb-3">
          <div className="p-3 rounded-md bg-sky-50 border border-sky-300 text-xs">
            <div className="font-medium text-sky-800 mb-2 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Расчёт в/в инфузии для {weightKg} кг
            </div>
            <div className="space-y-1 text-sky-900">
              <div>
                <span className="font-medium">Доза:</span> {ivCalc.doseMg.toFixed(1)} мг препарата
              </div>
              <div>
                <span className="font-medium">Объём чистого препарата:</span> {ivCalc.doseMl.toFixed(2)} мл (концентрация {drug.ivData?.concentrationMgPerMl} мг/мл)
              </div>
              <div>
                <span className="font-medium">Развести в:</span> {ivCalc.dilutionVolumeMl} мл физраствора/глюкозы
              </div>
              <div className="text-base font-semibold mt-2 pt-2 border-t border-sky-300">
                Общий объём: {ivCalc.totalVolumeMl.toFixed(1)} мл
              </div>
              <div>
                <span className="font-medium">Скорость:</span> {ivCalc.infusionRateMlPerHr} мл/ч
              </div>
              <div>
                <span className="font-medium">Время инфузии:</span> ~{ivCalc.infusionTimeMin.toFixed(0)} минут
              </div>
            </div>
            {drug.ivData?.notes && (
              <div className="mt-2 pt-2 border-t border-sky-300 text-sky-800 italic">
                💡 {drug.ivData.notes}
              </div>
            )}
            {drug.ivData?.maxInfusionTime && (
              <div className="mt-1 text-xs text-rose-700">
                ⚠️ Не превышать время инфузии: {drug.ivData.maxInfusionTime}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Расширенная информация */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 text-xs border-t bg-slate-50/50">
          {drug.notes && (
            <div>
              <div className="font-medium text-slate-700 mt-2">Применение</div>
              <div className="text-slate-600 mt-0.5">{drug.notes}</div>
            </div>
          )}
          {drug.contraindications && (
            <div>
              <div className="font-medium text-rose-700 mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Противопоказания
              </div>
              <div className="text-rose-600 mt-0.5">{drug.contraindications}</div>
            </div>
          )}

          {/* Кнопка удаления пользовательского препарата */}
          {isCustom && (
            <div className="mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Удалить "${drug.drug}" из моих препаратов?`)) {
                    removeCustomDrug(drug.drug)
                  }
                }}
                className="text-xs px-2 py-1 rounded-md bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 transition-colors"
              >
                🗑 Удалить из моих препаратов
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
