import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Species = 'dog' | 'cat' | 'other'

export interface PatientInfo {
  species: Species
  weight: string
  visitDate: string
}

// Запись истории приёмов
export interface VisitRecord {
  id: string
  savedAt: string // ISO дата сохранения
  patient: PatientInfo
  anamnesis: AnamnesisData
  examination: SystemExamination
  auscultation: HeartAuscultation
  scans: ScanFile[]
  results: Results
  visitStartedAt: number | null
  visitEndedAt: number | null
  visitDurationMs: number
  visitSummary: string // Краткое описание (вид + жалоба) для списка
}

export interface AnamnesisData {
  // 1. Содержание и образ жизни
  livingConditions: string
  outdoorAccess: string
  otherAnimals: string
  contactsStrangers: string
  caretaker: string
  decisionMaker: string
  physicalActivity: string

  // 2. Кормление и вода
  dietType: string
  dietBrand: string
  feedingFreq: string
  feedingVolume: string
  treats: string
  supplements: string
  dietChanges: string
  tableFoodAccess: string
  trashAccess: string
  waterSource: string
  waterChangeFreq: string
  waterIntake: string

  // 3. Профилактика
  vaccination: string
  vaccinationDate: string
  fleaTickTreatment: string
  fleaTickDate: string
  deworming: string
  dewormingDate: string
  neutered: 'yes' | 'no' | ''
  neuteredDate: string
  neuteredComplications: string

  // 4. Главная жалоба
  mainComplaint: string
  complaintOnset: string
  complaintDevelopment: string
  associatedFactors: string
  previousEpisodes: string
  previousTreatment: string
  currentTreatment: string
  currentTreatmentEffect: string

  // 5. Опрос по системам
  generalStatus: string
  coughDyspnea: string
  polyuriaPolydipsia: string
  appetiteGi: string
  urogenital: string
  skin: string
  nervous: string
  musculoskeletal: string

  // 6. Эпидемиологические риски
  travel: string
  exhibitions: string
  boarding: string
  grooming: string
  sickAnimalsNearby: string
  walkingArea: string
  wildlifeContact: string
  huntingBehavior: string

  // 7. Предыдущие болезни
  previousDiseases: string
  surgeries: string
  chronicDiseases: string
  permanentMedications: string
  allergies: string
  anesthesiaIssues: string

  // 8. Репродуктивный анамнез
  firstEstrus: string
  estrusRegularity: string
  estrusDuration: string
  falsePregnancies: string
  pyometra: string
  births: string
  breedingMales: string
  prostateIssues: string
}

export interface ExaminationParameter {
  id: string
  name: string
  normalValue: string
  status: 'normal' | 'deviation' | 'not_evaluated' | ''
  deviationValue: string
  notes: string
}

export interface SystemExamination {
  [systemId: string]: ExaminationParameter[]
}

export interface HeartAuscultation {
  rhythm: 'normal' | 'tachycardia' | 'bradycardia' | 'arrhythmia' | ''
  bpm: string
  murmurs: string
  notes: string
}

export interface ScanFile {
  id: string
  name: string
  type: string
  size: number
  dataUrl: string
  uploadedAt: string
  ocrText: string
  ocrStatus: 'pending' | 'processing' | 'done' | 'error'
}

export interface Results {
  preliminaryDiagnoses: string
  plannedExaminations: string
  recommendations: string
  preliminaryPrescriptions: string // Предварительные назначения с дозировками
  mandatoryDiagnostics: string // Рекомендации по обязательной лаб. и инструм. диагностике
  additionalDiagnostics: string // Дополнительная визуализационная диагностика
  aiGenerated: string
  generatedAt: string
}

interface VetState {
  // Пациент
  patient: PatientInfo
  setPatient: (data: Partial<PatientInfo>) => void

  // Анамнез
  anamnesis: AnamnesisData
  setAnamnesis: (data: Partial<AnamnesisData>) => void

  // Осмотр
  examination: SystemExamination
  setExamination: (data: SystemExamination) => void
  updateExaminationParameter: (
    systemId: string,
    paramId: string,
    data: Partial<ExaminationParameter>
  ) => void

  // Аускультация
  auscultation: HeartAuscultation
  setAuscultation: (data: Partial<HeartAuscultation>) => void

  // Сканы
  scans: ScanFile[]
  addScan: (file: ScanFile) => void
  updateScan: (id: string, data: Partial<ScanFile>) => void
  removeScan: (id: string) => void

  // Результаты
  results: Results
  setResults: (data: Partial<Results>) => void

  // Активная вкладка
  activeTab: 'anamnesis' | 'examination' | 'results'
  setActiveTab: (tab: 'anamnesis' | 'examination' | 'results') => void

  // Таймер приёма
  visitStartedAt: number | null // timestamp(ms) начала приёма
  visitEndedAt: number | null // timestamp(ms) окончания приёма
  visitDurationMs: number // накопленная длительность (если приём завершён)
  startVisit: () => void
  stopVisit: () => void
  isVisitFinished: () => boolean

  // История приёмов
  visitHistory: VisitRecord[]
  saveVisitToHistory: () => string | null // возвращает id записи
  deleteVisitFromHistory: (id: string) => void
  loadVisitFromHistory: (id: string) => void
  clearVisitHistory: () => void

  // Пользовательские препараты (из CSV импорта)
  customDrugs: Array<{
    drug: string
    category: string
    indication: string
    dosePerKg: number
    frequency: string
    route: string
    notes?: string
    contraindications?: string
    keywords?: string[]
  }>
  addCustomDrug: (drug: any) => void
  removeCustomDrug: (drugName: string) => void
  clearCustomDrugs: () => void

  // 🆕 Голосовые заметки при осмотре
  voiceNotes: string[]
  addVoiceNote: (note: string) => void
  setVoiceNotes: (notes: string[]) => void
  removeVoiceNote: (index: number) => void
  clearVoiceNotes: () => void

  // Сброс
  resetAll: () => void
}

const initialPatient: PatientInfo = {
  species: 'dog',
  weight: '',
  visitDate: new Date().toISOString().split('T')[0],
}

const initialAnamnesis: AnamnesisData = {
  livingConditions: '',
  outdoorAccess: '',
  otherAnimals: '',
  contactsStrangers: '',
  caretaker: '',
  decisionMaker: '',
  physicalActivity: '',
  dietType: '',
  dietBrand: '',
  feedingFreq: '',
  feedingVolume: '',
  treats: '',
  supplements: '',
  dietChanges: '',
  tableFoodAccess: '',
  trashAccess: '',
  waterSource: '',
  waterChangeFreq: '',
  waterIntake: '',
  vaccination: '',
  vaccinationDate: '',
  fleaTickTreatment: '',
  fleaTickDate: '',
  deworming: '',
  dewormingDate: '',
  neutered: '',
  neuteredDate: '',
  neuteredComplications: '',
  mainComplaint: '',
  complaintOnset: '',
  complaintDevelopment: '',
  associatedFactors: '',
  previousEpisodes: '',
  previousTreatment: '',
  currentTreatment: '',
  currentTreatmentEffect: '',
  generalStatus: '',
  coughDyspnea: '',
  polyuriaPolydipsia: '',
  appetiteGi: '',
  urogenital: '',
  skin: '',
  nervous: '',
  musculoskeletal: '',
  travel: '',
  exhibitions: '',
  boarding: '',
  grooming: '',
  sickAnimalsNearby: '',
  walkingArea: '',
  wildlifeContact: '',
  huntingBehavior: '',
  previousDiseases: '',
  surgeries: '',
  chronicDiseases: '',
  permanentMedications: '',
  allergies: '',
  anesthesiaIssues: '',
  firstEstrus: '',
  estrusRegularity: '',
  estrusDuration: '',
  falsePregnancies: '',
  pyometra: '',
  births: '',
  breedingMales: '',
  prostateIssues: '',
}

const initialAuscultation: HeartAuscultation = {
  rhythm: '',
  bpm: '',
  murmurs: '',
  notes: '',
}

const initialResults: Results = {
  preliminaryDiagnoses: '',
  plannedExaminations: '',
  recommendations: '',
  preliminaryPrescriptions: '',
  mandatoryDiagnostics: '',
  additionalDiagnostics: '',
  aiGenerated: '',
  generatedAt: '',
}

export const useVetStore = create<VetState>()(
  persist(
    (set) => ({
      patient: initialPatient,
      setPatient: (data) =>
        set((state) => ({ patient: { ...state.patient, ...data } })),

      anamnesis: initialAnamnesis,
      setAnamnesis: (data) =>
        set((state) => ({ anamnesis: { ...state.anamnesis, ...data } })),

      examination: {},
      setExamination: (data) => set({ examination: data }),
      updateExaminationParameter: (systemId, paramId, data) =>
        set((state) => {
          const systemParams = state.examination[systemId] || []
          const updated = systemParams.map((p) =>
            p.id === paramId ? { ...p, ...data } : p
          )
          return {
            examination: { ...state.examination, [systemId]: updated },
          }
        }),

      auscultation: initialAuscultation,
      setAuscultation: (data) =>
        set((state) => ({ auscultation: { ...state.auscultation, ...data } })),

      scans: [],
      addScan: (file) =>
        set((state) => ({ scans: [...state.scans, file] })),
      updateScan: (id, data) =>
        set((state) => ({
          scans: state.scans.map((s) => (s.id === id ? { ...s, ...data } : s)),
        })),
      removeScan: (id) =>
        set((state) => ({ scans: state.scans.filter((s) => s.id !== id) })),

      results: initialResults,
      setResults: (data) =>
        set((state) => ({ results: { ...state.results, ...data } })),

      activeTab: 'anamnesis',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Таймер приёма: стартует автоматически при первом действии пользователя,
      // останавливается кнопкой «Закончить приём»
      visitStartedAt: null,
      visitEndedAt: null,
      visitDurationMs: 0,
      startVisit: () =>
        set((state) => {
          // Если уже стартовал или уже завершён — не меняем
          if (state.visitStartedAt || state.visitEndedAt) return state
          return { visitStartedAt: Date.now(), visitEndedAt: null }
        }),
      stopVisit: () =>
        set((state) => {
          if (!state.visitStartedAt || state.visitEndedAt) return state
          const endedAt = Date.now()
          return {
            visitEndedAt: endedAt,
            visitDurationMs: endedAt - (state.visitStartedAt || endedAt),
          }
        }),
      isVisitFinished: () => useVetStore.getState().visitEndedAt !== null,

      // === История приёмов ===
      visitHistory: [],
      saveVisitToHistory: () => {
        const state = useVetStore.getState()
        // Если данных пациента нет — не сохраняем
        if (!state.patient.weight && !state.patient.visitDate) return null

        const id = `visit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const speciesLabel =
          state.patient.species === 'dog'
            ? 'Собака'
            : state.patient.species === 'cat'
            ? 'Кошка'
            : 'Другое'
        const summary = `${speciesLabel}${state.patient.weight ? `, ${state.patient.weight} кг` : ''}${
          state.anamnesis.mainComplaint
            ? ` — ${state.anamnesis.mainComplaint.slice(0, 50)}`
            : ''
        }`

        const record: VisitRecord = {
          id,
          savedAt: new Date().toISOString(),
          patient: { ...state.patient },
          anamnesis: { ...state.anamnesis },
          examination: JSON.parse(JSON.stringify(state.examination)),
          auscultation: { ...state.auscultation },
          scans: state.scans.map((s) => ({ ...s })),
          results: { ...state.results },
          visitStartedAt: state.visitStartedAt,
          visitEndedAt: state.visitEndedAt,
          visitDurationMs: state.visitDurationMs,
          visitSummary: summary,
        }

        set((s) => ({ visitHistory: [record, ...s.visitHistory].slice(0, 100) }))
        return id
      },
      deleteVisitFromHistory: (id) =>
        set((state) => ({
          visitHistory: state.visitHistory.filter((v) => v.id !== id),
        })),
      loadVisitFromHistory: (id) => {
        const record = useVetStore.getState().visitHistory.find((v) => v.id === id)
        if (!record) return
        set({
          patient: { ...record.patient },
          anamnesis: { ...record.anamnesis },
          examination: JSON.parse(JSON.stringify(record.examination)),
          auscultation: { ...record.auscultation },
          scans: record.scans.map((s) => ({ ...s })),
          results: { ...record.results },
          visitStartedAt: record.visitStartedAt,
          visitEndedAt: record.visitEndedAt,
          visitDurationMs: record.visitDurationMs,
          activeTab: 'anamnesis',
        })
      },
      clearVisitHistory: () => set({ visitHistory: [] }),

      // === Пользовательские препараты ===
      customDrugs: [],
      addCustomDrug: (drug) =>
        set((state) => {
          // Избегаем дубликатов по названию
          if (state.customDrugs.find((d) => d.drug === drug.drug)) {
            return state
          }
          return { customDrugs: [...state.customDrugs, drug] }
        }),
      removeCustomDrug: (drugName) =>
        set((state) => ({
          customDrugs: state.customDrugs.filter((d) => d.drug !== drugName),
        })),
      clearCustomDrugs: () => set({ customDrugs: [] }),

      // === Голосовые заметки ===
      voiceNotes: [],
      addVoiceNote: (note) =>
        set((state) => ({
          voiceNotes: note.trim() ? [...state.voiceNotes, note.trim()] : state.voiceNotes,
        })),
      setVoiceNotes: (notes) => set({ voiceNotes: notes }),
      removeVoiceNote: (index) =>
        set((state) => ({
          voiceNotes: state.voiceNotes.filter((_, i) => i !== index),
        })),
      clearVoiceNotes: () => set({ voiceNotes: [] }),

      resetAll: () =>
        set({
          patient: initialPatient,
          anamnesis: initialAnamnesis,
          examination: {},
          auscultation: initialAuscultation,
          scans: [],
          results: initialResults,
          activeTab: 'anamnesis',
          visitStartedAt: null,
          visitEndedAt: null,
          visitDurationMs: 0,
          voiceNotes: [],
        }),
    }),
    {
      name: 'ushihvost-vet-storage',
    }
  )
)
