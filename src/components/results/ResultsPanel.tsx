'use client'

import { useState } from 'react'
import { useVetStore } from '@/store/vetStore'
import { examinationSystems, getNormalForSpecies } from '@/data/examinationData'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  Sparkles,
  ClipboardList,
  Stethoscope,
  Save,
  FileDown,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ListChecks,
  Pill,
  ClipboardCopy,
  ImageIcon,
  FileType,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { VisitHistory } from '@/components/history/VisitHistory'
import { InteractionChecker } from '@/components/drugs/InteractionChecker'
import { SmartDrugRecommender } from '@/components/drugs/SmartDrugRecommender'
import { DrugImport } from '@/components/drugs/DrugImport'
import { generateResultsDirect } from '@/lib/zai-direct'


// Экранирование HTML для безопасного вывода в PDF
function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 🆕 Хелпер: найти параметр в examinationSystems по id (для getNormalForSpecies)
// examination store хранит { id, name, status, deviationValue, notes } — без normalBySpecies.
// examinationSystems хранит полные данные с normalBySpecies.
// Нужно найти соответствующий параметр в данных и вернуть его.
function findExamParamInData(paramId: string, systemId: string) {
  const system = examinationSystems.find((s) => s.id === systemId)
  if (!system) return undefined
  return system.params.find((p) => p.id === paramId)
}

// 🆕 Хелпер: получить норму для вида — безопасно (без crash если normalBySpecies нет)
function safeGetNormalForSpecies(paramId: string, systemId: string, species: 'dog' | 'cat' | 'other'): string {
  const dataParam = findExamParamInData(paramId, systemId)
  if (!dataParam) return ''
  try {
    return getNormalForSpecies(dataParam, species) || ''
  } catch {
    return ''
  }
}

export function ResultsPanel() {
  const patient = useVetStore((s) => s.patient)
  const anamnesis = useVetStore((s) => s.anamnesis)
  const examination = useVetStore((s) => s.examination)
  const auscultation = useVetStore((s) => s.auscultation)
  const scans = useVetStore((s) => s.scans)
  const results = useVetStore((s) => s.results)
  const setResults = useVetStore((s) => s.setResults)
  const visitStartedAt = useVetStore((s) => s.visitStartedAt)
  const visitEndedAt = useVetStore((s) => s.visitEndedAt)
  const visitDurationMs = useVetStore((s) => s.visitDurationMs)
  const voiceNotes = useVetStore((s) => s.voiceNotes)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aiResult, setAiResult] = useState(results.aiGenerated || '')
  const [generatedAt, setGeneratedAt] = useState<string>(results.generatedAt || '')

  const allParams = Object.values(examination).flat()
  const deviations = allParams.filter((p) => p.status === 'deviation')
  const normalFindings = allParams.filter((p) => p.status === 'normal')
  const notEvaluated = allParams.filter((p) => p.status === 'not_evaluated' || !p.status)

  const generateAiResults = async () => {
    setLoading(true)
    setError('')
    try {
      // Формируем сводку осмотра
      const examinationArray: Array<{
        system: string
        param: string
        status: string
        normalValue: string
        deviationValue: string
        notes: string
      }> = []
      for (const system of examinationSystems) {
        const params = examination[system.id] || []
        for (const p of params) {
          examinationArray.push({
            system: system.name,
            param: p.name,
            status: p.status || 'not_evaluated',
            normalValue: p.normalValue,
            deviationValue: p.deviationValue,
            notes: p.notes,
          })
        }
      }

      // Прямой вызов Z.AI через Cloudflare Worker (без сервера, работает в РФ)
      console.log('[AI] Запуск генерации заключения...')
      const t0 = Date.now()
      const text = await generateResultsDirect({
        patient,
        anamnesis,
        examination: examinationArray,
        auscultation,
        scanTexts: scans.map((s) => s.ocrText),
        voiceNotes,
      })
      console.log(`[AI] Готово за ${((Date.now() - t0) / 1000).toFixed(1)}s, символов: ${text?.length || 0}`)

      setAiResult(text)
      const now = new Date().toISOString()
      setGeneratedAt(now)
      setResults({ aiGenerated: text, generatedAt: now })
    } catch (e) {
      console.error('[AI] Ошибка генерации:', e)
      const errMsg = e instanceof Error ? e.message : String(e)
      setError(`Не удалось сгенерировать заключение. ${errMsg}\n\nПроверьте подключение к интернету и попробуйте снова.`)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveManual = (
    field: 'preliminaryDiagnoses' | 'plannedExaminations' | 'recommendations' | 'preliminaryPrescriptions' | 'mandatoryDiagnostics' | 'additionalDiagnostics',
    value: string,
  ) => {
    setResults({ [field]: value })
  }

  // 🆕 Копирование раздела «Предварительные назначения (терапия)» из AI-заключения
  const handleCopyAiPrescriptions = () => {
    if (!aiResult) {
      alert('Сначала сгенерируйте AI-заключение кнопкой «Сгенерировать заключение».')
      return
    }

    // Извлекаем раздел из AI-ответа
    const sectionStart = aiResult.indexOf('### Предварительные назначения')
    if (sectionStart === -1) {
      alert('В AI-заключении не найден раздел «Предварительные назначения».')
      return
    }

    // Найдём следующий раздел (### Предупреждения или ### Рекомендации) или конец
    const nextSection = aiResult.indexOf('\n### ', sectionStart + 5)
    const sectionText =
      nextSection === -1
        ? aiResult.slice(sectionStart)
        : aiResult.slice(sectionStart, nextSection)

    // Уберём markdown-заголовок, оставим содержимое
    const cleaned = sectionText
      .replace(/^### Предварительные назначения[^\n]*\n/, '')
      .trim()

    // 🆕 ЗАМЕНИТЬ содержимое поля, а не добавлять к существующему.
    // Это предотвращает дублирование при многократном нажатии кнопки.
    setResults({ preliminaryPrescriptions: cleaned })
  }

  const exportProtocol = () => {
    // Вычисляем длительность приёма
    const duration =
      visitEndedAt !== null && visitStartedAt !== null
        ? visitDurationMs
        : visitStartedAt !== null
        ? Date.now() - visitStartedAt
        : 0

    const formatDuration = (ms: number): string => {
      const totalSeconds = Math.floor(ms / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const pad = (n: number) => n.toString().padStart(2, '0')
      if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      return `${pad(minutes)}:${pad(seconds)}`
    }

    let txt = `ВЕТЕРИНАРНЫЙ ПРОТОКОЛ\nАссистент УшиХвост\nДата формирования: ${new Date().toLocaleString('ru-RU')}\n\n`
    txt += `=== ПАЦИЕНТ ===\n`
    txt += `Вид: ${patient.species === 'dog' ? 'Собака' : patient.species === 'cat' ? 'Кошка' : 'Другое'}\n`
    txt += `Вес: ${patient.weight || '—'} кг\n`
    txt += `Дата приёма: ${patient.visitDate || '—'}\n`
    txt += `Длительность приёма: ${formatDuration(duration)}\n\n`

    txt += `=== АНАМНЕЗ ===\n`
    // Словари для перевода (определены ниже в exportProtocolPDF, продублируем для TXT)
    const ANAMNESIS_LABELS_TXT: Record<string, string> = {
      livingConditions: 'Где живёт',
      outdoorAccess: 'Доступ на улицу / режим прогулок',
      otherAnimals: 'Другие животные дома',
      contactsStrangers: 'Контакты с чужими животными',
      caretaker: 'Кто ухаживает',
      decisionMaker: 'Кто принимает решения по лечению',
      physicalActivity: 'Физическая нагрузка',
      dietType: 'Тип рациона',
      dietBrand: 'Бренд / линейка корма',
      feedingFreq: 'Частота кормления',
      feedingVolume: 'Объём кормления',
      treats: 'Лакомства',
      supplements: 'Добавки / витамины',
      dietChanges: 'Изменения рациона недавно',
      tableFoodAccess: 'Доступ к корму со стола',
      trashAccess: 'Доступ к мусору',
      waterSource: 'Источник воды',
      waterChangeFreq: 'Как часто меняют воду',
      waterIntake: 'Сколько пьёт (оценка владельца)',
      vaccination: 'Вакцинация (препарат)',
      vaccinationDate: 'Дата последней вакцинации',
      fleaTickTreatment: 'Обработка от блох/клещей (препарат)',
      fleaTickDate: 'Дата последней обработки от блох/клещей',
      deworming: 'Дегельминтизация (препарат)',
      dewormingDate: 'Дата последней дегельминтизации',
      neutered: 'Кастрация / стерилизация',
      neuteredDate: 'Дата операции',
      neuteredComplications: 'Осложнения после операции',
      mainComplaint: 'Что именно беспокоит? С чего началось?',
      complaintOnset: 'Когда заметили первые признаки',
      complaintDevelopment: 'Как развивались симптомы',
      associatedFactors: 'С чем владелец связывает начало',
      previousEpisodes: 'Была ли такая проблема раньше, исход',
      previousTreatment: 'Какая помощь уже оказана по текущей проблеме',
      currentTreatment: 'Текущее лечение (постоянные препараты)',
      currentTreatmentEffect: 'Эффект от текущего лечения',
      generalStatus: 'Общее состояние: активность, вес, лихорадка, поведение',
      coughDyspnea: 'Кашель / одышка: характер, при нагрузке/ночью, выделения',
      polyuriaPolydipsia: 'Полиурия / полидипсия',
      appetiteGi: 'Аппетит / ЖКТ: аппетит, рвота, стул, доступ к инородному',
      urogenital: 'Мочеполовая: частота, характер, цвет, недержание, течки',
      skin: 'Кожа / шерсть: зуд, расчёсы, алопеция, перхоть, паразиты',
      nervous: 'Нервная / органы чувств: судороги, шаткость, наклон головы, глаза',
      musculoskeletal: 'Опорно-двигательный: хромота, нежелание прыгать, травмы',
      travel: 'Поездки, выставки, передержки, груминг',
      exhibitions: 'Выставки',
      boarding: 'Передержки',
      grooming: 'Груминг',
      sickAnimalsNearby: 'Больные животные в доме/подъезде',
      walkingArea: 'Для собак: где гуляет, контакт с дикими/падалью/грызунами',
      wildlifeContact: 'Контакт с дикими животными',
      huntingBehavior: 'Для кошек: охота, вода из луж/туалета',
      previousDiseases: 'Предыдущие заболевания',
      surgeries: 'Операции',
      chronicDiseases: 'Хронические заболевания',
      permanentMedications: 'Постоянные препараты',
      allergies: 'Аллергии',
      anesthesiaIssues: 'Проблемы с анестезией',
      firstEstrus: 'Первая течка',
      estrusRegularity: 'Регулярность течки',
      estrusDuration: 'Длительность течки',
      falsePregnancies: 'Ложные беременности',
      pyometra: 'Пиометра',
      births: 'Роды',
      breedingMales: 'Случки с котами/кобелями',
      prostateIssues: 'Проблемы с простатой',
    }
    const ANAMNESIS_VALUES_TXT: Record<string, string> = {
      apartment: 'Квартира',
      house: 'Частный дом',
      aviary: 'Вольер',
      street: 'Уличное содержание',
      shelter: 'Приют',
      commercial: 'Промышленный корм',
      natural: 'Натуральное кормление',
      mixed: 'Смешанный',
      raw: 'RAW / BARF',
      '1': '1 раз в день',
      '2': '2 раза в день',
      '3': '3 раза в день',
      free: 'Свободный доступ',
      no: 'Нет',
      yes: 'Да',
      occasionally: 'Иногда',
      sometimes: 'Иногда',
      'true': 'Да',
      'false': 'Нет',
    }
    Object.entries(anamnesis).forEach(([k, v]) => {
      if (v && String(v).trim()) {
        const label = ANAMNESIS_LABELS_TXT[k] || k
        const trimmed = String(v).trim()
        const value = ANAMNESIS_VALUES_TXT[trimmed] || v
        txt += `- ${label}: ${value}\n`
      }
    })
    txt += `\n`

    txt += `=== ОСМОТР ===\n`
    for (const system of examinationSystems) {
      const params = examination[system.id] || []
      // 🆕 Пропускаем "не оценено" — не включаем в выписку
      const evaluated = params.filter((p) => p.status && p.status !== 'not_evaluated')
      if (evaluated.length === 0) continue
      txt += `\n--- ${system.name} ---\n`
      for (const p of evaluated) {
        const statusLabel = p.status === 'normal' ? 'Норма' : 'Отклонение'
        let val = ''
        if (p.status === 'normal') {
          // 🆕 Для нормы подставляем значение нормы из examinationData
          val = safeGetNormalForSpecies(p.id, system.id, patient.species) || 'в норме'
          if (p.notes) {
            val = `${val} (${p.notes})`
          }
        } else if (p.status === 'deviation') {
          val = p.deviationValue || 'отклонение'
          if (p.notes) {
            val = val ? `${val} (${p.notes})` : p.notes
          }
        }
        txt += `• ${p.name}: ${statusLabel}${val ? ` — ${val}` : ''}\n`
      }
    }
    txt += `\n`

    txt += `=== АУСКУЛЬТАЦИЯ СЕРДЦА ===\n`
    txt += `Ритм: ${auscultation.rhythm || 'не зафиксирован'}\n`
    txt += `ЧСС: ${auscultation.bpm || '—'} уд/мин\n`
    txt += `Шумы: ${auscultation.murmurs || 'нет'}\n`
    txt += `Комментарий: ${auscultation.notes || 'нет'}\n\n`

    if (scans.length > 0) {
      txt += `=== ЗАГРУЖЕННЫЕ ИССЛЕДОВАНИЯ ===\n`
      scans.forEach((s, i) => {
        txt += `\n[Исследование #${i + 1}] ${s.name}\n`
        if (s.ocrText) txt += `OCR-распознано:\n${s.ocrText}\n`
      })
      txt += `\n`
    }

    txt += `=== РЕЗУЛЬТАТЫ ===\n\n`
    if (results.preliminaryDiagnoses || aiResult) {
      txt += `ПРЕДВАРИТЕЛЬНЫЕ ДИАГНОЗЫ:\n${results.preliminaryDiagnoses || '(сгенерировано AI — см. ниже)'}\n\n`
    }
    if (results.plannedExaminations) {
      txt += `ПЛАНОВЫЕ ОБСЛЕДОВАНИЯ:\n${results.plannedExaminations}\n\n`
    }
    if (results.mandatoryDiagnostics) {
      txt += `ОБЯЗАТЕЛЬНАЯ ЛАБОРАТОРНАЯ И ИНСТРУМЕНТАЛЬНАЯ ДИАГНОСТИКА:\n${results.mandatoryDiagnostics}\n\n`
    }
    if (results.additionalDiagnostics) {
      txt += `ДОПОЛНИТЕЛЬНАЯ ВИЗУАЛИЗАЦИОННАЯ ДИАГНОСТИКА:\n${results.additionalDiagnostics}\n\n`
    }
    if (results.preliminaryPrescriptions) {
      txt += `ПРЕДВАРИТЕЛЬНЫЕ НАЗНАЧЕНИЯ (ТЕРАПИЯ):\n${results.preliminaryPrescriptions}\n\n`
    }
    if (results.recommendations) {
      txt += `РЕКОМЕНДАЦИИ:\n${results.recommendations}\n\n`
    }
    if (aiResult) {
      txt += `=== AI-ЗАКЛЮЧЕНИЕ ===\n${aiResult}\n\n`
    }
    if (generatedAt) {
      txt += `(Сгенерировано: ${new Date(generatedAt).toLocaleString('ru-RU')})\n`
    }

    // Download
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `protocol-${patient.species}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Экспорт протокола в PDF (через печать в новом окне с CSS для печати)
  const exportProtocolPDF = () => {
    // Вычисляем длительность приёма
    const duration =
      visitEndedAt !== null && visitStartedAt !== null
        ? visitDurationMs
        : visitStartedAt !== null
        ? Date.now() - visitStartedAt
        : 0

    const formatDuration = (ms: number): string => {
      const totalSeconds = Math.floor(ms / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const pad = (n: number) => n.toString().padStart(2, '0')
      if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      return `${pad(minutes)}:${pad(seconds)}`
    }

    // Хелпер: делает строку в формате "**Метка:** значение" (метка жирная, новая строка)
    const line = (label: string, value: string | number | null | undefined) => {
      const v = value == null || value === '' ? '—' : String(value)
      return `<p><strong>${label}:</strong> ${escapeHtml(v)}</p>`
    }

    // Хелпер: пустая строка-разделитель
    const gap = () => '<p style="height:8px;margin:0;">&nbsp;</p>'

    // Строим HTML для печати — простой текст, без таблиц, как в vetmanager выписке
    let html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Выписка из медицинской карты — Ассистент УшиХвост</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', 'Liberation Serif', 'Noto Serif', serif;
    max-width: 720px;
    margin: 0 auto;
    padding: 36px;
    color: #000;
    line-height: 1.55;
    font-size: 13px;
  }
  /* Заголовок документа — по центру, жирный */
  .doc-title {
    text-align: center;
    font-size: 18px;
    font-weight: bold;
    margin: 8px 0 24px 0;
    text-transform: uppercase;
  }
  /* Подзаголовки разделов — жирные, левая граница */
  .section {
    font-size: 14px;
    font-weight: bold;
    margin: 18px 0 6px 0;
    padding-bottom: 3px;
    border-bottom: 1px solid #888;
  }
  /* Строка "Метка: Значение" — каждое поле с новой строки */
  p { margin: 2px 0; }
  strong { font-weight: bold; }
  /* Подзаголовок подраздела — центрированный, как "Первичный приём" */
  .sub-section {
    text-align: center;
    font-size: 13px;
    font-weight: bold;
    margin: 14px 0 8px 0;
  }
  /* Длинный многострочный текст (анамнез, AI-заключение) */
  .text-block {
    margin: 4px 0 10px 0;
    white-space: pre-wrap;
  }
  /* Подвал */
  .footer {
    margin-top: 40px;
    padding-top: 8px;
    border-top: 1px solid #aaa;
    font-size: 10px;
    color: #666;
    text-align: center;
  }
  @media print {
    body { padding: 0; max-width: none; }
    .no-print { display: none; }
    @page { margin: 2cm; }
  }
</style>
</head>
<body>

<div class="doc-title">Выписка из медицинской карты животного</div>
<p style="text-align:center;color:#555;margin-top:-16px;margin-bottom:18px;">${new Date().toLocaleString('ru-RU')}</p>

<div class="section">Данные пациента</div>
${line('Вид животного', patient.species === 'dog' ? 'Собака' : patient.species === 'cat' ? 'Кошка' : 'Другое')}
${line('Вес', patient.weight ? `${patient.weight} кг` : '—')}
${line('Дата приёма', patient.visitDate || '—')}
${line('Длительность приёма', formatDuration(duration))}
${gap()}

<div class="section">Анамнез</div>
`

    // 🆕 Словарь для перевода английских ключей анамнеза в русские подписи
    const ANAMNESIS_LABELS: Record<string, string> = {
      livingConditions: 'Где живёт',
      outdoorAccess: 'Доступ на улицу / режим прогулок',
      otherAnimals: 'Другие животные дома',
      contactsStrangers: 'Контакты с чужими животными',
      caretaker: 'Кто ухаживает',
      decisionMaker: 'Кто принимает решения по лечению',
      physicalActivity: 'Физическая нагрузка',
      dietType: 'Тип рациона',
      dietBrand: 'Бренд / линейка корма',
      feedingFreq: 'Частота кормления',
      feedingVolume: 'Объём кормления',
      treats: 'Лакомства',
      supplements: 'Добавки / витамины',
      dietChanges: 'Изменения рациона недавно',
      tableFoodAccess: 'Доступ к корму со стола',
      trashAccess: 'Доступ к мусору',
      waterSource: 'Источник воды',
      waterChangeFreq: 'Как часто меняют воду',
      waterIntake: 'Сколько пьёт (оценка владельца)',
      vaccination: 'Вакцинация (препарат)',
      vaccinationDate: 'Дата последней вакцинации',
      fleaTickTreatment: 'Обработка от блох/клещей (препарат)',
      fleaTickDate: 'Дата последней обработки от блох/клещей',
      deworming: 'Дегельминтизация (препарат)',
      dewormingDate: 'Дата последней дегельминтизации',
      neutered: 'Кастрация / стерилизация',
      neuteredDate: 'Дата операции',
      neuteredComplications: 'Осложнения после операции',
      mainComplaint: 'Что именно беспокоит? С чего началось?',
      complaintOnset: 'Когда заметили первые признаки',
      complaintDevelopment: 'Как развивались симптомы',
      associatedFactors: 'С чем владелец связывает начало',
      previousEpisodes: 'Была ли такая проблема раньше, исход',
      previousTreatment: 'Какая помощь уже оказана по текущей проблеме',
      currentTreatment: 'Текущее лечение (постоянные препараты)',
      currentTreatmentEffect: 'Эффект от текущего лечения',
      generalStatus: 'Общее состояние: активность, вес, лихорадка, поведение',
      coughDyspnea: 'Кашель / одышка: характер, при нагрузке/ночью, выделения',
      polyuriaPolydipsia: 'Полиурия / полидипсия',
      appetiteGi: 'Аппетит / ЖКТ: аппетит, рвота, стул, доступ к инородному',
      urogenital: 'Мочеполовая: частота, характер, цвет, недержание, течки',
      skin: 'Кожа / шерсть: зуд, расчёсы, алопеция, перхоть, паразиты',
      nervous: 'Нервная / органы чувств: судороги, шаткость, наклон головы, глаза',
      musculoskeletal: 'Опорно-двигательный: хромота, нежелание прыгать, травмы',
      travel: 'Поездки, выставки, передержки, груминг',
      exhibitions: 'Выставки',
      boarding: 'Передержки',
      grooming: 'Груминг',
      sickAnimalsNearby: 'Больные животные в доме/подъезде',
      walkingArea: 'Для собак: где гуляет, контакт с дикими/падалью/грызунами',
      wildlifeContact: 'Контакт с дикими животными',
      huntingBehavior: 'Для кошек: охота, вода из луж/туалета',
      previousDiseases: 'Предыдущие заболевания',
      surgeries: 'Операции',
      chronicDiseases: 'Хронические заболевания',
      permanentMedications: 'Постоянные препараты',
      allergies: 'Аллергии',
      anesthesiaIssues: 'Проблемы с анестезией',
      firstEstrus: 'Первая течка',
      estrusRegularity: 'Регулярность течки',
      estrusDuration: 'Длительность течки',
      falsePregnancies: 'Ложные беременности',
      pyometra: 'Пиометра',
      births: 'Роды',
      breedingMales: 'Случки с котами/кобелями',
      prostateIssues: 'Проблемы с простатой',
    }

    // 🆕 Словарь для перевода значений select-полей (которые хранятся на английском)
    const ANAMNESIS_VALUES: Record<string, string> = {
      // livingConditions
      apartment: 'Квартира',
      house: 'Частный дом',
      aviary: 'Вольер',
      street: 'Уличное содержание',
      shelter: 'Приют',
      // dietType
      commercial: 'Промышленный корм',
      natural: 'Натуральное кормление',
      mixed: 'Смешанный',
      raw: 'RAW / BARF',
      // feedingFreq
      '1': '1 раз в день',
      '2': '2 раза в день',
      '3': '3 раза в день',
      free: 'Свободный доступ',
      // tableFoodAccess / trashAccess
      no: 'Нет',
      yes: 'Да',
      occasionally: 'Иногда',
      sometimes: 'Иногда',
      // neutered (Да/Нет)
      'true': 'Да',
      'false': 'Нет',
    }

    // 🆕 Хелпер: перевод значения (если в словаре — вернуть перевод, иначе оригинал)
    const translateValue = (v: string): string => {
      const trimmed = String(v).trim()
      // Если значение состоит из одного слова и есть в словаре — переводим
      if (trimmed && ANAMNESIS_VALUES[trimmed]) {
        return ANAMNESIS_VALUES[trimmed]
      }
      return v
    }

    const anamnesisEntries = Object.entries(anamnesis).filter(([, v]) => v && String(v).trim())
    if (anamnesisEntries.length > 0) {
      anamnesisEntries.forEach(([k, v]) => {
        const label = ANAMNESIS_LABELS[k] || k  // Если нет перевода — английский ключ (фоллбэк)
        const value = translateValue(String(v))
        html += line(label, value)
      })
    } else {
      html += '<p>Анамнез не заполнен</p>'
    }
    html += gap()

    // Осмотр по системам — без таблиц, просто строки "Параметр: статус — значение"
    html += '<div class="section">Осмотр по системам</div>'
    let hasExamData = false
    for (const system of examinationSystems) {
      const params = examination[system.id] || []
      // 🆕 Пропускаем параметры со статусом "не оценено" — не включаем в выписку
      const evaluated = params.filter((p) => p.status && p.status !== 'not_evaluated')
      if (evaluated.length === 0) continue
      hasExamData = true
      html += `<div class="sub-section">${system.name}</div>`
      for (const p of evaluated) {
        const statusLabel = p.status === 'normal' ? 'Норма' : 'Отклонение'
        let val = ''
        if (p.status === 'normal') {
          // 🆕 Для нормы — подставляем значение нормы из examinationData
          val = safeGetNormalForSpecies(p.id, system.id, patient.species) || 'в норме'
          if (p.notes) {
            val = `${val} (${p.notes})`
          }
        } else if (p.status === 'deviation') {
          val = p.deviationValue || 'отклонение'
          if (p.notes) {
            val = val ? `${val} (${p.notes})` : p.notes
          }
        }
        html += line(p.name, `${statusLabel}${val ? ' — ' + val : ''}`)
      }
      html += gap()
    }
    if (!hasExamData) {
      html += '<p>Данные осмотра не заполнены</p>'
      html += gap()
    }

    // Аускультация сердца — без <ul>, просто строки
    if (auscultation.rhythm || auscultation.bpm || auscultation.murmurs || auscultation.notes) {
      html += '<div class="section">Аускультация сердца</div>'
      html += line('Ритм', auscultation.rhythm)
      html += line('ЧСС', auscultation.bpm ? `${auscultation.bpm} уд/мин` : '—')
      html += line('Шумы', auscultation.murmurs)
      html += line('Комментарий', auscultation.notes)
      html += gap()
    }

    // Загруженные исследования (OCR)
    const scansWithText = scans.filter((s) => s.ocrText)
    if (scansWithText.length > 0) {
      html += '<div class="section">Загруженные исследования</div>'
      scansWithText.forEach((s, i) => {
        html += `<div class="sub-section">${i + 1}. ${escapeHtml(s.name)}</div>`
        html += `<div class="text-block">${escapeHtml(s.ocrText)}</div>`
      })
      html += gap()
    }

    // Заключение / AI-результаты
    const hasConclusion = results.preliminaryDiagnoses || results.plannedExaminations || results.mandatoryDiagnostics || results.additionalDiagnostics || results.preliminaryPrescriptions || results.recommendations || aiResult
    if (hasConclusion) {
      html += '<div class="section">Заключение</div>'

      // AI-заключение — выводим ПЕРВЫМ как единый блок (если есть)
      if (aiResult) {
        // Разобьём AI-ответ по заголовкам ### и вставим как subsection + text
        const aiSections = aiResult.split(/^###\s+/m)
        for (const sec of aiSections) {
          const trimmed = sec.trim()
          if (!trimmed) continue
          // Первый абзац до \n — заголовок
          const nlIdx = trimmed.indexOf('\n')
          if (nlIdx > 0 && nlIdx < 100) {
            const heading = trimmed.substring(0, nlIdx).trim()
            const body = trimmed.substring(nlIdx + 1).trim()
            html += `<div class="sub-section">${escapeHtml(heading)}</div>`
            html += `<div class="text-block">${escapeHtml(body)}</div>`
          } else {
            // Без явного заголовка — выводим как есть
            html += `<div class="text-block">${escapeHtml(trimmed)}</div>`
          }
        }
        html += gap()
      }

      // Ручные поля (если врач что-то дописал)
      if (results.preliminaryDiagnoses) {
        html += '<div class="sub-section">Предварительные диагнозы</div>'
        html += `<div class="text-block">${escapeHtml(results.preliminaryDiagnoses)}</div>`
      }
      if (results.plannedExaminations) {
        html += '<div class="sub-section">Плановые обследования</div>'
        html += `<div class="text-block">${escapeHtml(results.plannedExaminations)}</div>`
      }
      if (results.mandatoryDiagnostics) {
        html += '<div class="sub-section">Обязательная лабораторная и инструментальная диагностика</div>'
        html += `<div class="text-block">${escapeHtml(results.mandatoryDiagnostics)}</div>`
      }
      if (results.additionalDiagnostics) {
        html += '<div class="sub-section">Дополнительная визуализационная диагностика</div>'
        html += `<div class="text-block">${escapeHtml(results.additionalDiagnostics)}</div>`
      }
      if (results.preliminaryPrescriptions) {
        html += '<div class="sub-section">Предварительные назначения (терапия)</div>'
        html += `<div class="text-block">${escapeHtml(results.preliminaryPrescriptions)}</div>`
      }
      if (results.recommendations) {
        html += '<div class="sub-section">Рекомендации</div>'
        html += `<div class="text-block">${escapeHtml(results.recommendations)}</div>`
      }
    }

    html += '<div class="footer">Ассистент УшиХвост — вспомогательный инструмент врача. Окончательный диагноз ставится врачом после очной консультации.</div>'

    html += `
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 500);
  };
</script>
</body>
</html>`

    // Открываем в новом окне и печатаем
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
    } else {
      alert('Разрешите всплывающие окна для печати PDF')
    }
  }

  // 🆕 Экспорт протокола в JPEG (через canvas — рендерим HTML в изображение)
  const exportProtocolJPEG = async () => {
    const duration =
      visitEndedAt !== null && visitStartedAt !== null
        ? visitDurationMs
        : visitStartedAt !== null
        ? Date.now() - visitStartedAt
        : 0

    const formatDuration = (ms: number): string => {
      const totalSeconds = Math.floor(ms / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const pad = (n: number) => n.toString().padStart(2, '0')
      if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      return `${pad(minutes)}:${pad(seconds)}`
    }

    // Динамический импорт html2canvas
    const html2canvas = (await import('html2canvas')).default

    // Создаём временный контейнер с протоколом
    const container = document.createElement('div')
    container.style.cssText = `
      position: absolute; left: -9999px; top: 0;
      width: 800px; padding: 40px; background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a; line-height: 1.5;
    `
    container.innerHTML = `
      <div style="border-bottom: 3px solid #047857; padding-bottom: 8px; margin-bottom: 20px;">
        <h1 style="color: #047857; font-size: 22px; margin: 0;">Ветеринарный протокол</h1>
        <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">Сформирован: ${new Date().toLocaleString('ru-RU')} · Ассистент УшиХвост</p>
      </div>

      <h2 style="color: #047857; font-size: 16px; margin: 20px 0 8px;">Пациент</h2>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 8px 0;">
        <p><strong>Вид:</strong> ${patient.species === 'dog' ? 'Собака' : patient.species === 'cat' ? 'Кошка' : 'Другое'}</p>
        <p><strong>Вес:</strong> ${patient.weight || '—'} кг</p>
        <p><strong>Дата приёма:</strong> ${patient.visitDate || '—'}</p>
        <p><strong>Длительность приёма:</strong> ${formatDuration(duration)}</p>
      </div>

      ${results.preliminaryDiagnoses ? `<h2 style="color: #047857; font-size: 16px; margin: 20px 0 8px;">Предварительные диагнозы</h2><p style="white-space: pre-wrap;">${escapeHtml(results.preliminaryDiagnoses)}</p>` : ''}
      ${results.plannedExaminations ? `<h2 style="color: #047857; font-size: 16px; margin: 20px 0 8px;">Плановые обследования</h2><p style="white-space: pre-wrap;">${escapeHtml(results.plannedExaminations)}</p>` : ''}
      ${results.mandatoryDiagnostics ? `<h2 style="color: #047857; font-size: 16px; margin: 20px 0 8px;">Обязательная лабораторная и инструментальная диагностика</h2><p style="white-space: pre-wrap;">${escapeHtml(results.mandatoryDiagnostics)}</p>` : ''}
      ${results.additionalDiagnostics ? `<h2 style="color: #047857; font-size: 16px; margin: 20px 0 8px;">Дополнительная визуализационная диагностика</h2><p style="white-space: pre-wrap;">${escapeHtml(results.additionalDiagnostics)}</p>` : ''}
      ${results.preliminaryPrescriptions ? `<h2 style="color: #047857; font-size: 16px; margin: 20px 0 8px;">Предварительные назначения (терапия)</h2><p style="white-space: pre-wrap;">${escapeHtml(results.preliminaryPrescriptions)}</p>` : ''}
      ${results.recommendations ? `<h2 style="color: #047857; font-size: 16px; margin: 20px 0 8px;">Рекомендации</h2><p style="white-space: pre-wrap;">${escapeHtml(results.recommendations)}</p>` : ''}
      ${aiResult ? `<h2 style="color: #047857; font-size: 16px; margin: 20px 0 8px;">AI-заключение</h2><div style="white-space: pre-wrap;">${escapeHtml(aiResult)}</div>` : ''}

      <div style="margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center;">
        🐾 Ассистент УшиХвост — вспомогательный инструмент врача.
      </div>
    `
    document.body.appendChild(container)

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `protocol-${patient.species}-${new Date().toISOString().split('T')[0]}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (e) {
      alert('Ошибка создания JPEG: ' + (e instanceof Error ? e.message : ''))
    } finally {
      document.body.removeChild(container)
    }
  }

  // 🆕 Экспорт протокола в Word (DOCX) — текстовая структура как PDF
  const exportProtocolDOCX = () => {
    const duration =
      visitEndedAt !== null && visitStartedAt !== null
        ? visitDurationMs
        : visitStartedAt !== null
        ? Date.now() - visitStartedAt
        : 0

    const formatDuration = (ms: number): string => {
      const totalSeconds = Math.floor(ms / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const pad = (n: number) => n.toString().padStart(2, '0')
      if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      return `${pad(minutes)}:${pad(seconds)}`
    }

    // Хелпер: строка "<strong>Метка:</strong> значение"
    const line = (label: string, value: string | number | null | undefined) => {
      const v = value == null || value === '' ? '—' : String(value)
      return `<p><strong>${label}:</strong> ${escapeHtml(v)}</p>`
    }

    // Словари для перевода (повторяем для DOCX)
    const ANAMNESIS_LABELS_DOCX: Record<string, string> = {
      livingConditions: 'Где живёт',
      outdoorAccess: 'Доступ на улицу / режим прогулок',
      otherAnimals: 'Другие животные дома',
      contactsStrangers: 'Контакты с чужими животными',
      caretaker: 'Кто ухаживает',
      decisionMaker: 'Кто принимает решения по лечению',
      physicalActivity: 'Физическая нагрузка',
      dietType: 'Тип рациона',
      dietBrand: 'Бренд / линейка корма',
      feedingFreq: 'Частота кормления',
      feedingVolume: 'Объём кормления',
      treats: 'Лакомства',
      supplements: 'Добавки / витамины',
      dietChanges: 'Изменения рациона недавно',
      tableFoodAccess: 'Доступ к корму со стола',
      trashAccess: 'Доступ к мусору',
      waterSource: 'Источник воды',
      waterChangeFreq: 'Как часто меняют воду',
      waterIntake: 'Сколько пьёт (оценка владельца)',
      vaccination: 'Вакцинация (препарат)',
      vaccinationDate: 'Дата последней вакцинации',
      fleaTickTreatment: 'Обработка от блох/клещей (препарат)',
      fleaTickDate: 'Дата последней обработки от блох/клещей',
      deworming: 'Дегельминтизация (препарат)',
      dewormingDate: 'Дата последней дегельминтизации',
      neutered: 'Кастрация / стерилизация',
      neuteredDate: 'Дата операции',
      neuteredComplications: 'Осложнения после операции',
      mainComplaint: 'Что именно беспокоит? С чего началось?',
      complaintOnset: 'Когда заметили первые признаки',
      complaintDevelopment: 'Как развивались симптомы',
      associatedFactors: 'С чем владелец связывает начало',
      previousEpisodes: 'Была ли такая проблема раньше, исход',
      previousTreatment: 'Какая помощь уже оказана по текущей проблеме',
      currentTreatment: 'Текущее лечение (постоянные препараты)',
      currentTreatmentEffect: 'Эффект от текущего лечения',
      generalStatus: 'Общее состояние: активность, вес, лихорадка, поведение',
      coughDyspnea: 'Кашель / одышка: характер, при нагрузке/ночью, выделения',
      polyuriaPolydipsia: 'Полиурия / полидипсия',
      appetiteGi: 'Аппетит / ЖКТ: аппетит, рвота, стул, доступ к инородному',
      urogenital: 'Мочеполовая: частота, характер, цвет, недержание, течки',
      skin: 'Кожа / шерсть: зуд, расчёсы, алопеция, перхоть, паразиты',
      nervous: 'Нервная / органы чувств: судороги, шаткость, наклон головы, глаза',
      musculoskeletal: 'Опорно-двигательный: хромота, нежелание прыгать, травмы',
      travel: 'Поездки, выставки, передержки, груминг',
      exhibitions: 'Выставки',
      boarding: 'Передержки',
      grooming: 'Груминг',
      sickAnimalsNearby: 'Больные животные в доме/подъезде',
      walkingArea: 'Для собак: где гуляет, контакт с дикими/падалью/грызунами',
      wildlifeContact: 'Контакт с дикими животными',
      huntingBehavior: 'Для кошек: охота, вода из луж/туалета',
      previousDiseases: 'Предыдущие заболевания',
      surgeries: 'Операции',
      chronicDiseases: 'Хронические заболевания',
      permanentMedications: 'Постоянные препараты',
      allergies: 'Аллергии',
      anesthesiaIssues: 'Проблемы с анестезией',
      firstEstrus: 'Первая течка',
      estrusRegularity: 'Регулярность течки',
      estrusDuration: 'Длительность течки',
      falsePregnancies: 'Ложные беременности',
      pyometra: 'Пиометра',
      births: 'Роды',
      breedingMales: 'Случки с котами/кобелями',
      prostateIssues: 'Проблемы с простатой',
    }
    const ANAMNESIS_VALUES_DOCX: Record<string, string> = {
      apartment: 'Квартира',
      house: 'Частный дом',
      aviary: 'Вольер',
      street: 'Уличное содержание',
      shelter: 'Приют',
      commercial: 'Промышленный корм',
      natural: 'Натуральное кормление',
      mixed: 'Смешанный',
      raw: 'RAW / BARF',
      '1': '1 раз в день',
      '2': '2 раза в день',
      '3': '3 раза в день',
      free: 'Свободный доступ',
      no: 'Нет',
      yes: 'Да',
      occasionally: 'Иногда',
      sometimes: 'Иногда',
      'true': 'Да',
      'false': 'Нет',
    }
    const translateValueDocx = (v: string): string => {
      const trimmed = String(v).trim()
      if (trimmed && ANAMNESIS_VALUES_DOCX[trimmed]) {
        return ANAMNESIS_VALUES_DOCX[trimmed]
      }
      return v
    }

    // DOCX — это ZIP с XML внутри. Создаём минимальный Word-совместимый HTML
    // со структурой как PDF: без таблиц, метки жирные, разделы с подчёркиванием.
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<title>Выписка из медицинской карты — Ассистент УшиХвост</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page { margin: 2cm; size: A4; }
body { font-family: 'Times New Roman', 'Liberation Serif', serif; font-size: 12pt; line-height: 1.55; color: #000; }
.doc-title { text-align: center; font-size: 18pt; font-weight: bold; margin: 8pt 0 24pt 0; text-transform: uppercase; }
.meta { text-align: center; color: #555; font-size: 10pt; margin-top: -16pt; margin-bottom: 18pt; }
.section { font-size: 14pt; font-weight: bold; margin: 18pt 0 6pt 0; padding-bottom: 3pt; border-bottom: 1px solid #888; }
.sub-section { text-align: center; font-size: 13pt; font-weight: bold; margin: 14pt 0 8pt 0; }
.text-block { margin: 4pt 0 10pt 0; white-space: pre-wrap; }
p { margin: 2pt 0; }
strong { font-weight: bold; }
.footer { margin-top: 40pt; padding-top: 8pt; border-top: 1px solid #aaa; font-size: 9pt; color: #666; text-align: center; }
</style>
</head>
<body>

<div class="doc-title">Выписка из медицинской карты животного</div>
<p class="meta">${new Date().toLocaleString('ru-RU')}</p>

<div class="section">Данные пациента</div>
${line('Вид животного', patient.species === 'dog' ? 'Собака' : patient.species === 'cat' ? 'Кошка' : 'Другое')}
${line('Вес', patient.weight ? `${patient.weight} кг` : '—')}
${line('Дата приёма', patient.visitDate || '—')}
${line('Длительность приёма', formatDuration(duration))}
<p>&nbsp;</p>

<div class="section">Анамнез</div>
${(() => {
  const anamnesisEntries = Object.entries(anamnesis).filter(([, v]) => v && String(v).trim())
  if (anamnesisEntries.length === 0) return '<p>Анамнез не заполнен</p>'
  return anamnesisEntries.map(([k, v]) => {
    const label = ANAMNESIS_LABELS_DOCX[k] || k
    const value = translateValueDocx(String(v))
    return line(label, value)
  }).join('')
})()}
<p>&nbsp;</p>

<div class="section">Осмотр по системам</div>
${(() => {
  let examHtml = ''
  let hasExamData = false
  for (const system of examinationSystems) {
    const params = examination[system.id] || []
    const evaluated = params.filter((p) => p.status && p.status !== 'not_evaluated')
    if (evaluated.length === 0) continue
    hasExamData = true
    examHtml += `<div class="sub-section">${system.name}</div>`
    for (const p of evaluated) {
      const statusLabel = p.status === 'normal' ? 'Норма' : 'Отклонение'
      let val = ''
      if (p.status === 'normal') {
        val = safeGetNormalForSpecies(p.id, system.id, patient.species) || 'в норме'
        if (p.notes) val = `\${val} (\${p.notes})`
      } else if (p.status === 'deviation') {
        val = p.deviationValue || 'отклонение'
        if (p.notes) val = val ? `\${val} (\${p.notes})` : p.notes
      }
      examHtml += line(p.name, `\${statusLabel}\${val ? ' — ' + val : ''}`)
    }
    examHtml += '<p>&nbsp;</p>'
  }
  if (!hasExamData) examHtml = '<p>Данные осмотра не заполнены</p><p>&nbsp;</p>'
  return examHtml
})()}

${(auscultation.rhythm || auscultation.bpm || auscultation.murmurs || auscultation.notes) ? `
<div class="section">Аускультация сердца</div>
${line('Ритм', auscultation.rhythm)}
${line('ЧСС', auscultation.bpm ? `${auscultation.bpm} уд/мин` : '—')}
${line('Шумы', auscultation.murmurs)}
${line('Комментарий', auscultation.notes)}
<p>&nbsp;</p>
` : ''}

${(() => {
  const scansWithText = scans.filter((s) => s.ocrText)
  if (scansWithText.length === 0) return ''
  let scanHtml = '<div class="section">Загруженные исследования</div>'
  scansWithText.forEach((s, i) => {
    scanHtml += `<div class="sub-section">${i + 1}. ${escapeHtml(s.name)}</div>`
    scanHtml += `<div class="text-block">${escapeHtml(s.ocrText)}</div>`
  })
  scanHtml += '<p>&nbsp;</p>'
  return scanHtml
})()}

${(() => {
  const hasConclusion = results.preliminaryDiagnoses || results.plannedExaminations || results.mandatoryDiagnostics || results.additionalDiagnostics || results.preliminaryPrescriptions || results.recommendations || aiResult
  if (!hasConclusion) return ''
  let cHtml = '<div class="section">Заключение</div>'
  // AI-заключение — выводим ПЕРВЫМ, разбиваем по ###
  if (aiResult) {
    const aiSections = aiResult.split(/^###\\s+/m)
    for (const sec of aiSections) {
      const trimmed = sec.trim()
      if (!trimmed) continue
      const nlIdx = trimmed.indexOf('\\n')
      if (nlIdx > 0 && nlIdx < 100) {
        const heading = trimmed.substring(0, nlIdx).trim()
        const body = trimmed.substring(nlIdx + 1).trim()
        cHtml += `<div class="sub-section">${escapeHtml(heading)}</div>`
        cHtml += `<div class="text-block">${escapeHtml(body)}</div>`
      } else {
        cHtml += `<div class="text-block">${escapeHtml(trimmed)}</div>`
      }
    }
    cHtml += '<p>&nbsp;</p>'
  }
  if (results.preliminaryDiagnoses) {
    cHtml += '<div class="sub-section">Предварительные диагнозы</div>'
    cHtml += `<div class="text-block">${escapeHtml(results.preliminaryDiagnoses)}</div>`
  }
  if (results.plannedExaminations) {
    cHtml += '<div class="sub-section">Плановые обследования</div>'
    cHtml += `<div class="text-block">${escapeHtml(results.plannedExaminations)}</div>`
  }
  if (results.mandatoryDiagnostics) {
    cHtml += '<div class="sub-section">Обязательная лабораторная и инструментальная диагностика</div>'
    cHtml += `<div class="text-block">${escapeHtml(results.mandatoryDiagnostics)}</div>`
  }
  if (results.additionalDiagnostics) {
    cHtml += '<div class="sub-section">Дополнительная визуализационная диагностика</div>'
    cHtml += `<div class="text-block">${escapeHtml(results.additionalDiagnostics)}</div>`
  }
  if (results.preliminaryPrescriptions) {
    cHtml += '<div class="sub-section">Предварительные назначения (терапия)</div>'
    cHtml += `<div class="text-block">${escapeHtml(results.preliminaryPrescriptions)}</div>`
  }
  if (results.recommendations) {
    cHtml += '<div class="sub-section">Рекомендации</div>'
    cHtml += `<div class="text-block">${escapeHtml(results.recommendations)}</div>`
  }
  return cHtml
})()}

<div class="footer">Ассистент УшиХвост — вспомогательный инструмент врача. Окончательный диагноз ставится врачом после очной консультации.</div>
</body>
</html>`

    // Blob с MIME типом Word
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vypiska-${patient.species}-${new Date().toISOString().split('T')[0]}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Сводка */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-600" />
            Сводка осмотра
          </CardTitle>
          <CardDescription>
            Статистика по заполненным параметрам перед формированием заключения
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
              <div className="text-2xl font-bold text-rose-700">{deviations.length}</div>
              <div className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Отклонений
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <div className="text-2xl font-bold text-emerald-700">{normalFindings.length}</div>
              <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> В норме
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div className="text-2xl font-bold text-slate-700">{notEvaluated.length}</div>
              <div className="text-xs text-slate-600 mt-1">
                Не оценено
              </div>
            </div>
            <div className="rounded-lg bg-violet-50 border border-violet-200 p-3">
              <div className="text-2xl font-bold text-violet-700">{scans.length}</div>
              <div className="text-xs text-violet-600 mt-1">
                Загружено исследований
              </div>
            </div>
          </div>

          {deviations.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                Выявленные отклонения
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {deviations.map((d, i) => {
                  const systemName = examinationSystems.find((s) =>
                    (examination[s.id] || []).some((p) => p.id === d.id)
                  )?.name || ''
                  return (
                    <Badge
                      key={i}
                      variant="outline"
                      className="bg-rose-50 text-rose-700 border-rose-300"
                    >
                      {systemName}: {d.name} — {d.deviationValue || 'отклонение'}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI-генерация */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-violet-50/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            AI-заключение: дифдиагнозы и план обследований
          </CardTitle>
          <CardDescription>
            На основе анамнеза, данных осмотра и загруженных исследований
            сформировать предварительные диагнозы, рекомендуемый план обследований
            и тактику симптоматической терапии
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={generateAiResults}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Генерация…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Сгенерировать заключение
                </>
              )}
            </Button>
            {generatedAt && !loading && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Сгенерировано: {new Date(generatedAt).toLocaleString('ru-RU')}
              </span>
            )}
          </div>

          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-3 whitespace-pre-wrap">
              {error}
            </div>
          )}

          {aiResult && (
            <div className="rounded-lg border bg-card p-4 max-h-[600px] overflow-y-auto">
              <div className="prose prose-sm max-w-none text-foreground">
                <ReactMarkdown
                  components={{
                    h3: ({ children }) => {
                      const text = String(children)
                      const isPrescriptions = text.toLowerCase().includes('предварительные назначения') || text.toLowerCase().includes('терапия')
                      return (
                        <h3
                          className={`text-base font-semibold mt-4 mb-2 pb-1 border-b ${
                            isPrescriptions
                              ? 'text-sky-700 border-sky-300 bg-sky-50/50 px-2 py-1 rounded flex items-center gap-1.5'
                              : 'text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isPrescriptions && <Pill className="h-4 w-4 inline" />}
                          {children}
                        </h3>
                      )
                    },
                    p: ({ children }) => (
                      <p className="text-sm leading-relaxed mb-2">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="text-sm leading-relaxed list-disc pl-5 mb-2 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="text-sm leading-relaxed list-decimal pl-5 mb-2 space-y-1">
                        {children}
                      </ol>
                    ),
                  }}
                >
                  {aiResult}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {!aiResult && !loading && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Нажмите «Сгенерировать заключение», чтобы получить структурированные
              дифференциальные диагнозы и план обследований на основе введённых данных
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ручные поля — врач может дополнить */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-emerald-600" />
            Заключение врача
          </CardTitle>
          <CardDescription>
            Ручное редактирование разделов — врач может дополнить или скорректировать AI-заключение
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-rose-600" />
              Предварительные дифференциальные диагнозы
            </Label>
            <Textarea
              rows={5}
              value={results.preliminaryDiagnoses}
              onChange={(e) => handleSaveManual('preliminaryDiagnoses', e.target.value)}
              placeholder="Напр.: 1. Острый панкреатит (высокая) — рвота, болезненность живота.&#10;2. Инородное тело ЖКТ (средняя)..."
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-sky-600" />
              Плановые обследования
            </Label>
            <Textarea
              rows={5}
              value={results.plannedExaminations}
              onChange={(e) => handleSaveManual('plannedExaminations', e.target.value)}
              placeholder="Напр.: 1. ОАК + биохимия крови — подтвердить/исключить воспаление и обезвоживание.&#10;2. УЗИ брюшной полости..."
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-rose-600" />
              Рекомендации по обязательной лабораторной и инструментальной диагностике
            </Label>
            <Textarea
              rows={5}
              value={results.mandatoryDiagnostics}
              onChange={(e) => handleSaveManual('mandatoryDiagnostics', e.target.value)}
              placeholder="Напр.:&#10;1. ОАК — лейкоцитарная формула, СОЭ&#10;2. Биохимия: АЛТ, АСТ, креатинин, мочевина, глюкоза&#10;3. Общий анализ мочи&#10;4. Коагулограмма&#10;5. ЭКГ..."
            />
            <div className="text-xs text-muted-foreground italic">
              💡 Обязательные исследования для подтверждения/исключения дифференциальных диагнозов.
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-amber-600" />
              Дополнительная визуализационная диагностика
            </Label>
            <Textarea
              rows={5}
              value={results.additionalDiagnostics}
              onChange={(e) => handleSaveManual('additionalDiagnostics', e.target.value)}
              placeholder="Напр.:&#10;1. УЗИ брюшной полости — оценка органов ЖКТ&#10;2. Рентгенография грудной клетки — исключить пневмонию&#10;3. КТ — при подозрении на новообразование&#10;4. ЭхоКГ — при кардиальной патологии..."
            />
            <div className="text-xs text-muted-foreground italic">
              💡 Дополнительные визуализационные методы для углублённой диагностики (по показаниям).
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-sky-600" />
              Предварительные назначения (терапия лекарственными средствами)
              {patient.weight && (
                <Badge variant="outline" className="ml-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-300">
                  Расчёт по весу {patient.weight} кг
                </Badge>
              )}
            </Label>
            <Textarea
              rows={8}
              value={results.preliminaryPrescriptions}
              onChange={(e) => handleSaveManual('preliminaryPrescriptions', e.target.value)}
              placeholder={
                patient.weight
                  ? "Напр.:&#10;1. Маропитант (Серенния) — 1 мг/кг × " + patient.weight + " кг = " + (parseFloat(patient.weight) * 1).toFixed(1) + " мг — 1 раз/день — п/к — показание: рвота — 3-5 дней&#10;2. Рингер-лактат — 30 мл/кг × " + patient.weight + " кг = " + (parseFloat(patient.weight) * 30).toFixed(0) + " мл/24ч — в/в капельно — регидратация&#10;3. Амоксициллин/клавуланат — 12.5 мг/кг × " + patient.weight + " кг = " + (parseFloat(patient.weight) * 12.5).toFixed(1) + " мг — 2 раза/день — внутрь — инфекционный процесс — 7 дней"
                  : "Сначала укажите вес пациента в шапке — тогда расчёт дозировок будет автоматическим.&#10;&#10;Напр.: Маропитант — 1 мг/кг × [вес] кг = [доза] мг — 1 раз/день — п/к"
              }
            />
            {/* Кнопка: скопировать AI-назначения в это поле */}
            {aiResult && aiResult.includes('Предварительные назначения') && (
              <Button
                onClick={handleCopyAiPrescriptions}
                size="sm"
                variant="outline"
                className="text-sky-700 hover:text-sky-800 hover:bg-sky-50 border-sky-200"
              >
                <ClipboardCopy className="h-3.5 w-3.5 mr-1.5" />
                Скопировать AI-назначения в это поле
              </Button>
            )}
            <div className="text-xs text-muted-foreground italic">
              💡 Для автоматической генерации с дозировками нажмите «Сгенерировать заключение» выше.
              AI подберёт препараты на основе дифдиагнозов, анамнеза, осмотра и исследований.
              {!patient.weight && ' ⚠️ Укажите вес в шапке — без него расчёт невозможен.'}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Save className="h-4 w-4 text-violet-600" />
              Рекомендации по симптоматической терапии и уходу
            </Label>
            <Textarea
              rows={5}
              value={results.recommendations}
              onChange={(e) => handleSaveManual('recommendations', e.target.value)}
              placeholder="Напр.: 1. Голодная диета 12-24 ч.&#10;2. Инфузионная терапия (Рингер-лактат)..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Действия */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-4">
          <Button type="button" variant="outline" onClick={exportProtocol}>
            <FileDown className="h-4 w-4 mr-2" /> Экспорт в TXT
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={exportProtocolPDF}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <FileText className="h-4 w-4 mr-2" /> Экспорт в PDF (печать)
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={exportProtocolJPEG}
            className="border-sky-300 text-sky-700 hover:bg-sky-50"
          >
            <ImageIcon className="h-4 w-4 mr-2" /> Экспорт в JPEG
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={exportProtocolDOCX}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <FileType className="h-4 w-4 mr-2" /> Экспорт в Word
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setAiResult('')
              setGeneratedAt('')
              setResults({ aiGenerated: '', generatedAt: '' })
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Сбросить заключение
          </Button>
        </CardContent>
      </Card>

      {/* Автоматический подбор препаратов по клинической картине */}
      <SmartDrugRecommender />

      {/* Проверка взаимодействий и противопоказаний */}
      <InteractionChecker />

      {/* Импорт препаратов из CSV (в наличии — приоритет) */}
      <DrugImport />

      {/* История приёмов */}
      <VisitHistory />
    </div>
  )
}
