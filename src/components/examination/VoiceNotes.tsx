'use client'

import { useState, useRef, useEffect } from 'react'
import { useVetStore } from '@/store/vetStore'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Mic, Square, Trash2, Save, Plus, AudioLines,
} from 'lucide-react'

function useTicker(active: boolean) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => setTick((t) => t + 1), 100)
    return () => clearInterval(interval)
  }, [active])
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function VoiceNotes() {
  const voiceNotes = useVetStore((s) => s.voiceNotes)
  const addVoiceNote = useVetStore((s) => s.addVoiceNote)
  const removeVoiceNote = useVetStore((s) => s.removeVoiceNote)
  const clearVoiceNotes = useVetStore((s) => s.clearVoiceNotes)

  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [recordedText, setRecordedText] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef<any>(null)
  const startTimeRef = useRef<number>(0)

  useTicker(isListening)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    setIsSupported(!!SR)
  }, [])

  const startListening = () => {
    if (!isSupported) {
      setError('Голосовой ввод не поддерживается этим браузером. Используйте Chrome, Safari или Edge.')
      return
    }
    setError('')
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.lang = 'ru-RU'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      startTimeRef.current = Date.now()
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interim += transcript
        }
      }
      setInterimText(interim)
      if (finalTranscript) {
        setRecordedText((prev) => (prev ? prev + ' ' : '') + finalTranscript.trim())
        setInterimText('')
      }
    }

    recognition.onerror = (event: any) => {
      let errMsg = 'Ошибка распознавания'
      if (event.error === 'not-allowed') {
        errMsg = 'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.'
      } else if (event.error === 'no-speech') {
        return
      } else if (event.error === 'network') {
        errMsg = 'Ошибка сети при распознавании речи'
      }
      setError(errMsg)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimText('')
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
    setInterimText('')
  }

  const clearText = () => {
    setRecordedText('')
    setInterimText('')
    setError('')
  }

  const saveNote = () => {
    if (!recordedText.trim()) return
    // Сохраняем в vetStore → будет учтено в AI-генерации
    addVoiceNote(recordedText.trim())
    setRecordedText('')
  }

  const combineNotes = () => {
    if (voiceNotes.length === 0) return
    setRecordedText(voiceNotes.join('\n\n'))
    clearVoiceNotes()
  }

  if (!isSupported) {
    return (
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-sky-50/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AudioLines className="h-5 w-5 text-emerald-600" />
            Голосовые заметки при осмотре
          </CardTitle>
          <CardDescription>
            Диктуйте свои наблюдения во время осмотра пациента — текст распознается автоматически.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800">
            🎤 Голосовой ввод не поддерживается этим браузером. Используйте Chrome, Safari или Edge.
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentDuration = isListening ? Date.now() - startTimeRef.current : 0

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-sky-50/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AudioLines className="h-5 w-5 text-emerald-600" />
          Голосовые заметки при осмотре
          {isListening && (
            <span className="text-xs font-mono font-bold text-rose-600 flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              REC {formatDuration(currentDuration)}
            </span>
          )}
          {voiceNotes.length > 0 && (
            <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full px-2 py-0.5">
              {voiceNotes.length} сохранено
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Диктуйте свои наблюдения во время осмотра — текст распознается автоматически.
          Голосовые заметки автоматически учитываются в AI-генерации дифференциальных диагнозов.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {!isListening ? (
            <Button
              onClick={startListening}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <Mic className="h-4 w-4 mr-1.5" />
              Начать запись
            </Button>
          ) : (
            <Button
              onClick={stopListening}
              className="bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
              size="sm"
            >
              <Square className="h-4 w-4 mr-1.5" fill="currentColor" />
              Остановить запись
            </Button>
          )}
          {recordedText && (
            <>
              <Button onClick={saveNote} variant="outline" size="sm">
                <Save className="h-3.5 w-3.5 mr-1" />
                Сохранить заметку
              </Button>
              <Button onClick={clearText} variant="outline" size="sm" className="text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Очистить
              </Button>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Mic className="h-3 w-3" />
            Текущая запись
          </Label>
          <Textarea
            value={recordedText + (interimText ? ' ' + interimText : '')}
            onChange={(e) => setRecordedText(e.target.value)}
            placeholder="Нажмите «Начать запись» и диктуйте свои наблюдения при осмотре…
Напр.: «Слизистые бледные, тургор кожи снижен, болезненность при пальпации живота в области эпигастрия, рвота после еды»"
            rows={6}
            className="font-mono text-sm"
          />
          {interimText && (
            <div className="text-xs text-muted-foreground italic">
              ✍️ Распознавание: {interimText.slice(0, 80)}…
            </div>
          )}
        </div>

        {voiceNotes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                Сохранённые заметки ({voiceNotes.length}) — будут учтены в AI:
              </Label>
              <div className="flex gap-1">
                <Button
                  onClick={combineNotes}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Объединить
                </Button>
                <Button
                  onClick={clearVoiceNotes}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Все
                </Button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {voiceNotes.map((note, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-md border bg-card text-xs flex items-start justify-between gap-2"
                >
                  <div className="flex-1">
                    <span className="text-muted-foreground font-mono">
                      Заметка {i + 1}:
                    </span>{' '}
                    <span className="text-foreground">{note.slice(0, 150)}{note.length > 150 ? '…' : ''}</span>
                  </div>
                  <button
                    onClick={() => removeVoiceNote(i)}
                    className="text-muted-foreground hover:text-rose-600 shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground italic">
          💡 Голосовые заметки автоматически учитываются в AI-генерации дифференциальных диагнозов.
          Распознавание на русском языке в реальном времени.
        </div>
      </CardContent>
    </Card>
  )
}
