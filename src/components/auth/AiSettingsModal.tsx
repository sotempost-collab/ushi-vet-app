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

export function AiSettingsModal({ open, onOpenChange }: AiSettingsModalProps) {
  const [showAnymodelKey, setShowAnymodelKey] = useState(false)
  const [anymodelKey, setAnymodelKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      setAnymodelKey(localStorage.getItem('anymodel_api_key') || '')
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
            AI работает через Cloudflare Workers — ключи скрыты и защищены.
            Polza.ai (основной) + AnyModel (резервный).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Статус — всегда активно (ключи в Worker) */}
          <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-emerald-800">AI подключён и работает</span>
              <Badge variant="outline" className="ml-auto text-emerald-700 border-emerald-300 bg-emerald-50">
                Polza.ai + AnyModel
              </Badge>
            </div>
            <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Ключи защищены в Cloudflare Workers (не видны в DevTools)
            </div>
          </div>

          {/* Polza.ai — основной, через Worker */}
          <div className="space-y-1.5 p-3 rounded-lg border border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1 font-semibold">
                <Key className="h-3 w-3 text-emerald-600" />
                Polza.ai
              </Label>
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">
                ОСНОВНОЙ
              </Badge>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-100/50 border border-emerald-200">
              <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-mono text-emerald-700">pza-••••••••••••••</div>
                <div className="text-xs text-emerald-600 italic mt-0.5">Ключ в Cloudflare Worker (защищён)</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Модели: <strong>GPT-4o-mini</strong> (дифдиагнозы, 3-5с) и <strong>Gemini 2.5 Flash</strong> (OCR, 3-5с)
            </div>
          </div>

          {/* AnyModel — резервный, через Worker */}
          <div className="space-y-1.5 p-3 rounded-lg border border-amber-200 bg-amber-50/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1 font-semibold">
                <Key className="h-3 w-3 text-amber-600" />
                AnyModel
              </Label>
              <span className="text-xs text-muted-foreground">резервный fallback</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-amber-100/50 border border-amber-200">
              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-mono text-amber-700">sk-••••••••••••••</div>
                <div className="text-xs text-amber-600 italic mt-0.5">Ключ в Cloudflare Worker (защищён)</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Модели: <strong>DeepSeek V4 Flash</strong> (дифдиагнозы) и <strong>Gemini 3.7 Flash</strong> (OCR)
            </div>
            {/* Поле для своего ключа AnyModel (опционально) */}
            <div className="relative mt-2">
              <Input
                type={showAnymodelKey ? 'text' : 'password'}
                value={anymodelKey}
                onChange={(e) => setAnymodelKey(e.target.value)}
                placeholder="Свой ключ AnyModel (необязательно)"
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

          {saved && (
            <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Настройки сохранены. Перезагрузите страницу.
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
