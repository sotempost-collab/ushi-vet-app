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
  Sparkles, Key, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink,
} from 'lucide-react'

interface AiSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 🔑 Ключ Z.AI вшит в код по умолчанию — пользователь видит его предзаполненным,
// может переопределить или очистить
const DEFAULT_ZAI_API_KEY = '3ab2bda735fc40a19a907f777a93dc7d.N1NGBDl7jh3uFNUW'

export function AiSettingsModal({ open, onOpenChange }: AiSettingsModalProps) {
  const [zaiKey, setZaiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      setZaiKey(localStorage.getItem('zai_api_key') || DEFAULT_ZAI_API_KEY)
      setSaved(false)
    }
  }, [open])

  const handleSave = () => {
    if (zaiKey.trim()) {
      localStorage.setItem('zai_api_key', zaiKey.trim())
    } else {
      localStorage.removeItem('zai_api_key')
    }
    setSaved(true)
    setTimeout(() => onOpenChange(false), 1000)
  }

  const handleUseDefault = () => {
    setZaiKey(DEFAULT_ZAI_API_KEY)
  }

  const isActive = !!zaiKey.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Настройки AI
          </DialogTitle>
          <DialogDescription>
            Z.AI API ключ для дифференциальных диагнозов (GLM-4.5-air) и OCR сканов (GLM-4.5v).
            Ключ уже предзаполнен — можно использовать сразу.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Статус */}
          <div className={`p-3 rounded-lg border ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 text-sm">
              {isActive ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium text-emerald-800">Z.AI подключён</span>
                  <Badge variant="outline" className="ml-auto text-emerald-700 border-emerald-300 bg-emerald-50">
                    GLM-4.5-air / GLM-4.5v
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">Ключ не задан</span>
                  <span className="text-xs text-amber-700 ml-auto">AI функции недоступны</span>
                </>
              )}
            </div>
          </div>

          {/* Z.AI API Key */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Key className="h-3 w-3" />
              Z.AI API Key
            </Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={zaiKey}
                onChange={(e) => setZaiKey(e.target.value)}
                placeholder="3ab2bda735fc40a19a907f777a93dc7d.N1NGBDl7jh3uFNUW"
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
              Получить свой ключ: <a href="https://open.bigmodel.cn/usermode/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline inline-flex items-center gap-0.5">
                open.bigmodel.cn <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {!isActive && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseDefault}
                className="text-xs h-7 mt-1"
              >
                Использовать ключ по умолчанию
              </Button>
            )}
          </div>

          {/* Информация о моделях */}
          <div className="p-3 rounded-lg bg-emerald-50/30 border border-emerald-200 text-xs text-emerald-800 space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Активные модели Z.AI:
            </div>
            <div className="ml-4">
              <div><strong>GLM-4.5-air</strong> — для генерации дифференциальных диагнозов и рекомендаций</div>
              <div><strong>GLM-4.5v</strong> — для распознавания текста со сканов (OCR)</div>
            </div>
          </div>

          {saved && (
            <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Настройки сохранены. Перезагрузите страницу для применения.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {saved ? 'Сохранено' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
