// База данных препаратов с дозировками по виду и весу.
// Расширено: добавлены checks противопоказаний и взаимодействий.

export interface DrugInteraction {
  withDrug: string // название препарата (или категории), с которым взаимодействует
  severity: 'critical' | 'warning' | 'caution' // степень опасности
  description: string // что происходит при комбинации
}

export interface DrugDose {
  drug: string
  category: string
  indication: string
  dosePerKg: number // лечебная доза (мг/кг) — основная
  // 🆕 Профилактическая доза (если применимо)
  prophylacticDosePerKg?: number
  prophylacticFrequency?: string
  prophylacticDuration?: string
  frequency: string
  route: string
  notes?: string
  maxDose?: number
  contraindications?: string
  // 🆕 Данные для в/в введения (инфузионный расчёт)
  ivData?: {
    concentrationMgPerMl?: number // концентрация раствора (мг/мл) — если препарат в/в
    dilutionMl?: number // объём разведения (мл физраствора/глюкозы)
    infusionRateMlPerHr?: number // рекомендованная скорость (мл/ч)
    maxInfusionTime?: string // максимальное время инфузии ("30 минут")
    notes?: string // например: "медленно, болюс за 5 минут", "капельно разведя в 250 мл физраствора"
  }
  // Список формальных противопоказаний для проверки
  contraindicatedFor?: Array<'cat' | 'dog' | 'puppy_under_6mo' | 'renal' | 'hepatic' | 'cardiac' | 'pregnant' | 'gi_obstruction' | 'seizures' | 'bleeding'>
  // Список лекарственных взаимодействий
  interactions?: DrugInteraction[]
  // Ключевые слова для подбора по клинической картине
  keywords?: string[]
  // 🆕 Флаг "пользовательский" — добавлен через CSV импорт
  isCustom?: boolean
}

export interface ExaminationParam {
  id: string
  name: string
  unit?: string
  description: string
  normalBySpecies: {
    dog?: string
    cat?: string
    other?: string
  }
  normalRange: string
  deviationOptions: DeviationOption[]
}

export interface DeviationOption {
  value: string
  description: string
}

export function getNormalForSpecies(
  param: ExaminationParam,
  species: 'dog' | 'cat' | 'other'
): string {
  return param.normalBySpecies[species] || param.normalRange
}

export const drugDatabase: DrugDose[] = [
  // === Обезболивающие / НПВС ===
  {
    drug: 'Мелоксикам (Meloxicam)',
    category: 'НПВС / обезболивающее',
    indication: 'Боль, воспаление, артрит, послеоперационная боль',
    dosePerKg: 0.1,
    frequency: '1 раз/день',
    route: 'внутрь (суспензия)',
    notes: 'Собаки: старт 0.1 мг/кг/день, поддерживающая 0.05 мг/кг/день. Кошкам — только суспензия, 0.05 мг/кг/день, коротким курсом (3-5 дней).',
    contraindications: 'Язва ЖКТ, ХБП, печёночная недостаточность, беременность',
    contraindicatedFor: ['renal', 'hepatic', 'pregnant', 'gi_obstruction', 'bleeding'],
    keywords: ['боль', 'воспаление', 'артрит', 'послеоперационный', 'артропатия', 'остеоартрит'],
    interactions: [
      {
        withDrug: 'Глюкокортикоиды (преднизолон, дексаметазон)',
        severity: 'critical',
        description: 'Резко повышается риск желудочно-кишечных язв и кровотечений. Не назначать вместе!',
      },
      {
        withDrug: 'Другие НПВС (карпрофен, фуросемид)',
        severity: 'critical',
        description: 'Аддитивная токсичность для ЖКТ и почек. Не комбинировать!',
      },
      {
        withDrug: 'Антикоагулянты (варфарин, гепарин)',
        severity: 'warning',
        description: 'Усиление антикоагулянтного эффекта, риск кровотечений',
      },
      {
        withDrug: 'Ингибиторы АПФ (бензазеприл)',
        severity: 'warning',
        description: 'Снижение антигипертензивного эффекта, риск ОПП',
      },
      {
        withDrug: 'Фуросемид',
        severity: 'warning',
        description: 'Усиление нефротоксичности, обезвоживание',
      },
    ],
  },
  {
    drug: 'Карпрофен (Carprofen)',
    category: 'НПВС / обезболивающее',
    indication: 'Боль, остеоартрит у собак',
    dosePerKg: 2.2,
    frequency: '2 раза/день',
    route: 'внутрь',
    notes: 'Только для собак. 2.2 мг/кг 2 раза/день или 4.4 мг/кг 1 раз/день.',
    contraindications: 'Кошки (не применять!), язва ЖКТ, ХБП',
    contraindicatedFor: ['cat', 'renal', 'hepatic', 'bleeding', 'gi_obstruction'],
    keywords: ['боль', 'артрит', 'остеоартрит', 'собака', 'хромота'],
    interactions: [
      {
        withDrug: 'Глюкокортикоиды',
        severity: 'critical',
        description: 'Риск желудочно-кишечных язв и кровотечений. Противопоказано!',
      },
      {
        withDrug: 'Другие НПВС',
        severity: 'critical',
        description: 'Не комбинировать с другими НПВС из-за аддитивной токсичности',
      },
      {
        withDrug: 'Фуросемид',
        severity: 'warning',
        description: 'Повышенный риск нефротоксичности',
      },
    ],
  },
  {
    drug: 'Габапентин (Gabapentin)',
    category: 'Нейропатический анальгетик',
    indication: 'Нейропатическая боль, тревожность, доп. при хромоте',
    dosePerKg: 10,
    frequency: '1-3 раза/день',
    route: 'внутрь (капсулы)',
    notes: '10-20 мг/кг. Собаки: 10 мг/кг каждые 8-12 ч. Кошки: 10 мг/кг каждые 12 ч (вечером можно 50-100 мг на кошку). Седативный эффект.',
    keywords: ['боль', 'нейропатическая боль', 'тревожность', 'хромота', 'хроническая боль', 'седация'],
    interactions: [
      {
        withDrug: 'Опиоиды (трамадол, бупренорфин)',
        severity: 'caution',
        description: 'Усиление седативного эффекта, требует коррекции дозы',
      },
      {
        withDrug: 'Антациды (алюминия гидроксид)',
        severity: 'caution',
        description: 'Снижение биодоступности габапентина — принимать с интервалом 2 ч',
      },
    ],
  },
  {
    drug: 'Трамадол (Tramadol)',
    category: 'Опиоидный анальгетик',
    indication: 'Сильная боль, онкология, послеоперационная',
    dosePerKg: 2,
    frequency: '2-3 раза/день',
    route: 'внутрь',
    notes: '2-5 мг/кг. Плохая биодоступность у собак (~10%). Горький — кошки отказываются. Контролируется в РФ.',
    contraindications: 'Приём с ИМАО, эпилепсия',
    contraindicatedFor: ['seizures'],
    keywords: ['сильная боль', 'онкология', 'послеоперационный', 'опиоид', 'боль'],
    interactions: [
      {
        withDrug: 'ИМАО (селегилин)',
        severity: 'critical',
        description: 'Риск серотонинового синдрома! Не назначать вместе.',
      },
      {
        withDrug: 'СИОЗС (флуоксетин)',
        severity: 'warning',
        description: 'Риск серотонинового синдрома',
      },
      {
        withDrug: 'Габапентин',
        severity: 'caution',
        description: 'Усиление седации, корректировать дозу',
      },
    ],
  },
  {
    drug: 'Парацетамол (Acetaminophen)',
    category: 'НПВС / жаропонижающее',
    indication: 'ТОЛЬКО СОБАКИ — боль, лихорадка',
    dosePerKg: 10,
    frequency: '2 раза/день',
    route: 'внутрь',
    notes: '10-15 мг/кг. НЕ ПРИМЕНЯТЬ КОШКАМ — смертельно опасно (метгемоглобинемия, гепатотоксичность).',
    contraindications: 'КОШКИ — абсолютное противопоказание!',
    contraindicatedFor: ['cat', 'hepatic', 'bleeding'],
    keywords: ['лихорадка', 'жаропонижающее', 'собака', 'боль', 'температура'],
    interactions: [
      {
        withDrug: 'Варфарин',
        severity: 'warning',
        description: 'Усиление антикоагулянтного эффекта',
      },
      {
        withDrug: 'Фенобарбитал',
        severity: 'caution',
        description: 'Усиление гепатотоксичности',
      },
    ],
  },

  // === Противорвотные ===
  {
    drug: 'Маропитант (Maropitant, Серенния)',
    category: 'Противорвотное (NK1-антагонист)',
    indication: 'Рвота любого генеза, укачивание, тошнота',
    dosePerKg: 1,
    frequency: '1 раз/день',
    route: 'п/к, в/в, внутрь',
    notes: '1 мг/кг п/к или в/в (собаки и кошки), 2 мг/кг внутрь. Очень эффективный. Болюс при в/в введении медленный (1 мин).',
    contraindications: 'Гиперчувствительность, печёночная патология (осторожно)',
    contraindicatedFor: ['hepatic'],
    keywords: ['рвота', 'тошнота', 'укачивание', 'противорвотное', 'рвота после еды', 'гастрит'],
    interactions: [
      {
        withDrug: 'Другие противорвотные (ондансетрон, метоклопрамид)',
        severity: 'caution',
        description: 'Возможна аддитивная эффективность, но не доказана большая польза — обычно достаточно одного',
      },
    ],
  },
  {
    drug: 'Ондансетрон (Ondansetron)',
    category: 'Противорвотное (5-HT3)',
    indication: 'Рвота при химиотерапии, после наркоза',
    dosePerKg: 0.5,
    frequency: '2-3 раза/день',
    route: 'внутрь, в/в',
    notes: '0.5-1 мг/кг. Применяют, когда маропитант не работает.',
    keywords: ['рвота', 'химиотерапия', 'после наркоза', 'противорвотное'],
    interactions: [
      {
        withDrug: 'Серотонинергические препараты (трамадол, СИОЗС)',
        severity: 'warning',
        description: 'Риск серотонинового синдрома',
      },
    ],
  },
  {
    drug: 'Метоклопрамид (Metoclopramide)',
    category: 'Прокинетик / противорвотное',
    indication: 'Гастропарез, регургитация, рефлюкс',
    dosePerKg: 0.2,
    frequency: '3-4 раза/день',
    route: 'внутрь, п/к',
    notes: '0.2-0.5 мг/кг. Не применять при подозрении на обструкцию ЖКТ!',
    contraindications: 'Обструкция ЖКТ, феохромоцитома',
    contraindicatedFor: ['gi_obstruction'],
    keywords: ['рвота', 'гастропарез', 'рефлюкс', 'регургитация', 'прокинетик'],
    interactions: [
      {
        withDrug: 'Опиоиды',
        severity: 'warning',
        description: 'Опиоиды拮 анти-прокинетический эффект метоклопрамида',
      },
      {
        withDrug: 'Антихолинергические (атропин)',
        severity: 'warning',
        description: 'Взаимная нейтрализация эффектов',
      },
    ],
  },

  // === Антибиотики ===
  {
    drug: 'Амоксициллин/клавуланат (Amoxiclav)',
    category: 'Антибиотик (β-лактам)',
    indication: 'Инфекции кожи, мочевыводящих путей, дыхательных путей',
    dosePerKg: 12.5,
    prophylacticDosePerKg: 6.25,
    prophylacticFrequency: '2 раза/день',
    prophylacticDuration: '3-5 дней',
    frequency: '2 раза/день',
    route: 'внутрь',
    notes: 'Лечебная: 12.5-25 мг/кг 2 раза/день. Профилактическая (после операции): 6.25-12.5 мг/кг 2 раза/день 3-5 дней. Широкий спектр. Хорошо переносится. Для кошек и собак.',
    ivData: {
      concentrationMgPerMl: 60, // 600 мг во флаконе → 10 мл = 60 мг/мл
      dilutionMl: 10,
      infusionRateMlPerHr: 100,
      maxInfusionTime: '30 минут',
      notes: 'В/в: развести 600 мг в 10 мл стерильной воды, вводить медленно болюсом за 3-5 минут или капельно в 100 мл физраствора за 30 мин',
    },
    keywords: ['инфекция', 'кожа', 'мочевые пути', 'дыхательные', 'антибиотик', 'пиодерма', 'цистит', 'послеоперационный'],
    interactions: [
      {
        withDrug: 'Пробенецид',
        severity: 'caution',
        description: 'Повышение уровня амоксициллина в крови',
      },
      {
        withDrug: 'Пероральные контрацептивы',
        severity: 'caution',
        description: 'Снижение эффективности (в вет. практике неактуально)',
      },
    ],
  },
  {
    drug: 'Энрофлоксацин (Enrofloxacin, Байтрил)',
    category: 'Антибиотик (фторхинолон)',
    indication: 'Инфекции мочевых путей, простата, кожные, респираторные',
    dosePerKg: 5,
    prophylacticDosePerKg: 2.5,
    prophylacticFrequency: '1 раз/день',
    prophylacticDuration: '3-5 дней',
    frequency: '1 раз/день',
    route: 'внутрь, п/к',
    notes: 'Лечебная: 5-20 мг/кг 1 раз/день. Профилактическая (химиотерапия/иммуносупрессия): 2.5-5 мг/кг 1 раз/день 3-5 дней. Не давать щенкам/котятам до 8 мес (поражение хрящей). У кошек — осторожно (слепота при высокой дозе).',
    ivData: {
      concentrationMgPerMl: 50, // 5% раствор = 50 мг/мл
      dilutionMl: 100,
      infusionRateMlPerHr: 50,
      maxInfusionTime: '20 минут',
      notes: 'В/в: развести 50 мг (1 мл 5% раствора) в 100 мл физраствора. Кошкам — не более 5 мг/кг. Опасно быстрое введение (судороги).',
    },
    contraindications: 'Молодые растущие животные, кошки с почечной патологией',
    contraindicatedFor: ['puppy_under_6mo', 'renal'],
    keywords: ['инфекция', 'мочевые пути', 'простатит', 'цистит', 'пиелонефрит', 'антибиотик'],
    interactions: [
      {
        withDrug: 'Препараты с Mg, Al, Ca (антациды, сукральфат)',
        severity: 'warning',
        description: 'Снижение абсорбции фторхинолона — принимать с интервалом 2 ч',
      },
      {
        withDrug: 'Теофиллин',
        severity: 'warning',
        description: 'Повышение уровня теофиллина в крови, риск токсичности',
      },
      {
        withDrug: 'НПВС',
        severity: 'caution',
        description: 'Возможно повышение риска судорог (у предрасположенных животных)',
      },
    ],
  },
  {
    drug: 'Доксициклин (Doxycycline)',
    category: 'Антибиотик (тетрациклин)',
    indication: 'Боррелиоз, анаплазмоз, эрлихиоз, хламидиоз кошек, респираторные',
    dosePerKg: 5,
    frequency: '2 раза/день',
    route: 'внутрь',
    notes: '5-10 мг/кг. Давать с водой/едой (избегать раздражения пищевода у кошек).',
    keywords: ['боррелиоз', 'анаплазмоз', 'эрлихиоз', 'хламидиоз', 'респираторная', 'риккетсиоз'],
    interactions: [
      {
        withDrug: 'Антациды (Mg, Al, Ca)',
        severity: 'warning',
        description: 'Хелатация — снижение абсорбции. Интервал 2 ч',
      },
      {
        withDrug: 'Варфарин',
        severity: 'warning',
        description: 'Усиление антикоагулянтного эффекта',
      },
      {
        withDrug: 'Фенобарбитал',
        severity: 'caution',
        description: 'Снижение уровня доксициклина в крови',
      },
    ],
  },
  {
    drug: 'Метронидазол (Metronidazole)',
    category: 'Антипротозойное / антианаэробное',
    indication: 'Диарея, лямблиоз, анаэробные инфекции',
    dosePerKg: 10,
    frequency: '2 раза/день',
    route: 'внутрь, в/в',
    notes: '10-15 мг/кг. Горький. Неврологические симптомы при передозировке.',
    contraindications: 'Беременность (I триместр), печёночная недостаточность',
    contraindicatedFor: ['hepatic', 'pregnant'],
    keywords: ['диарея', 'лямблиоз', 'анаэробная инфекция', 'гиардиаз', 'колит'],
    interactions: [
      {
        withDrug: 'Алкоголь',
        severity: 'critical',
        description: 'Антабус-реакция (тошнота, рвота, тахикардия)',
      },
      {
        withDrug: 'Варфарин',
        severity: 'warning',
        description: 'Усиление антикоагулянтного эффекта',
      },
      {
        withDrug: 'Фенобарбитал',
        severity: 'caution',
        description: 'Снижение эффективности метронидазола',
      },
    ],
  },
  {
    drug: 'Цефтриаксон (Ceftriaxone)',
    category: 'Антибиотик (цефалоспорин III)',
    indication: 'Сепсис, тяжёлые инфекции, менингит',
    dosePerKg: 22.5,
    prophylacticDosePerKg: 11.25,
    prophylacticFrequency: '1 раз/день',
    prophylacticDuration: '1-3 дозы (периоперационная)',
    frequency: '2 раза/день',
    route: 'в/м, в/в',
    notes: 'Лечебная: 20-25 мг/кг 2 раза/день (до 50 мг/кг при сепсисе). Профилактическая (периоперационная): 11.25 мг/кг за 30 мин до разреза, повторно через 90 мин при длительной операции. Широкий спектр, стабильный при хранении.',
    ivData: {
      concentrationMgPerMl: 100, // 1 г во флаконе → 10 мл = 100 мг/мл
      dilutionMl: 250,
      infusionRateMlPerHr: 100,
      maxInfusionTime: '30 минут',
      notes: 'В/в: 1 г развести в 10 мл стерильной воды (100 мг/мл) → далее в 100-250 мл физраствора или Рингер-лактата (БЕЗ КАЛЬЦИЯ!). Вводить капельно за 15-30 мин. НЕ смешивать с растворами, содержащими кальций (преципитация).',
    },
    keywords: ['сепсис', 'тяжёлая инфекция', 'менингит', 'перитонит', 'пневмония', 'послеоперационный', 'периоперационная'],
    interactions: [
      {
        withDrug: 'Аминогликозиды (гентамицин)',
        severity: 'warning',
        description: 'Усиление нефротоксичности — контроль почек',
      },
      {
        withDrug: 'Кальций-содержащие р-ры',
        severity: 'critical',
        description: 'Преципитация цефтриаксона! Не смешивать в одной капельнице с кальцием',
      },
    ],
  },

  // === Инфузионная терапия ===
  {
    drug: 'Рингер-лактат (Hartmann)',
    category: 'Инфузия (кристаллоид)',
    indication: 'Дегидратация, шок, ацидоз',
    dosePerKg: 30,
    frequency: 'расчёт на 24 ч',
    route: 'в/в капельно',
    notes: 'Скорость: норм. 30-60 мл/кг/24ч. Шок: 10-20 мл/кг болюсом за 15-30 мин. Кошкам — осторожно (объём).',
    keywords: ['дегидратация', 'шок', 'ацидоз', 'инфузия', 'регидратация', 'кристаллоид'],
    interactions: [
      {
        withDrug: 'Цефтриаксон',
        severity: 'critical',
        description: 'Преципитация — НЕ смешивать в одной капельнице с растворами, содержащими кальций',
      },
    ],
  },
  {
    drug: 'NaCl 0.9% (физраствор)',
    category: 'Инфузия (кристаллоид)',
    indication: 'Шок, кровотечение, разведение лекарств',
    dosePerKg: 30,
    frequency: 'расчёт на 24 ч',
    route: 'в/в капельно',
    notes: 'Скорость: 30-60 мл/кг/24ч. Не использовать при гипернатриемии. Шоковый болюс: 10-20 мл/кг.',
    keywords: ['шок', 'кровотечение', 'инфузия', 'кристаллоид', 'разведение', 'гипернатриемия'],
    interactions: [],
  },
  {
    drug: 'Глюкоза 5% (Dextrose)',
    category: 'Инфузия (гипотонический)',
    indication: 'Гипогликемия, питание, разведение',
    dosePerKg: 10,
    frequency: 'при гипогликемии',
    route: 'в/в',
    notes: 'Гипогликемия: 0.5-1 г/кг медленно (5-10 мл/кг 5% раствора). Не вводить болюсом (осмотический диурез).',
    keywords: ['гипогликемия', 'инсулинома', 'диабет', 'инфузия', 'питание'],
    interactions: [],
  },

  // === Седативные / премедикация ===
  {
    drug: 'Ацепромазин (Acepromazine)',
    category: 'Седативное (фенотиазин)',
    indication: 'Седация, премедикация, тревожность',
    dosePerKg: 0.02,
    frequency: 'по необходимости',
    route: 'п/к, в/м, в/в',
    notes: '0.02-0.05 мг/кг. Макс. собаки 3 мг, кошки 1 мг. Гипотония — осторожно при сердечной патологии.',
    contraindications: 'Тяжёлая гипотония, эпилепсия',
    contraindicatedFor: ['cardiac', 'seizures'],
    keywords: ['седация', 'тревожность', 'премедикация', 'успокоительное'],
    interactions: [
      {
        withDrug: 'Опиоиды',
        severity: 'caution',
        description: 'Взаимное усиление седативного эффекта',
      },
      {
        withDrug: 'Антигипертензивные',
        severity: 'warning',
        description: 'Усиление гипотонического эффекта',
      },
    ],
  },
  {
    drug: 'Дексмедетомидин (Dexmedetomidine)',
    category: 'Седативное (α2-агонист)',
    indication: 'Глубокая седация, премедикация',
    dosePerKg: 0.005,
    frequency: 'по необходимости',
    route: 'в/м, в/в',
    notes: '5-10 мкг/кг (0.005-0.01 мг/кг). Антагонист — атипамезол. Снижает ЧСС, АД — мониторинг.',
    contraindications: 'Сердечная недостаточность, тяжелая дыхательная патология',
    contraindicatedFor: ['cardiac'],
    keywords: ['седация', 'глубокая седация', 'премедикация', 'α2-агонист'],
    interactions: [
      {
        withDrug: 'Антагонисты α2 (атипамезол, йохимбин)',
        severity: 'warning',
        description: 'Полная нейтрализация эффекта (используется как антидот)',
      },
      {
        withDrug: 'Антигипертензивные',
        severity: 'warning',
        description: 'Неконтролируемые колебания АД',
      },
    ],
  },
  {
    drug: 'Бупренорфин (Buprenorphine)',
    category: 'Опиоидный анальгетик',
    indication: 'Боль, премедикация',
    dosePerKg: 0.02,
    frequency: '2-3 раза/день',
    route: 'в/м, в/в, сублингвально (кошки)',
    notes: '0.01-0.03 мг/кг. Сублингвально кошкам — удобно владельцам. Начало через 30-45 мин, длительность 6-8 ч.',
    keywords: ['боль', 'опиоид', 'анальгетик', 'премедикация', 'послеоперационный'],
    interactions: [
      {
        withDrug: 'Опиоидные антагонисты (налоксон)',
        severity: 'warning',
        description: 'Снижение анальгетического эффекта (используется как антидот)',
      },
      {
        withDrug: 'Другие опиоиды',
        severity: 'caution',
        description: 'Возможна аддитивная седация',
      },
    ],
  },

  // === Специфические ===
  {
    drug: 'Фуросемид (Furosemide)',
    category: 'Диуретик',
    indication: 'Отёк лёгких, ХСН, гиперкалиемия',
    dosePerKg: 2,
    frequency: '2-3 раза/день',
    route: 'в/в, в/м, внутрь',
    notes: '1-2 мг/кг в/в при остром отёке лёгких. Поддерживающая: 1-2 мг/кг 2 раза/день внутрь. Контроль электролитов.',
    contraindications: 'Анурия, дегидратация',
    contraindicatedFor: ['renal'],
    keywords: ['отёк лёгких', 'ХСН', 'гиперкалиемия', 'диуретик', 'сердечная недостаточность'],
    interactions: [
      {
        withDrug: 'НПВС',
        severity: 'warning',
        description: 'Снижение диуретического эффекта, нефротоксичность',
      },
      {
        withDrug: 'Аминогликозиды (гентамицин)',
        severity: 'critical',
        description: 'Резкое усиление ототоксичности и нефротоксичности',
      },
      {
        withDrug: 'Сердечные гликозиды (дигоксин)',
        severity: 'warning',
        description: 'Гипокалиемия усиливает токсичность дигоксина',
      },
    ],
  },
  {
    drug: 'Амлодипин (Amlodipine)',
    category: 'Блокатор кальциевых каналов',
    indication: 'Артериальная гипертензия (особенно кошки)',
    dosePerKg: 0.1,
    frequency: '1 раз/день',
    route: 'внутрь',
    notes: 'Кошки: 0.625-1.25 мг/кошку/день (стандартная доза). Собаки: 0.1-0.25 мг/кг/день. Контроль АД.',
    keywords: ['гипертензия', 'гипертония', 'давление', 'кошка', 'ХБП', 'гипертиреоз'],
    interactions: [
      {
        withDrug: 'Другие антигипертензивные (ингибиторы АПФ)',
        severity: 'caution',
        description: 'Аддитивный гипотензивный эффект — контроль АД',
      },
      {
        withDrug: 'Грейпфрутовый сок',
        severity: 'caution',
        description: 'Повышение концентрации (в вет. практике неактуально)',
      },
    ],
  },
  {
    drug: 'Преднизолон (Prednisolone)',
    category: 'Глюкокортикоид',
    indication: 'Аллергия, аутоиммунные, шок, IBD',
    dosePerKg: 0.5,
    frequency: '1-2 раза/день',
    route: 'внутрь, в/в',
    notes: '0.5-1 мг/кг/день. Иммунодепрессивная доза: 2-4 мг/кг/день. Снижать постепенно.',
    contraindications: 'Беременность, системные инфекции, язва ЖКТ',
    contraindicatedFor: ['pregnant', 'gi_obstruction'],
    keywords: ['аллергия', 'аутоиммунное', 'шок', 'IBD', 'иммуносупрессия', 'воспаление', 'стероид'],
    interactions: [
      {
        withDrug: 'НПВС',
        severity: 'critical',
        description: 'Резко повышенный риск желудочно-кишечных язв и кровотечений. Противопоказано!',
      },
      {
        withDrug: 'Фуросемид',
        severity: 'warning',
        description: 'Усиление потери калия — контроль электролитов',
      },
      {
        withDrug: 'Вакцины (живые)',
        severity: 'warning',
        description: 'Снижение иммунного ответа на вакцину',
      },
    ],
  },
  {
    drug: 'Дексаметазон (Dexamethasone)',
    category: 'Глюкокортикоид',
    indication: 'Шок, отёк мозга, анафилаксия',
    dosePerKg: 0.1,
    frequency: '1-2 раза/день',
    route: 'в/в, в/м',
    notes: '0.1-0.5 мг/кг. Шоковый: 0.5-2 мг/кг в/в. В 10 раз сильнее преднизолона.',
    contraindicatedFor: ['pregnant', 'gi_obstruction'],
    keywords: ['шок', 'анафилаксия', 'отёк мозга', 'стероид', 'воспаление'],
    interactions: [
      {
        withDrug: 'НПВС',
        severity: 'critical',
        description: 'Риск язв и кровотечений ЖКТ — не комбинировать!',
      },
      {
        withDrug: 'Вакцины (живые)',
        severity: 'warning',
        description: 'Снижение иммунного ответа',
      },
    ],
  },
  {
    drug: 'Омепразол (Omeprazole)',
    category: 'Ингибитор протонной помпы',
    indication: 'Гастрит, язва желудка, рефлюкс-эзофагит',
    dosePerKg: 0.75,
    frequency: '1 раз/день',
    route: 'внутрь',
    notes: '0.5-1 мг/кг. Принимать за 30 мин до еды. Можно кошкам и собакам.',
    keywords: ['гастрит', 'язва', 'рефлюкс', 'протонная помпа', 'ЖКТ', 'рвота желчью'],
    interactions: [
      {
        withDrug: 'Варфарин',
        severity: 'warning',
        description: 'Изменение антикоагулянтного эффекта — контроль МНО',
      },
      {
        withDrug: 'Кларитромицин',
        severity: 'caution',
        description: 'Повышение уровня обоих препаратов',
      },
    ],
  },
]

export const drugCategories = Array.from(
  new Set(drugDatabase.map((d) => d.category))
)

// Функция-помощник: рассчитать дозу для конкретного веса
export type DoseMode = 'therapeutic' | 'prophylactic'

export function calculateDose(
  drug: DrugDose,
  weightKg: number,
  mode: DoseMode = 'therapeutic'
): {
  perDose: number
  perDay: number
  displayPerDose: string
  displayPerDay: string
  warningMax?: string
  hasProphylactic: boolean
} {
  const weight = Math.max(0.1, weightKg)

  // Базовая доза: лечебная или профилактическая
  const baseDosePerKg = mode === 'prophylactic' && drug.prophylacticDosePerKg
    ? drug.prophylacticDosePerKg
    : drug.dosePerKg
  const perDose = baseDosePerKg * weight

  // Частота в день
  const frequencyStr = mode === 'prophylactic' && drug.prophylacticFrequency
    ? drug.prophylacticFrequency
    : drug.frequency
  const freqMatch = frequencyStr.match(/(\d+)\s*раз/)
  const perDayCount = freqMatch ? parseInt(freqMatch[1], 10) : 1

  // Для инфузий "расчёт на 24 ч" — используем начальную суточную
  const isInfusion = drug.category.includes('Инфузия')
  const perDay = isInfusion ? perDose : perDose * perDayCount

  const formatDose = (mg: number): string => {
    if (mg >= 1000) return `${(mg / 1000).toFixed(2)} г`
    if (mg >= 100) return `${mg.toFixed(0)} мг`
    if (mg >= 10) return `${mg.toFixed(1)} мг`
    if (mg >= 1) return `${mg.toFixed(2)} мг`
    return `${mg.toFixed(3)} мг`
  }

  let warningMax: string | undefined
  if (drug.maxDose && perDose > drug.maxDose) {
    warningMax = `⚠️ Расчётная доза превышает максимальную (${drug.maxDose} мг) — ограничить до ${drug.maxDose} мг`
  }

  return {
    perDose,
    perDay,
    displayPerDose: formatDose(perDose),
    displayPerDay: formatDose(perDay),
    warningMax,
    hasProphylactic: !!drug.prophylacticDosePerKg,
  }
}

// 🆕 Расчёт в/в инфузии (если у препарата есть ivData)
export function calculateIVInfusion(
  drug: DrugDose,
  weightKg: number,
  customConcentration?: number, // мг/мл, если разводим иначе
): {
  doseMg: number
  doseMl: number // объём чистого препарата (мл)
  dilutionVolumeMl: number // объём разведения (мл)
  totalVolumeMl: number // общий объём (мл)
  infusionRateMlPerHr: number // скорость (мл/ч)
  infusionTimeMin: number // время инфузии (мин)
  displaySummary: string
  hasIVData: boolean
} | null {
  if (!drug.ivData || !drug.ivData.concentrationMgPerMl) return null

  const weight = Math.max(0.1, weightKg)
  const concentration = customConcentration || drug.ivData.concentrationMgPerMl
  const doseMg = drug.dosePerKg * weight
  const doseMl = doseMg / concentration
  const dilutionVolumeMl = drug.ivData.dilutionMl || 100
  const totalVolumeMl = doseMl + dilutionVolumeMl
  const infusionRateMlPerHr = drug.ivData.infusionRateMlPerHr || 50
  const infusionTimeMin = (totalVolumeMl / infusionRateMlPerHr) * 60

  const summary = `${doseMg.toFixed(1)} мг препарата = ${doseMl.toFixed(2)} мл раствора концентрации ${concentration} мг/мл
Развести в ${dilutionVolumeMl} мл физраствора → общий объём ${totalVolumeMl.toFixed(1)} мл
Скорость: ${infusionRateMlPerHr} мл/ч → время инфузии ~${infusionTimeMin.toFixed(0)} минут
${drug.ivData.notes || ''}`

  return {
    doseMg,
    doseMl,
    dilutionVolumeMl,
    totalVolumeMl,
    infusionRateMlPerHr,
    infusionTimeMin,
    displaySummary: summary,
    hasIVData: true,
  }
}


// 🆕 Проверка противопоказаний для пациента
export interface ContraindicationResult {
  drug: DrugDose
  contraindicated: boolean
  reasons: string[]
}

export interface PatientContraindications {
  species?: 'dog' | 'cat' | 'other'
  isPuppy?: boolean // молодой (< 6 мес)
  hasRenalIssue?: boolean // ХБП / почечная патология
  hasHepaticIssue?: boolean // печёночная патология
  hasCardiacIssue?: boolean // сердечная недостаточность
  isPregnant?: boolean // беременность
  hasGiObstruction?: boolean // подозрение на обструкцию ЖКТ
  hasSeizures?: boolean // судороги
  hasBleedingRisk?: boolean // риск кровотечения
}

export function checkContraindications(
  drug: DrugDose,
  patient: PatientContraindications
): ContraindicationResult {
  const reasons: string[] = []
  if (!drug.contraindicatedFor || drug.contraindicatedFor.length === 0) {
    return { drug, contraindicated: false, reasons }
  }

  const checks: Array<{ flag: boolean | undefined; type: string; label: string }> = [
    { flag: patient.species === 'cat', type: 'cat', label: 'Противопоказан кошкам' },
    { flag: patient.species === 'dog', type: 'dog', label: 'Противопоказан собакам' },
    { flag: patient.isPuppy, type: 'puppy_under_6mo', label: 'Противопоказан молодым животным (< 6 мес)' },
    { flag: patient.hasRenalIssue, type: 'renal', label: 'Противопоказан при почечной патологии' },
    { flag: patient.hasHepaticIssue, type: 'hepatic', label: 'Противопоказан при печёночной патологии' },
    { flag: patient.hasCardiacIssue, type: 'cardiac', label: 'Противопоказан при сердечной патологии' },
    { flag: patient.isPregnant, type: 'pregnant', label: 'Противопоказан при беременности' },
    { flag: patient.hasGiObstruction, type: 'gi_obstruction', label: 'Противопоказан при обструкции ЖКТ' },
    { flag: patient.hasSeizures, type: 'seizures', label: 'Противопоказан при судорогах' },
    { flag: patient.hasBleedingRisk, type: 'bleeding', label: 'Противопоказан при риске кровотечения' },
  ]

  for (const check of checks) {
    if (check.flag && drug.contraindicatedFor?.includes(check.type as any)) {
      reasons.push(check.label)
    }
  }

  return {
    drug,
    contraindicated: reasons.length > 0,
    reasons,
  }
}

// 🆕 Проверка взаимодействий между списком препаратов
export interface InteractionResult {
  drug1: DrugDose
  drug2: DrugDose
  severity: 'critical' | 'warning' | 'caution'
  description: string
}

export function checkInteractions(
  selectedDrugs: DrugDose[]
): InteractionResult[] {
  const results: InteractionResult[] = []

  for (let i = 0; i < selectedDrugs.length; i++) {
    for (let j = i + 1; j < selectedDrugs.length; j++) {
      const d1 = selectedDrugs[i]
      const d2 = selectedDrugs[j]

      // Проверяем взаимодействия d1 → d2 и d2 → d1
      for (const interaction of d1.interactions || []) {
        // Пробуем найти d2 в описании взаимодействия
        const d2Name = d2.drug.toLowerCase().split(' ')[0] // первое слово (МНН)
        const withDrug = interaction.withDrug.toLowerCase()
        if (
          withDrug.includes(d2Name) ||
          d2Name.includes(withDrug.split(' ')[0]) ||
          // Проверяем по категории
          withDrug.includes(d2.category.toLowerCase().split(' ')[0])
        ) {
          // Избегаем дубликатов (если уже есть обратное взаимодействие)
          const exists = results.find(
            (r) =>
              (r.drug1.drug === d2.drug && r.drug2.drug === d1.drug) ||
              (r.drug1.drug === d1.drug && r.drug2.drug === d2.drug && r.description === interaction.description)
          )
          if (!exists) {
            results.push({
              drug1: d1,
              drug2: d2,
              severity: interaction.severity,
              description: interaction.description,
            })
          }
        }
      }
    }
  }

  // Сортировка по серьёзности (critical → warning → caution)
  const severityOrder = { critical: 0, warning: 1, caution: 2 }
  results.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return results
}

// 🆕 Подбор препаратов по клинической картине (ключевым словам)
export function findDrugsByKeywords(
  keywords: string[],
  options: { species?: 'dog' | 'cat' | 'other' } = {}
): DrugDose[] {
  if (!keywords.length) return []

  const lowerKeywords = keywords.map((k) => k.toLowerCase().trim()).filter(Boolean)

  // Подсчитываем совпадения для каждого препарата
  const scored = drugDatabase
    .map((drug) => {
      const drugKeywords = (drug.keywords || []).map((k) => k.toLowerCase())
      let score = 0
      for (const kw of lowerKeywords) {
        for (const dk of drugKeywords) {
          if (dk.includes(kw) || kw.includes(dk)) {
            score++
          }
        }
      }
      return { drug, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  // Фильтруем по виду (если указан) — не отдаем кошкам препараты, им противопоказанные
  if (options.species === 'cat') {
    return scored
      .filter((item) => !item.drug.contraindicatedFor?.includes('cat'))
      .slice(0, 7)
      .map((item) => item.drug)
  }

  return scored.slice(0, 7).map((item) => item.drug)
}
