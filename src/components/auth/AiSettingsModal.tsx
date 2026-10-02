'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles, Key, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink, Trash2,
} from 'lucide-react'

interface AiSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AiSettingsModal({ open, onOpenChange }: AiSettingsModalProps) {
  // 🆕 Дефолтные модели AnyModel.org (только модели доступные на AnyModel)
  const DEFAULT_TEXT_MODEL = 'cx/gpt-5.6-sol'        // OpenAI GPT-5.6 Sol — дёшево и хорошо
  const DEFAULT_VISION_MODEL = 'glm/glm-5.3-flash'  // GLM-5.3 Flash — multimodal (vision), дёшево

  const [apiKey, setApiKey] = useState('')
  const [textModel, setTextModel] = useState(DEFAULT_TEXT_MODEL)
  const [visionModel, setVisionModel] = useState(DEFAULT_VISION_MODEL)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  // Загрузка текущих значений
  useEffect(() => {
    if (open) {
      const key = localStorage.getItem('anymodel_api_key') || ''
      // Если в localStorage пусто или стоит старое значение (gpt-4o), заменим на новый дефолт
      const tm = localStorage.getItem('anymodel_text_model') || DEFAULT_TEXT_MODEL
      const vm = localStorage.getItem('anymodel_vision_model') || DEFAULT_VISION_MODEL
      setApiKey(key)
      setTextModel(tm)
      setVisionModel(vm)
      setSaved(false)
    }
  }, [open])

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('anymodel_api_key', apiKey.trim())
    } else {
      localStorage.removeItem('anymodel_api_key')
    }
    localStorage.setItem('anymodel_text_model', textModel.trim() || DEFAULT_TEXT_MODEL)
    localStorage.setItem('anymodel_vision_model', visionModel.trim() || DEFAULT_VISION_MODEL)
    setSaved(true)
    setTimeout(() => {
      onOpenChange(false)
    }, 1000)
  }

  const handleClear = () => {
    if (!confirm('Удалить API ключ? Приложение переключится на бесплатный Worker (GLM).')) return
    localStorage.removeItem('anymodel_api_key')
    setApiKey('')
    setSaved(true)
    setTimeout(() => onOpenChange(false), 1000)
  }

  const isActive = !!apiKey.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Настройки AI
          </DialogTitle>
          <DialogDescription>
            Подключите AnyModel.org для использования GPT-5.6, Claude, GLM, Grok вместо бесплатного Worker.
            Это улучшит качество OCR и дифференциальных диагнозов.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Статус */}
          <div className={`p-3 rounded-lg border ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 text-sm">
              {isActive ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium text-emerald-800">AnyModel подключён</span>
                  <Badge variant="outline" className="ml-auto text-emerald-700 border-emerald-300 bg-emerald-50">
                    {textModel}
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">AnyModel не подключён</span>
                  <span className="text-xs text-amber-700 ml-auto">Используется бесплатный Worker</span>
                </>
              )}
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Key className="h-3 w-3" />
              AnyModel API Key
            </Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="am-abc123..."
                className="pr-11 font-mono text-sm"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              Получить ключ: <a href="https://anymodel.org" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline inline-flex items-center gap-0.5">
                anymodel.org <ExternalLink className="h-3 w-3" />
              </a>
              <br />
              <span className="italic">Регистрация → Пополнить баланс → API Keys → Создать ключ</span>
            </div>
          </div>

          {/* Text Model */}
          <div className="space-y-1.5">
            <Label className="text-xs">Модель для дифференциальных диагнозов (текст)</Label>
            <Input
              value={textModel}
              onChange={(e) => setTextModel(e.target.value)}
              placeholder={DEFAULT_TEXT_MODEL}
              className="font-mono text-sm"
            />
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Доступные на AnyModel:</span>{' '}
              <code>cx/gpt-5.6-sol</code> (по умолчанию, дёшево),{' '}
              <code>cx/gpt-5.5</code>,{' '}
              <code>cx/gpt-6-sol</code>,{' '}
              <code>cx/gpt-6-astra</code>,{' '}
              <code>cc/claude-sonnet-5</code>,{' '}
              <code>cc/claude-opus-5</code>,{' '}
              <code>gcli/grok-4.7</code>
            </div>
          </div>

          {/* Vision Model */}
          <div className="space-y-1.5">
            <Label className="text-xs">Модель для OCR (распознавание сканов)</Label>
            <Input
              value={visionModel}
              onChange={(e) => setVisionModel(e.target.value)}
              placeholder={DEFAULT_VISION_MODEL}
              className="font-mono text-sm"
            />
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Multimodal модели (с vision):</span>{' '}
              <code>glm/glm-5.3-flash</code> (по умолчанию, дёшево),{' '}
              <code>glm/glm-5.3</code>,{' '}
              <code>kmc/k3</code> (Kimi K3)
              <br />
              <span className="italic">⚠️ Не используйте чисто-текстовые модели (gpt-5.6, claude-sonnet) для OCR — они не видят изображения.</span>
            </div>
          </div>

          {saved && (
            <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Настройки сохранены. Перезагрузите страницу для применения.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isActive && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="text-rose-700 border-rose-300 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить ключ
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {saved ? 'Сохранено' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
