'use client'

import { useState } from 'react'
import { useVetStore } from '@/store/vetStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Droplet, Calculator, AlertCircle, Activity, Info,
} from 'lucide-react'

const dehydrationLevels = [
  {
    value: 'mild',
    label: 'Лёгкая (5-6%)',
    description: 'Незначительное снижение тургора кожи (складка расправляется за 2 с), слизистые слегка суховатые. Жажда повышена.',
    deficitPercent: 5,
    fluidRate: 30, // мл/кг/24ч поддерживающая
    maintenanceBoost: 1.2,
  },
  {
    value: 'moderate',
    label: 'Умеренная (6-8%)',
    description: 'Заметное снижение тургора кожи (складка 3-4 с), слизистые сухие, глаза слегка запавшие. Тахикардия.',
    deficitPercent: 7,
    fluidRate: 40,
    maintenanceBoost: 1.5,
  },
  {
    value: 'severe',
    label: 'Тяжёлая (8-10%)',
    description: 'Сильное снижение тургора (складка >4 с), сухие слизистые, западение глаз, олигурия, тахикардия, гипотермия.',
    deficitPercent: 9,
    fluidRate: 60,
    maintenanceBoost: 2.0,
  },
  {
    value: 'shock',
    label: 'Шок (>10%)',
    description: 'Жизнеугрожающая — кома, анурия, нитевидный пульс, холодные конечности. Немедленная массивная инфузия.',
    deficitPercent: 12,
    fluidRate: 90,
    maintenanceBoost: 3.0,
  },
  {
    value: 'maintenance',
    label: 'Поддерживающая (нет дегидратации)',
    description: 'Поддержание баланса жидкости у пациента без значимых потерь. Норма: 30-60 мл/кг/24ч.',
    deficitPercent: 0,
    fluidRate: 50,
    maintenanceBoost: 1.0,
  },
]

const fluidTypes = [
  { value: 'ringer', label: 'Рингер-лактат', perKg: 30, type: 'кристаллоид сбалансированный' },
  { value: 'nacl', label: 'NaCl 0.9%', perKg: 30, type: 'кристаллоид несбалансированный' },
  { value: 'glucose5', label: 'Глюкоза 5%', perKg: 10, type: 'гипотонический (питание)' },
]

const shockBolusDoses = [
  { value: 'no', label: 'Нет (только поддерживающая)' },
  { value: 'dog', label: 'Собаки: 10-20 мл/кг за 15-30 мин' },
  { value: 'cat', label: 'Кошки: 5-10 мл/кг за 15-30 мин (осторожно!)' },
]

function formatMl(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(2)} л`
  if (ml >= 100) return `${ml.toFixed(0)} мл`
  if (ml >= 10) return `${ml.toFixed(1)} мл`
  return `${ml.toFixed(2)} мл`
}

export function InfusionCalculator() {
  const patientWeight = useVetStore((s) => s.patient.weight)
  const patientSpecies = useVetStore((s) => s.patient.species)
  const [customWeight, setCustomWeight] = useState('')
  const [dehydration, setDehydration] = useState('maintenance')
  const [fluidType, setFluidType] = useState('ringer')
  const [shockBolus, setShockBolus] = useState('no')

  const weightKg = parseFloat(customWeight || patientWeight) || 0
  const hasWeight = weightKg > 0

  const dehydrationConfig = dehydrationLevels.find((d) => d.value === dehydration)!
  const fluidConfig = fluidTypes.find((f) => f.value === fluidType)!

  // Расчёт дефицита жидкости: deficitPercent × weight / 100
  const deficitMl = (dehydrationConfig.deficitPercent / 100) * weightKg * 1000

  // Поддерживающая потребность: maintenanceBoost × base × weight
  const maintenanceMlPerDay = dehydrationConfig.fluidRate * weightKg * dehydrationConfig.maintenanceBoost

  // Болюс при шоке (мл за 15-30 мин)
  let bolusMl = 0
  let bolusDescription = ''
  if (shockBolus === 'dog') {
    bolusMl = 15 * weightKg // среднее 10-20
    bolusDescription = 'болюс 15 мл/кг за 15-30 мин (среднее из диапазона 10-20 мл/кг)'
  } else if (shockBolus === 'cat') {
    bolusMl = 7.5 * weightKg // среднее 5-10
    bolusDescription = 'болюс 7.5 мл/кг за 15-30 мин (осторожно — кошки склонны к перегрузке)'
  }

  // Суточный объём (дефицит + поддержание)
  const totalDayMl = deficitMl + maintenanceMlPerDay

  // Скорость инфузии: мл/час и капель/мин (1 мл = 20 капель стандарт)
  const mlPerHour = totalDayMl / 24
  const dropsPerMin = (mlPerHour * 20) / 60

  // Первые 24 часа обычно: 1/2 дефицита + поддержание
  const firstDayMl = deficitMl / 2 + maintenanceMlPerDay
  const secondDayMl = deficitMl / 2 + maintenanceMlPerDay

  return (
    <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50/30 to-emerald-50/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplet className="h-5 w-5 text-cyan-600" />
          Калькулятор инфузионной терапии
        </CardTitle>
        <CardDescription>
          Расчёт объёма инфузии по весу и степени дегидратации.
          Учитывает дефицит, поддержание и шоковый болюс.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Вес и вид */}
        <div className="grid gap-3 sm:grid-cols-2 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Calculator className="h-3 w-3" />
              Вес пациента (кг)
              {patientWeight && !customWeight && (
                <span className="text-muted-foreground">· из шапки: {patientWeight} кг</span>
              )}
            </Label>
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={customWeight || patientWeight}
              onChange={(e) => setCustomWeight(e.target.value)}
              placeholder="Напр.: 12.5"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

        {!hasWeight && (
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Введите вес пациента в шапке или в поле выше, чтобы получить расчёт инфузии.
            </div>
          </div>
        )}

        {/* Выбор степени дегидратации */}
        <div className="space-y-1.5">
          <Label className="text-xs">Степень дегидратации</Label>
          <Select value={dehydration} onValueChange={setDehydration}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dehydrationLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground p-2 rounded bg-slate-50 border border-slate-200">
            {dehydrationConfig.description}
          </div>
        </div>

        {/* Выбор раствора */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Раствор</Label>
            <Select value={fluidType} onValueChange={setFluidType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fluidTypes.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground italic">
              {fluidConfig.type}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Шоковый болюс</Label>
            <Select value={shockBolus} onValueChange={setShockBolus}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shockBolusDoses.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Результаты расчёта */}
        {hasWeight && (
          <div className="space-y-2 mt-2">
            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-300">
              <Activity className="h-3 w-3 mr-1" />
              Расчёт для {weightKg} кг
            </Badge>

            {bolusMl > 0 && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-300">
                <div className="font-medium text-rose-700 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  🚨 Шоковый болюс (НЕОТЛОЖНО)
                </div>
                <div className="text-sm font-semibold text-rose-800">
                  {formatMl(bolusMl)} {fluidConfig.label}
                </div>
                <div className="text-xs text-rose-700 mt-0.5">
                  {bolusDescription}
                </div>
              </div>
            )}

            {dehydrationConfig.deficitPercent > 0 && (
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
                <div className="text-sm font-medium text-amber-800 mb-1">
                  Дефицит жидкости ({dehydrationConfig.deficitPercent}%)
                </div>
                <div className="text-lg font-semibold text-amber-900">
                  {formatMl(deficitMl)}
                </div>
                <div className="text-xs text-amber-700 mt-0.5">
                  Восполнить за первые 24 часа (½ объёма) + следующие 24 часа (½ объёма)
                </div>
              </div>
            )}

            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-300">
              <div className="text-sm font-medium text-emerald-800 mb-1">
                Суточный объём инфузии
              </div>
              <div className="text-2xl font-bold text-emerald-900">
                {formatMl(totalDayMl)}
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                = дефицит {formatMl(deficitMl)} + поддержание {formatMl(maintenanceMlPerDay)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-md bg-sky-50 border border-sky-200">
                <div className="text-xs text-sky-700 font-medium">Скорость</div>
                <div className="text-lg font-semibold text-sky-900">
                  {mlPerHour.toFixed(1)} мл/ч
                </div>
                <div className="text-xs text-sky-700">
                  ≈ {dropsPerMin.toFixed(1)} кап/мин
                </div>
              </div>
              <div className="p-3 rounded-md bg-violet-50 border border-violet-200">
                <div className="text-xs text-violet-700 font-medium">Первая сутки</div>
                <div className="text-lg font-semibold text-violet-900">
                  {formatMl(firstDayMl)}
                </div>
                <div className="text-xs text-violet-700">
                  Затем {formatMl(secondDayMl)}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground italic mt-2 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Клиническое правило:</span> при дефиците 5-10% — восполнить 50% за первые 12-24 ч + поддержание; остальное за следующие 24 ч.
                {patientSpecies === 'cat' && ' ⚠️ Кошки: ограничение ~60 мл/кг/24ч, риск перегрузки при быстром введении.'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
