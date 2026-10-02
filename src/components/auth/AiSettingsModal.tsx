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

  // Z.AI Direct (рекомендуется — надёжнее, работает напрямую)
  const [zaiKey, setZaiKey] = useState('')
  const [showZaiKey, setShowZaiKey] = useState(false)

  // AnyModel (альтернатива)
  const [anymodelKey, setAnymodelKey] = useState('')
  const [showAnymodelKey, setShowAnymodelKey] = useState(false)
  const [textModel, setTextModel] = useState(DEFAULT_TEXT_MODEL)
  const [visionModel, setVisionModel] = useState(DEFAULT_VISION_MODEL)

  const [saved, setSaved] = useState(false)

  // Загрузка текущих значений
  useEffect(() => {
    if (open) {
      setZaiKey(localStorage.getItem('zai_api_key') || '')
      setAnymodelKey(localStorage.getItem('anymodel_api_key') || '')
      setTextModel(localStorage.getItem('anymodel_text_model') || DEFAULT_TEXT_MODEL)
      setVisionModel(localStorage.getItem('anymodel_vision_model') || DEFAULT_VISION_MODEL)
      setSaved(false)
    }
  }, [open])

  const handleSave = () => {
    // Z.AI key
    if (zaiKey.trim()) {
      localStorage.setItem('zai_api_key', zaiKey.trim())
    } else {
      localStorage.removeItem('zai_api_key')
    }
    // AnyModel key
    if (anymodelKey.trim()) {
      localStorage.setItem('anymodel_api_key', anymodelKey.trim())
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

  const handleClearAll = () => {
    if (!confirm('Удалить все AI ключи? Приложение переключится на бесплатный Worker.')) return
    localStorage.removeItem('zai_api_key')
    localStorage.removeItem('anymodel_api_key')
    setZaiKey('')
    setAnymodelKey('')
    setSaved(true)
    setTimeout(() => onOpenChange(false), 1000)
  }

  const zaiActive = !!zaiKey.trim()
  const anymodelActive = !!anymodelKey.trim()
  const isActive = zaiActive || anymodelActive
  const activeSource = zaiActive ? 'Z.AI Direct' : anymodelActive ? 'AnyModel' : 'Worker'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Настройки AI
          </DialogTitle>
          <DialogDescription>
            Подключите Z.AI (рекомендуется) или AnyModel для дифференциальных диагнозов и OCR.
            Без ключей используется бесплатный Worker (Cloudflare).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Статус */}
          <div className={`p-3 rounded-lg border ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {isActive ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium text-emerald-800">AI подключён: {activeSource}</span>
                  <Badge variant="outline" className="ml-auto text-emerald-700 border-emerald-300 bg-emerald-50">
                    {zaiActive ? 'glm-4.5-air / glm-4.5v' : textModel}
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">Ключи не заданы</span>
                  <span className="text-xs text-amber-700 ml-auto">Используется бесплатный Worker</span>
                </>
              )}
            </div>
          </div>

          {/* Z.AI API Key — РЕКОМЕНДУЕТСЯ */}
          <div className="space-y-1.5 p-3 rounded-lg border border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1 font-semibold">
                <Key className="h-3 w-3 text-emerald-600" />
                Z.AI API Key
              </Label>
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">
                РЕКОМЕНДУЕТСЯ
              </Badge>
            </div>
            <div className="relative">
              <Input
                type={showZaiKey ? 'text' : 'password'}
                value={zaiKey}
                onChange={(e) => setZaiKey(e.target.value)}
                placeholder="3ab2bda735fc40a19a907f777a93dc7d.N1NGBDl7jh3uFNUW"
                className="pr-11 font-mono text-sm"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowZaiKey(!showZaiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showZaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              Получить ключ: <a href="https://open.bigmodel.cn/usermode/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline inline-flex items-center gap-0.5">
                open.bigmodel.cn <ExternalLink className="h-3 w-3" />
              </a>
              <br />
              <span className="italic">Регистрация → API Keys → Создать ключ</span>
              <br />
              <span className="text-emerald-700 font-medium">✓ Работает напрямую, без прокси. Модели: GLM-4.5-air (текст) и GLM-4.5v (vision)</span>
            </div>
          </div>

          {/* AnyModel API Key — АЛЬТЕРНАТИВА */}
          <div className="space-y-1.5 p-3 rounded-lg border border-sky-200 bg-sky-50/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1 font-semibold">
                <Key className="h-3 w-3 text-sky-600" />
                AnyModel API Key (альтернатива)
              </Label>
              <span className="text-xs text-muted-foreground">если нет Z.AI</span>
            </div>
            <div className="relative">
              <Input
                type={showAnymodelKey ? 'text' : 'password'}
                value={anymodelKey}
                onChange={(e) => setAnymodelKey(e.target.value)}
                placeholder="am-abc123..."
                className="pr-11 font-mono text-sm"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowAnymodelKey(!showAnymodelKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showAnymodelKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              Получить ключ: <a href="https://anymodel.org" target="_blank" rel="noopener noreferrer" className="text-sky-700 underline inline-flex items-center gap-0.5">
                anymodel.org <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Модели AnyModel — показываем только если есть ключ */}
            {anymodelKey.trim() && (
              <div className="mt-3 pt-3 border-t border-sky-200 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Модель для текста (дифдиагнозы)</Label>
                  <Input
                    value={textModel}
                    onChange={(e) => setTextModel(e.target.value)}
                    placeholder={DEFAULT_TEXT_MODEL}
                    className="font-mono text-sm"
                  />
                  <div className="text-xs text-muted-foreground">
                    Доступные: <code>cx/gpt-5.6-sol</code> (по умолчанию), <code>cx/gpt-5.5</code>,{' '}
                    <code>cc/claude-sonnet-5</code>, <code>cc/claude-opus-5</code>, <code>gcli/grok-4.7</code>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Модель для OCR (vision)</Label>
                  <Input
                    value={visionModel}
                    onChange={(e) => setVisionModel(e.target.value)}
                    placeholder={DEFAULT_VISION_MODEL}
                    className="font-mono text-sm"
                  />
                  <div className="text-xs text-muted-foreground">
                    Multimodal: <code>glm/glm-5.3-flash</code> (по умолчанию), <code>glm/glm-5.3</code>, <code>kmc/k3</code>
                  </div>
                </div>
              </div>
            )}
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
              onClick={handleClearAll}
              className="text-rose-700 border-rose-300 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить все ключи
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
