'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Loader2 } from 'lucide-react'

// Типы Web Speech API (не входят в стандарт TS DOM lib)
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

interface VoiceInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  disabled?: boolean
  /** Идентификатор поля (для аналитики/логов) */
  fieldId?: string
}

/**
 * Компонент Textarea с кнопкой голосового ввода.
 * Использует Web Speech API (Chrome, Edge, Safari).
 * В Firefox не поддерживается — кнопка скрывается.
 */
export function VoiceInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = '',
  disabled = false,
  fieldId,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  // Проверка поддержки Web Speech API (через lazy initializer, чтобы не вызывать setState в effect)
  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return false
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    return !!SR
  })
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const startListening = () => {
    if (!isSupported || disabled) return
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
        const baseValue = value ? value + ' ' : ''
        onChange(baseValue + finalTranscript.trim())
        setInterimText('')
      }
    }

    recognition.onerror = (event: any) => {
      console.warn('Voice input error:', event.error)
      let errMsg = 'Ошибка распознавания'
      if (event.error === 'not-allowed') {
        errMsg = 'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.'
      } else if (event.error === 'no-speech') {
        // Не показываем — нормальная ситуация
        return
      } else if (event.error === 'network') {
        errMsg = 'Ошибка сети при распознавании речи'
      }
      alert(errMsg)
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

  if (!isSupported) {
    // Если Web Speech API не поддерживается — показываем только обычную textarea
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      />
    )
  }

  return (
    <div className="relative">
      <textarea
        value={value + (interimText ? ' ' + interimText : '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full rounded-md border border-input bg-background px-3 py-2 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      />

      {/* Кнопка микрофона */}
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        title={isListening ? 'Остановить запись' : 'Голосовой ввод'}
        aria-label={isListening ? 'Остановить запись' : 'Голосовой ввод'}
        className={`absolute right-2 top-2 p-2 rounded-md transition-colors ${
          isListening
            ? 'bg-rose-100 text-rose-600 animate-pulse hover:bg-rose-200'
            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {isListening ? (
          <Square className="h-4 w-4" fill="currentColor" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>

      {isListening && (
        <div className="absolute -bottom-6 right-2 text-xs text-rose-600 font-medium flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          Идёт запись…
        </div>
      )}
    </div>
  )
}
