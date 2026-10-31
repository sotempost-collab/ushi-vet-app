'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { UserManagement } from '@/components/auth/UserManagement'
import { AiSettingsModal } from '@/components/auth/AiSettingsModal'
import { Button } from '@/components/ui/button'
import { Users, Sparkles } from 'lucide-react'

// Режим без авторизации — приложение открывается сразу без страницы входа.
// Логин/пароль и панель входа будут добавлены позже.
//
// Чтобы вернуть серверную авторизацию — восстановите из commit bce4a0b:
//   git checkout bce4a0b -- src/components/auth/AuthGuard.tsx src/store/authStore.ts
// Чтобы вернуть локальный режим с фейковой сессией — commit eb23a00.

const DEFAULT_USER = {
  id: 'local-user',
  username: 'doctor',
  displayName: 'Врач',
  role: 'admin' as const,
}

const DEFAULT_CLINIC = {
  id: 'local-clinic',
  slug: 'local',
  name: 'ВетКлиника',
  plan: 'free',
  visitLimit: 9999,
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const setAuthBypass = useAuthStore((s) => s.setAuthBypass)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    setAuthBypass(DEFAULT_USER, DEFAULT_CLINIC)
  }, [setAuthBypass])

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <div className="text-sm text-muted-foreground">Загрузка приложения…</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {children}

      <div className="fixed bottom-4 right-4 z-50 flex gap-2 pb-[env(safe-area-inset-bottom)]">
        <Button
          onClick={() => setShowAiSettings(true)}
          variant="outline"
          size="sm"
          className="bg-white/95 backdrop-blur shadow-md h-10 w-10 p-0 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
          title="Настройки AI"
        >
          <Sparkles className="h-4 w-4" />
        </Button>

        <Button
          onClick={() => setShowUserManagement(true)}
          variant="outline"
          size="sm"
          className="bg-white/95 backdrop-blur shadow-md border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-10 w-10 p-0"
          title="Управление пользователями"
        >
          <Users className="h-4 w-4" />
        </Button>
      </div>

      <UserManagement open={showUserManagement} onOpenChange={setShowUserManagement} />
      <AiSettingsModal open={showAiSettings} onOpenChange={setShowAiSettings} />
    </>
  )
}
