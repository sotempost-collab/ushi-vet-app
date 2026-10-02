'use client'

import { useState, useRef, useEffect } from 'react'
import { useVetStore } from '@/store/vetStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { heartRhythms } from '@/data/examinationData'
import {
  startHeartbeat,
  stopHeartbeat,
  generateRhythmWav,
} from '@/lib/heart-sounds'
import {
  Play,
  Pause,
  Heart,
  Volume2,
  Download,
  Activity,
  Stethoscope,
  Dog,
  Cat,
  Info,
} from 'lucide-react'

type RhythmId = 'normal' | 'tachycardia' | 'bradycardia' | 'arrhythmia'

export function HeartAuscultation() {
  const auscultation = useVetStore((s) => s.auscultation)
  const setAuscultation = useVetStore((s) => s.setAuscultation)
  const patientSpecies = useVetStore((s) => s.patient.species)

  const [activeRhythm, setActiveRhythm] = useState<RhythmId | null>(null)
  const [volume, setVolume] = useState(60)
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({})
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)

  const animationRef = useRef<number | null>(null)

  // Останавливаем при размонтировании
  useEffect(() => {
    return () => {
      stopHeartbeat()
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  // Подсказка по норме ЧСС для текущего вида
  const speciesNormalHint =
    patientSpecies === 'dog'
      ? '60–140 уд/мин (мелкие породы ближе к верхней, крупные к нижней границе)'
      : patientSpecies === 'cat'
      ? '140–220 уд/мин (у котят и при стрессе — выше)'
      : 'Вид не указан — выберите в шапке для точных норм'

  const SpeciesIcon = patientSpecies === 'dog' ? Dog : patientSpecies === 'cat' ? Cat : Info

  const handlePlay = (rhythm: RhythmId) => {
    if (activeRhythm === rhythm) {
      // Stop
      stopHeartbeat()
      setActiveRhythm(null)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      return
    }
    startHeartbeat(rhythm, volume / 100)
    setActiveRhythm(rhythm)
  }

  // Обновление громкости во время воспроизведения
  useEffect(() => {
    if (activeRhythm) {
      stopHeartbeat()
      startHeartbeat(activeRhythm, volume / 100)
    }
  }, [volume, activeRhythm])

  const handleSelectForPatient = (rhythm: RhythmId) => {
    const rhythmData = heartRhythms.find((r) => r.id === rhythm)!
    let bpm = auscultation.bpm
    if (!bpm) {
      if (rhythm === 'normal') {
        bpm = patientSpecies === 'cat' ? '180' : '110'
      } else if (rhythm === 'tachycardia') {
        bpm = patientSpecies === 'cat' ? '240' : '170'
      } else if (rhythm === 'bradycardia') {
        bpm = patientSpecies === 'cat' ? '130' : '50'
      } else {
        bpm = '—'
      }
    }
    setAuscultation({
      rhythm,
      bpm,
    })
  }

  const handleDownload = async (rhythm: RhythmId) => {
    setGeneratingFor(rhythm)
    try {
      const url = await generateRhythmWav(rhythm, 8, volume / 100)
      setDownloadUrls((prev) => ({ ...prev, [rhythm]: url }))
      const a = document.createElement('a')
      a.href = url
      a.download = `heart-${rhythm}.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (e) {
      console.error(e)
    } finally {
      setGeneratingFor(null)
    }
  }

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-rose-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-emerald-600" />
          Аускультация сердца — справочник ритмов
        </CardTitle>
        <CardDescription>
          Прослушайте эталонные записи ритмов сердца, сравните с пациентом и зафиксируйте находки.
          Нормы ЧСС адаптированы под вид пациента.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Подсказка по виду пациента */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-center gap-3">
          <SpeciesIcon className="h-5 w-5 text-amber-700 shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-amber-800">
              Текущий пациент: {patientSpecies === 'dog' ? 'собака' : patientSpecies === 'cat' ? 'кошка' : 'вид не указан'}
            </div>
            <div className="text-amber-700 text-xs mt-0.5">
              Норма ЧСС для сравнения: {speciesNormalHint}
            </div>
          </div>
        </div>

        {/* Кнопки ритмов */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {heartRhythms.map((rhythm) => {
            const isActive = activeRhythm === rhythm.id
            const isSelected = auscultation.rhythm === rhythm.id
            // Видоспецифичная норма для этого ритма
            const rhythmNormalRange =
              patientSpecies === 'dog'
                ? rhythm.normalRangeDog
                : patientSpecies === 'cat'
                ? rhythm.normalRangeCat
                : `${rhythm.normalRangeDog} (собаки) / ${rhythm.normalRangeCat} (кошки)`

            return (
              <div
                key={rhythm.id}
                className={`relative rounded-xl border-2 p-4 transition-all ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : isSelected
                    ? 'border-emerald-300 bg-emerald-50/50'
                    : 'border-slate-200 bg-card hover:border-emerald-200'
                }`}
              >
                {/* Анимация сердца */}
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <Heart
                      className="h-5 w-5 text-rose-500"
                      style={{
                        animation: 'heartbeat-pulse 0.6s ease-in-out infinite',
                        transformOrigin: 'center',
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: rhythm.color }}
                  />
                  <span className="font-medium text-sm">{rhythm.name}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {rhythm.description}
                </div>
                <div className="text-xs text-emerald-700 mb-3 p-1.5 rounded bg-emerald-50/60 border border-emerald-200">
                  <div className="flex items-center gap-1 font-medium">
                    <SpeciesIcon className="h-3 w-3" />
                    {patientSpecies === 'dog' ? 'Собаки' : patientSpecies === 'cat' ? 'Кошки' : 'Вид'}:
                  </div>
                  <div className="mt-0.5">{rhythmNormalRange}</div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handlePlay(rhythm.id as RhythmId)}
                    className={
                      isActive
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-slate-700 hover:bg-slate-900'
                    }
                  >
                    {isActive ? (
                      <>
                        <Pause className="h-3.5 w-3.5 mr-1" /> Стоп
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 mr-1" /> Слушать
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(rhythm.id as RhythmId)}
                    disabled={generatingFor === rhythm.id}
                    title="Скачать WAV для офлайн-прослушивания"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => handleSelectForPatient(rhythm.id as RhythmId)}
                  disabled={isSelected}
                >
                  {isSelected ? '✓ Записано у пациента' : 'Записать как находку у пациента'}
                </Button>

                {rhythm.bpm > 0 && (
                  <div className="mt-2 text-center text-xs text-muted-foreground">
                    Демо: ≈ {rhythm.bpm} уд/мин
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Регулятор громкости */}
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
          <Volume2 className="h-5 w-5 text-muted-foreground shrink-0" />
          <Slider
            value={[volume]}
            onValueChange={(v) => setVolume(v[0])}
            max={100}
            min={0}
            step={5}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-10 text-right">{volume}%</span>
        </div>

        {/* Фиксация находок у пациента */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            <h4 className="font-semibold text-sm">Находки аускультации у пациента</h4>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Выявленный ритм</Label>
              <div className="flex flex-wrap gap-1.5 min-h-9 items-center">
                {auscultation.rhythm ? (
                  <Badge className="bg-emerald-600">
                    {heartRhythms.find((r) => r.id === auscultation.rhythm)?.name || auscultation.rhythm}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Не зафиксировано</span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                ЧСС (уд/мин)
                <span className="text-muted-foreground font-normal ml-1">
                  (норма для {patientSpecies === 'dog' ? 'собаки' : patientSpecies === 'cat' ? 'кошки' : '—'})
                </span>
              </Label>
              <Input
                value={auscultation.bpm}
                onChange={(e) => setAuscultation({ bpm: e.target.value })}
                placeholder={patientSpecies === 'cat' ? 'Напр.: 180' : 'Напр.: 120'}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Шумы</Label>
              <Input
                value={auscultation.murmurs}
                onChange={(e) => setAuscultation({ murmurs: e.target.value })}
                placeholder="Напр.: систолический 3/6"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Комментарий / точка аускультации</Label>
            <Textarea
              rows={2}
              value={auscultation.notes}
              onChange={(e) => setAuscultation({ notes: e.target.value })}
              placeholder="Напр.: на левой стороне 5-е межреберье, шум иррадиирует в подмышечную область"
            />
          </div>
        </div>
      </CardContent>

      <style jsx>{`
        @keyframes heartbeat-pulse {
          0% { transform: scale(1); }
          30% { transform: scale(1.4); }
          50% { transform: scale(1); }
          70% { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
      `}</style>
    </Card>
  )
}
