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
  Sparkles, Key, Eye, EyeOff, CheckCircle2, ExternalLink, Lock,
} from 'lucide-react'

interface AiSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 🔑 Ключ AnyModel по умолчанию — вшит в src/lib/zai-direct.ts.
// В этом файле НЕ храним значение ключа — только маску.
const DEFAULT_KEYS_ACTIVE = true

export function AiSettingsModal({ open, onOpenChange }: AiSettingsModalProps) {
  const [anymodelKey, setAnymodelKey] = useState('')
  const [showAnymodelKey, setShowAnymodelKey] = useState(false)
  const [usingDefault, setUsingDefault] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem('anymodel_api_key')
      if (stored) {
        setAnymodelKey(stored)
        setUsingDefault(false)
      } else {
        setAnymodelKey('')
        setUsingDefault(true)
      }
      setSaved(false)
    }
  }, [open])

  const handleSave = () => {
    if (anymodelKey.trim()) {
      localStorage.setItem('anymodel_api_key', anymodelKey.trim())
    } else {
      localStorage.removeItem('anymodel_api_key')
    }
    setSaved(true)
    setTimeout(() => onOpenChange(false), 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Настройки AI
          </DialogTitle>
          <DialogDescription>
            AnyModel.org — единственный источник AI.
            DeepSeek V4 Flash (дифдиагнозы) + Gemini 3.7 Flash (OCR).
            Ключ уже встроен в приложение и работает по умолчанию.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Статус — всегда "AI подключён" т.к. есть вшитый ключ */}
          <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-emerald-800">AI подключён и работает</span>
              <Badge variant="outline" className="ml-auto text-emerald-700 border-emerald-300 bg-emerald-50">
                AnyModel
              </Badge>
            </div>
            <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Вшитый ключ активен и защищён (не виден в UI)
            </div>
          </div>

          {/* AnyModel API Key — ЕДИНСТВЕННЫЙ */}
          <div className="space-y-1.5 p-3 rounded-lg border border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1 font-semibold">
                <Key className="h-3 w-3 text-emerald-600" />
                AnyModel API Key
              </Label>
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">
                ОСНОВНОЙ
              </Badge>
            </div>

            {usingDefault ? (
              // Режим: используется вшитый ключ (не показываем его значение)
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-100/50 border border-emerald-200">
                  <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 text-sm">
                    <div className="font-mono text-emerald-700">sk-••••••••••••••</div>
                    <div className="text-xs text-emerald-600 italic mt-0.5">Вшитый ключ (защищён, не редактируется)</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Чтобы использовать <strong>свой</strong> ключ AnyModel — введите его ниже.
                  Иначе продолжит работать вшитый.
                </div>
                <div className="relative">
                  <Input
                    type={showAnymodelKey ? 'text' : 'password'}
                    value={anymodelKey}
                    onChange={(e) => {
                      setAnymodelKey(e.target.value)
                      setUsingDefault(!!e.target.value.trim())
                    }}
                    placeholder="Введите свой ключ (необязательно)"
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
              </div>
            ) : (
              // Режим: пользователь задал свой ключ
              <div className="relative">
                <Input
                  type={showAnymodelKey ? 'text' : 'password'}
                  value={anymodelKey}
                  onChange={(e) => setAnymodelKey(e.target.value)}
                  placeholder="Введите ключ AnyModel"
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
            )}

            <div className="text-xs text-muted-foreground">
              Получить свой ключ: <a href="https://anymodel.org" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline inline-flex items-center gap-0.5">
                anymodel.org <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Информация о моделях */}
          <div className="p-3 rounded-lg bg-emerald-50/30 border border-emerald-200 text-xs text-emerald-800 space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Активные модели:
            </div>
            <div className="ml-4 space-y-1">
              <div><strong>DeepSeek V4 Flash</strong> (ds/deepseek-v4-flash) — дифдиагнозы, $0.05/1M токенов</div>
              <div><strong>Gemini 3.7 Flash Medium</strong> (ag/gemini-3.7-flash-medium) — OCR, $0.6/1M токенов</div>
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
