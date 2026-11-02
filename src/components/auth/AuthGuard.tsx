'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { UserManagement } from '@/components/auth/UserManagement'
import { AiSettingsModal } from '@/components/auth/AiSettingsModal'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users, Sparkles } from 'lucide-react'

// Режим без авторизации — приложение открывается сразу без страницы входа.
// Логин/пароль и панель входа будут добавлены позже.
//
// Чтобы вернуть серверную авторизацию — восстановите из commit bce4a0b:
//   git checkout bce4a0b -- src/components/auth/AuthGuard.tsx src/store/authStore.ts

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

  // Поднимаем дефолтную сессию — без обращения к серверу.
  // Без hydrated-проверки, чтобы избежать зависания на loader'е.
  useEffect(() => {
    // Очищаем возможный мусор от старых версий (старый token, который
    // мог остаться от предыдущей серверной авторизации).
    try {
      const raw = localStorage.getItem('ushihvost-auth-storage')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.state?.token) {
          // Удаляем старый token — он не валиден в безавторизованном режиме.
          parsed.state.token = null
          localStorage.setItem('ushihvost-auth-storage', JSON.stringify(parsed))
        }
      }
    } catch {}
    setAuthBypass(DEFAULT_USER, DEFAULT_CLINIC)
  }, [setAuthBypass])

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
