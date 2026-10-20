import { NextRequest, NextResponse } from 'next/server'
import { getZai } from '@/lib/zai'

// Edge runtime — нет таймаута Vercel Edge CDN (10 сек)
// maxDuration работает напрямую с Edge runtime



interface GenerateResultsBody {
  patient: {
    species: string
    weight: string
    visitDate?: string
  }
  anamnesis: Record<string, string>
  examination: Array<{
    system: string
    param: string
    status: string
    normalValue: string
    deviationValue: string
    notes: string
  }>
  auscultation: {
    rhythm: string
    bpm: string
    murmurs: string
    notes: string
  }
  scanTexts: string[]
  voiceNotes?: string[] // 🆕 Голосовые заметки при осмотре
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateResultsBody
    const { patient, anamnesis, examination, auscultation, scanTexts } = body

    if (!patient || !anamnesis || !examination) {
      return NextResponse.json(
        { error: 'Неполные данные пациента' },
        { status: 400 }
      )
    }

    const zai = await getZai()

    // Сводка отклонений из осмотра
    const deviations = examination.filter((e) => e.status === 'deviation')
    const normalFindings = examination.filter((e) => e.status === 'normal')

    const deviationsSummary = deviations
      .map(
        (d) =>
          `- ${d.system} / ${d.param}: ${d.deviationValue || 'отклонение'}${
            d.notes ? ` (примечание: ${d.notes})` : ''
          }`
      )
      .join('\n')

    const normalSummary = normalFindings
      .map((d) => `${d.system}/${d.param}`)
      .join(', ')

    // Сводка анамнеза (только заполненные поля)
    const anamnesisSummary = Object.entries(anamnesis)
      .filter(([, v]) => v && v.trim().length > 0)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n')

    const scanSummary = scanTexts.filter((t) => t && t.trim()).join('\n\n---\n\n')

    // 🆕 Голосовые заметки врача при осмотре
    const voiceNotesSummary = (body.voiceNotes || [])
      .filter((n) => n && n.trim().length > 0)
      .map((n, i) => `- Заметка ${i + 1}: ${n}`)
      .join('\n')

    const patientWeight = patient.weight ? parseFloat(patient.weight) : 0

    const prompt = `Ты — ветеринарный врач-эксперт с многолетним опытом. На основе представленных данных пациента составь:
1. ПРЕДВАРИТЕЛЬНЫЕ ДИФФЕРЕНЦИАЛЬНЫЕ ДИАГНОЗЫ (3-7 диагнозов, ранжированные по вероятности, с кратким обоснованием)
2. ПЛАНОВЫЕ ОБСЛЕДОВАНИЯ (лабораторные, инструментальные, с указанием цели — что подтвердить/исключить)
3. РЕКОМЕНДАЦИИ ПО ОБЯЗАТЕЛЬНОЙ ЛАБОРАТОРНОЙ И ИНСТРУМЕНТАЛЬНОЙ ДИАГНОСТИКЕ (что необходимо сдать обязательно — ОАК, биохимия, коагулограмма, ЭКГ и т.д.)
4. ДОПОЛНИТЕЛЬНАЯ ВИЗУАЛИЗАЦИОННАЯ ДИАГНОСТИКА (УЗИ, рентген, КТ, МРТ, ЭхоКГ — по показаниям, в зависимости от дифдиагнозов)
5. ПРЕДВАРИТЕЛЬНЫЕ НАЗНАЧЕНИЯ (терапия лекарственными средствами) — НА ОСНОВАНИИ ДИФФЕРЕНЦИАЛЬНЫХ ДИАГНОЗОВ, С УЧЁТОМ АНАМНЕЗА, ОСМОТРА И ИССЛЕДОВАНИЙ. ДЛЯ КАЖДОГО ПРЕПАРАТА УКАЖИ КОНКРЕТНУЮ ДОЗИРОВКУ ПО ВЕСУ ПАЦИЕНТА.
6. РЕКОМЕНДАЦИИ ПО СИМПТОМАТИЧЕСКОЙ ТЕРАПИИ И УХОДУ (до получения результатов обследований)

Пациент:
- Вид: ${patient.species === 'dog' ? 'Собака' : patient.species === 'cat' ? 'Кошка' : 'Другое'}
- Вес: ${patient.weight || '—'} кг
- Дата приёма: ${patient.visitDate || '—'}

АНAMНЕЗ:
${anamnesisSummary || 'нет данных'}

ОСМОТР — НАХОДКИ С ОТКЛОНЕНИЯМИ:
${deviationsSummary || 'отклонений не выявлено'}

ОСМОТР — НОРМА:
${normalSummary || 'не оценивалось'}

АУСКУЛЬТАЦИЯ СЕРДЦА:
- Ритм: ${auscultation.rhythm || 'не зафиксирован'}
- ЧСС: ${auscultation.bpm || '—'}
- Шумы: ${auscultation.murmurs || 'нет'}
- Комментарий: ${auscultation.notes || 'нет'}

РЕЗУЛЬТАТЫ ИССЛЕДОВАНИЙ (OCR сканов):
${scanSummary || 'нет загруженных исследований'}

ГОЛОСОВЫЕ ЗАМЕТКИ ВРАЧА ПРИ ОСМОТРЕ (учитывай обязательно!):
${voiceNotesSummary || 'нет голосовых заметок'}

ОТВЕТ ДАЙ В СТРОГО СТРУКТУРИРОВАННОМ ВИДЕ С РАЗДЕЛАМИ:

### Дифференциальные диагнозы
1. [Диагноз] — [вероятность: высокая/средняя/низкая] — [обоснование в 1-2 предложениях]
...

### План обследований
1. [Обследование] — [цель]
...

### Обязательная лабораторная и инструментальная диагностика
1. [Анализ/исследование] — [что показывает, для чего обязательно]
...

### Дополнительная визуализационная диагностика
1. [Метод визуализации: УЗИ/рентген/КТ/ЭхоКГ] — [показание, что ожидаем увидеть]
...

### Предварительные назначения (терапия)
Для каждого препарата укажи:
- Название (действующее вещество)
- Дозировка: [мг/кг] × [вес ${patient.weight || '?'} кг] = [расчётная доза в мг]
- Кратность: [сколько раз в день]
- Путь введения: [внутрь / в/в / п/к / в/м]
- Показание: [к какому диагнозу из дифференциальных относится]
- Длительность курса
- Противопоказания (учитывая состояние пациента из осмотра и исследований)
- Взаимодействия с другими назначенными препаратами из этого списка

⚠️ ВАЖНО — проверь сочетаемость всех назначаемых препаратов между собой!
Особенно критичные комбинации, которых нужно ИЗБЕГАТЬ:
- НПВС (мелоксикам, карпрофен) + Глюкокортикоиды (преднизолон, дексаметазон) = риск язв ЖКТ
- НПВС + Другие НПВС = аддитивная токсичность
- Фуросемид + Аминогликозиды = ото- и нефротоксичность
- Трамадол + ИМАО/СИОЗС = серотониновый синдром
- Цефтриаксон + Растворы с кальцием = преципитация
- Энрофлоксацин + Препараты с Mg/Al/Ca = снижение абсорбции
- Метоклопрамид + Опиоиды = снижение прокинетического эффекта

Пример:
1. Маропитант (Серенния) — 1 мг/кг × ${patient.weight || '?'} кг = ${patientWeight ? (1 * patientWeight).toFixed(1) + ' мг' : '?'} — 1 раз/день — п/к — показание: рвота (гастрит?) — 3-5 дней — не смешивать в одном шприце — ⚠️ нельзя с другими NK1-антагонистами

Выбери 3-7 препаратов в зависимости от клинической картины и дифференциальных диагнозов.
Учитывай вид пациента (${patient.species === 'cat' ? 'Кошка: метаболизм отличается, многие препараты нельзя — например, парацетамол, карпрофен' : 'Собака: стандартные дозировки'}) и вес для расчёта.
Проверяй противопоказания каждого препарата с состоянием пациента (из осмотра: ХБП, печёночная, сердечная, беременность, обструкция ЖКТ, судороги, риск кровотечения).
Если вес не указан — укажи только мг/кг и отметь "необходим расчёт по весу".

### Предупреждения о взаимодействиях
Если между выбранными препаратами есть критичные или опасные взаимодействия — опиши их кратко здесь.
Если критичных нет — напиши "Критичных взаимодействий не выявлено".

### Рекомендации
1. [Рекомендация]
...`

    const completion = await zai.chat.completions.create({
      model: 'glm-4.5-air',
      messages: [
        {
          role: 'system',
          content:
            'Ты ветеринарный эксперт-консультант. Отвечаешь строго по теме, на русском языке, в медицинском стиле. Назначаешь конкретные препараты с расчётом дозировки по весу пациента, но ОБЯЗАТЕЛЬНО добавляешь пометку, что окончательное решение принимает врач после очной консультации. Учитывай вид пациента (собака/кошка) — у кошек много препаратов противопоказано (парацетамол, карпрофен). Все дозировки указывай в мг/кг × вес = расчётная доза.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      thinking: { type: 'disabled' },
    })

    const text =
      completion?.choices?.[0]?.message?.content ||
      'Не удалось сгенерировать заключение'

    return NextResponse.json({
      text,
      deviationsCount: deviations.length,
      normalCount: normalFindings.length,
    })
  } catch (e) {
    console.error('Generate results error:', e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    const isAuthError =
      errorMessage.includes('403') ||
      errorMessage.includes('401') ||
      errorMessage.toLowerCase().includes('unauthorized') ||
      errorMessage.toLowerCase().includes('forbidden') ||
      errorMessage.toLowerCase().includes('api key') ||
      errorMessage.toLowerCase().includes('not set') ||
      errorMessage.toLowerCase().includes('configuration file not found') ||
      errorMessage.toLowerCase().includes('fetch failed') ||
      errorMessage.includes('ECONNREFUSED')

    return NextResponse.json(
      {
        error: isAuthError
          ? 'AI-функция недоступна на этом сервере. Нужно настроить Z.AI API ключ.'
          : 'Ошибка генерации',
        details: errorMessage,
        action: isAuthError
          ? 'Для включения AI-генерации: получите API-ключ на https://z.ai/, создайте файл .z-ai-config в корне проекта (см. .z-ai-config.example) с действующим ключом и API URL, и передеплойте сайт. Либо добавьте переменные окружения в Netlify (Site settings → Environment variables).'
          : undefined,
      },
      { status: isAuthError ? 503 : 500 }
    )
  }
}
