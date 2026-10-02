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

// 🔑 Ключи по умолчанию — вшиты в код
const DEFAULT_ANYMODEL_API_KEY = 'sk-dc9d4b7df36ba555-i2dh6j-2ec5b5b2'
const DEFAULT_ZAI_API_KEY = '3ab2bda735fc40a19a907f777a93dc7d.N1NGBDl7jh3uFNUW'

export function AiSettingsModal({ open, onOpenChange }: AiSettingsModalProps) {
  const [anymodelKey, setAnymodelKey] = useState('')
  const [zaiKey, setZaiKey] = useState('')
  const [showAnymodelKey, setShowAnymodelKey] = useState(false)
  const [showZaiKey, setShowZaiKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      setAnymodelKey(localStorage.getItem('anymodel_api_key') || DEFAULT_ANYMODEL_API_KEY)
      setZaiKey(localStorage.getItem('zai_api_key') || DEFAULT_ZAI_API_KEY)
      setSaved(false)
    }
  }, [open])

  const handleSave = () => {
    if (anymodelKey.trim()) {
      localStorage.setItem('anymodel_api_key', anymodelKey.trim())
    } else {
      localStorage.removeItem('anymodel_api_key')
    }
    if (zaiKey.trim()) {
      localStorage.setItem('zai_api_key', zaiKey.trim())
    } else {
      localStorage.removeItem('zai_api_key')
    }
    setSaved(true)
    setTimeout(() => onOpenChange(false), 1000)
  }

  const isActive = !!anymodelKey.trim() || !!zaiKey.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Настройки AI
          </DialogTitle>
          <DialogDescription>
            AnyModel.org — основной источник AI (дёшево, $0.05-0.6/1M токенов).
            Z.AI — резервный fallback. Ключи уже предзаполнены — можно использовать сразу.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Статус */}
          <div className={`p-3 rounded-lg border ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {isActive ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium text-emerald-800">AI подключён</span>
                  <Badge variant="outline" className="ml-auto text-emerald-700 border-emerald-300 bg-emerald-50">
                    {anymodelKey.trim() ? 'AnyModel (основной)' : 'Z.AI (резерв)'}
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">Ключи не заданы</span>
                  <span className="text-xs text-amber-700 ml-auto">AI функции недоступны</span>
                </>
              )}
            </div>
          </div>

          {/* AnyModel API Key — ОСНОВНОЙ */}
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
            <div className="relative">
              <Input
                type={showAnymodelKey ? 'text' : 'password'}
                value={anymodelKey}
                onChange={(e) => setAnymodelKey(e.target.value)}
                placeholder={DEFAULT_ANYMODEL_API_KEY}
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
              Получить ключ: <a href="https://anymodel.org" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline inline-flex items-center gap-0.5">
                anymodel.org <ExternalLink className="h-3 w-3" />
              </a>
              <br />
              <span className="text-emerald-700 font-medium">
                ✓ Используется для: дифдиагнозов (DeepSeek V4 Flash, $0.05/1M) и OCR (Gemini 3.7 Flash, $0.6/1M)
              </span>
            </div>
          </div>

          {/* Z.AI API Key — РЕЗЕРВНЫЙ */}
          <div className="space-y-1.5 p-3 rounded-lg border border-amber-200 bg-amber-50/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1 font-semibold">
                <Key className="h-3 w-3 text-amber-600" />
                Z.AI API Key
              </Label>
              <span className="text-xs text-muted-foreground">резервный fallback</span>
            </div>
            <div className="relative">
              <Input
                type={showZaiKey ? 'text' : 'password'}
                value={zaiKey}
                onChange={(e) => setZaiKey(e.target.value)}
                placeholder={DEFAULT_ZAI_API_KEY}
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
              Получить ключ: <a href="https://open.bigmodel.cn/usermode/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-700 underline inline-flex items-center gap-0.5">
                open.bigmodel.cn <ExternalLink className="h-3 w-3" />
              </a>
              <br />
              <span className="italic">Используется только если AnyModel недоступен (GLM-4.5-air / GLM-4.5v)</span>
            </div>
          </div>

          {/* Информация о моделях */}
          <div className="p-3 rounded-lg bg-emerald-50/30 border border-emerald-200 text-xs text-emerald-800 space-y-1">
            <div className="font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Активные модели:
            </div>
            <div className="ml-4 space-y-1">
              <div><strong>DeepSeek V4 Flash</strong> (ds/deepseek-v4-flash) — текст, $0.05/1M токенов</div>
              <div><strong>Gemini 3.7 Flash Medium</strong> (ag/gemini-3.7-flash-medium) — vision/OCR, $0.6/1M токенов</div>
              <div className="text-muted-foreground italic">Резерв: GLM-4.5-air / GLM-4.5v (Z.AI)</div>
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
