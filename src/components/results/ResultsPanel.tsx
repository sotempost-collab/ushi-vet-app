'use client'

import { useState } from 'react'
import { useVetStore } from '@/store/vetStore'
import { examinationSystems } from '@/data/examinationData'
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

    // Найдём следующий раздел (### Рекомендации) или конец
    const nextSection = aiResult.indexOf('\n### ', sectionStart + 5)
    const sectionText =
      nextSection === -1
        ? aiResult.slice(sectionStart)
        : aiResult.slice(sectionStart, nextSection)

    // Уберём markdown-заголовок, оставим содержимое
    const cleaned = sectionText
      .replace(/^### Предварительные назначения[^\n]*\n/, '')
      .trim()

    // Объединяем с текущим содержимым
    const currentText = results.preliminaryPrescriptions || ''
    const newText = currentText
      ? currentText + '\n\n— AI-генерация —\n' + cleaned
      : cleaned

    setResults({ preliminaryPrescriptions: newText })
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
    Object.entries(anamnesis).forEach(([k, v]) => {
      if (v && String(v).trim()) {
        txt += `- ${k}: ${v}\n`
      }
    })
    txt += `\n`

    txt += `=== ОСМОТР ===\n`
    for (const system of examinationSystems) {
      const params = examination[system.id] || []
      if (params.length === 0) continue
      txt += `\n--- ${system.name} ---\n`
      for (const p of params) {
        if (!p.status) continue
        const statusLabel =
          p.status === 'normal'
            ? 'Норма'
            : p.status === 'deviation'
            ? 'Отклонение'
            : 'Не оценено'
        txt += `• ${p.name}: ${statusLabel}${
          p.deviationValue ? ` — ${p.deviationValue}` : ''
        }${p.notes ? ` (${p.notes})` : ''}\n`
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

    // Строим HTML для печати
    let html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Протокол приёма — Ассистент УшиХвост</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 32px;
    color: #1a1a1a;
    line-height: 1.5;
  }
  h1 { color: #047857; border-bottom: 3px solid #047857; padding-bottom: 8px; font-size: 22px; }
  h2 { color: #047857; margin-top: 24px; font-size: 16px; border-bottom: 1px solid #d1fae5; padding-bottom: 4px; }
  h3 { color: #065f46; font-size: 14px; margin-top: 16px; }
  .meta { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
  .patient-info { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 12px 0; }
  .patient-info strong { color: #047857; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 13px; }
  th { background: #f0fdf4; color: #047857; }
  .deviation { background: #fef2f2; }
  .normal { background: #f0fdf4; }
  ul { padding-left: 20px; }
  li { margin-bottom: 4px; font-size: 13px; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center; }
  @media print {
    body { padding: 0; max-width: none; }
    .no-print { display: none; }
    @page { margin: 2cm; }
  }
</style>
</head>
<body>
<h1>Ветеринарный протокол</h1>
<p class="meta">Сформирован: ${new Date().toLocaleString('ru-RU')} · Ассистент УшиХвост</p>

<h2>Пациент</h2>
<div class="patient-info">
<p><strong>Вид:</strong> ${patient.species === 'dog' ? 'Собака' : patient.species === 'cat' ? 'Кошка' : 'Другое'}</p>
<p><strong>Вес:</strong> ${patient.weight || '—'} кг</p>
<p><strong>Дата приёма:</strong> ${patient.visitDate || '—'}</p>
<p><strong>Длительность приёма:</strong> ${formatDuration(duration)}</p>
</div>

<h2>Анамнез</h2>
`

    const anamnesisEntries = Object.entries(anamnesis).filter(([, v]) => v && String(v).trim())
    if (anamnesisEntries.length > 0) {
      html += '<table><tr><th>Параметр</th><th>Значение</th></tr>'
      anamnesisEntries.forEach(([k, v]) => {
        html += `<tr><td>${k}</td><td>${escapeHtml(v)}</td></tr>`
      })
      html += '</table>'
    } else {
      html += '<p>Анамнез не заполнен</p>'
    }

    html += '<h2>Осмотр по системам</h2>'
    let hasExamData = false
    for (const system of examinationSystems) {
      const params = examination[system.id] || []
      const evaluated = params.filter((p) => p.status)
      if (evaluated.length === 0) continue
      hasExamData = true
      html += `<h3>${system.name}</h3>`
      html += '<table><tr><th>Параметр</th><th>Статус</th><th>Значение/описание</th></tr>'
      for (const p of evaluated) {
        const statusClass = p.status === 'deviation' ? 'deviation' : p.status === 'normal' ? 'normal' : ''
        const statusLabel = p.status === 'normal' ? 'Норма' : p.status === 'deviation' ? 'Отклонение' : 'Не оценено'
        const val = p.deviationValue || (p.status === 'normal' ? 'В норме' : '') + (p.notes ? (p.deviationValue ? ' (' + p.notes + ')' : p.notes) : '')
        html += `<tr class="${statusClass}"><td>${p.name}</td><td>${statusLabel}</td><td>${escapeHtml(val)}</td></tr>`
      }
      html += '</table>'
    }
    if (!hasExamData) {
      html += '<p>Данные осмотра не заполнены</p>'
    }

    // Аускультация
    if (auscultation.rhythm || auscultation.bpm || auscultation.murmurs || auscultation.notes) {
      html += '<h2>Аускультация сердца</h2>'
      html += `<ul>
        <li><strong>Ритм:</strong> ${escapeHtml(auscultation.rhythm || '—')}</li>
        <li><strong>ЧСС:</strong> ${escapeHtml(auscultation.bpm || '—')} уд/мин</li>
        <li><strong>Шумы:</strong> ${escapeHtml(auscultation.murmurs || '—')}</li>
        <li><strong>Комментарий:</strong> ${escapeHtml(auscultation.notes || '—')}</li>
      </ul>`
    }

    // Загруженные исследования
    const scansWithText = scans.filter((s) => s.ocrText)
    if (scansWithText.length > 0) {
      html += '<h2>Загруженные исследования (OCR)</h2>'
      scansWithText.forEach((s, i) => {
        html += `<h3>${i + 1}. ${escapeHtml(s.name)}</h3>`
        html += `<pre style="white-space: pre-wrap; font-family: inherit; font-size: 12px; background: #f9fafb; padding: 8px; border-radius: 4px;">${escapeHtml(s.ocrText)}</pre>`
      })
    }

    // Результаты / заключение
    if (results.preliminaryDiagnoses || results.plannedExaminations || results.preliminaryPrescriptions || results.recommendations || aiResult) {
      html += '<h2>Заключение</h2>'
      if (results.preliminaryDiagnoses) {
        html += '<h3>Предварительные диагнозы</h3>'
        html += `<p style="white-space: pre-wrap;">${escapeHtml(results.preliminaryDiagnoses)}</p>`
      }
      if (results.plannedExaminations) {
        html += '<h3>Плановые обследования</h3>'
        html += `<p style="white-space: pre-wrap;">${escapeHtml(results.plannedExaminations)}</p>`
      }
      if (results.mandatoryDiagnostics) {
        html += '<h3>Обязательная лабораторная и инструментальная диагностика</h3>'
        html += `<p style="white-space: pre-wrap;">${escapeHtml(results.mandatoryDiagnostics)}</p>`
      }
      if (results.additionalDiagnostics) {
        html += '<h3>Дополнительная визуализационная диагностика</h3>'
        html += `<p style="white-space: pre-wrap;">${escapeHtml(results.additionalDiagnostics)}</p>`
      }
      if (results.preliminaryPrescriptions) {
        html += '<h3>Предварительные назначения (терапия)</h3>'
        html += `<p style="white-space: pre-wrap;">${escapeHtml(results.preliminaryPrescriptions)}</p>`
      }
      if (results.recommendations) {
        html += '<h3>Рекомендации</h3>'
        html += `<p style="white-space: pre-wrap;">${escapeHtml(results.recommendations)}</p>`
      }
      if (aiResult) {
        html += '<h3>AI-заключение</h3>'
        html += `<div style="white-space: pre-wrap;">${escapeHtml(aiResult)}</div>`
      }
    }

    html += `<div class="footer">Ассистент УшиХвост — вспомогательный инструмент врача. Окончательный диагноз ставится врачом после очной консультации.</div>`

    html += `
<script>
  window.onload = function() {
    window.print();
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

  // 🆕 Экспорт протокола в Word (DOCX)
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

    // DOCX — это ZIP с XML внутри. Создаём минимальный Word-совместимый HTML.
    // Microsoft Word открывает .doc файлы с HTML-содержимым.
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<title>Ветеринарный протокол — Ассистент УшиХвост</title>
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
body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; }
h1 { color: #047857; font-size: 18pt; border-bottom: 2px solid #047857; padding-bottom: 4pt; }
h2 { color: #047857; font-size: 14pt; margin-top: 16pt; border-bottom: 1px solid #d1fae5; padding-bottom: 2pt; }
.patient { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8pt; margin: 8pt 0; }
.footer { margin-top: 24pt; padding-top: 8pt; border-top: 1px solid #e5e7eb; font-size: 9pt; color: #6b7280; text-align: center; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0; }
td, th { border: 1px solid #ddd; padding: 4pt; font-size: 10pt; }
</style>
</head>
<body>
<h1>Ветеринарный протокол</h1>
<p style="color: #6b7280; font-size: 10pt;">Сформирован: ${new Date().toLocaleString('ru-RU')} · Ассистент УшиХвост</p>

<h2>Пациент</h2>
<div class="patient">
<p><strong>Вид:</strong> ${patient.species === 'dog' ? 'Собака' : patient.species === 'cat' ? 'Кошка' : 'Другое'}</p>
<p><strong>Вес:</strong> ${patient.weight || '—'} кг</p>
<p><strong>Дата приёма:</strong> ${patient.visitDate || '—'}</p>
<p><strong>Длительность приёма:</strong> ${formatDuration(duration)}</p>
</div>

${results.preliminaryDiagnoses ? `<h2>Предварительные диагнозы</h2><p>${escapeHtml(results.preliminaryDiagnoses).replace(/\n/g, '<br>')}</p>` : ''}
${results.plannedExaminations ? `<h2>Плановые обследования</h2><p>${escapeHtml(results.plannedExaminations).replace(/\n/g, '<br>')}</p>` : ''}
${results.mandatoryDiagnostics ? `<h2>Обязательная лабораторная и инструментальная диагностика</h2><p>${escapeHtml(results.mandatoryDiagnostics).replace(/\n/g, '<br>')}</p>` : ''}
${results.additionalDiagnostics ? `<h2>Дополнительная визуализационная диагностика</h2><p>${escapeHtml(results.additionalDiagnostics).replace(/\n/g, '<br>')}</p>` : ''}
${results.preliminaryPrescriptions ? `<h2>Предварительные назначения (терапия)</h2><p>${escapeHtml(results.preliminaryPrescriptions).replace(/\n/g, '<br>')}</p>` : ''}
${results.recommendations ? `<h2>Рекомендации</h2><p>${escapeHtml(results.recommendations).replace(/\n/g, '<br>')}</p>` : ''}
${aiResult ? `<h2>AI-заключение</h2><p>${escapeHtml(aiResult).replace(/\n/g, '<br>')}</p>` : ''}

<div class="footer">🐾 Ассистент УшиХвост — вспомогательный инструмент врача. Окончательный диагноз ставится врачом после очной консультации.</div>
</body>
</html>`

    // Blob с MIME типом Word
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `protocol-${patient.species}-${new Date().toISOString().split('T')[0]}.doc`
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
