'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { UserManagement } from '@/components/auth/UserManagement'
import { AiSettingsModal } from '@/components/auth/AiSettingsModal'
import { Button } from '@/components/ui/button'
import { Users, LogOut, User as UserIcon, Sparkles, Building2 } from 'lucide-react'

// Локальный режим (без серверной авторизации).
// Приложение работает полностью на localStorage — визиты, пользователи,
// настройки — всё в браузере. Никакого обращения к /api/auth/*.
// Это защитит от «внутренней ошибки сервера» если БД недоступна.
//
// Если позже захотите серверную авторизацию обратно — просто замените
// AuthGuard на версию с restoreSession() и isAuthenticated-проверкой
// (git log: commit 07ecf7f).

const FAKE_USER = {
  id: 'local-admin',
  username: 'admin',
  displayName: 'Локальный врач',
  role: 'admin' as const,
}

const FAKE_CLINIC = {
  id: 'local-clinic',
  slug: 'local',
  name: 'Локальный режим',
  plan: 'free',
  visitLimit: 9999,
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const setAuthBypass = useAuthStore((s) => s.setAuthBypass)
  const currentUser = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)

  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    // Поднимаем фейковую сессию — приложение работает без входа.
    setAuthBypass(FAKE_USER, FAKE_CLINIC)
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

      <div className="fixed bottom-4 right-4 z-50 flex gap-2 pb-[env(safe-area-inset-bottom)] flex-wrap justify-end max-w-[calc(100vw-2rem)]">
        {/* Бейдж клиники */}
        <div className="px-3 py-2 rounded-lg bg-white/95 backdrop-blur shadow-md border border-emerald-200 text-xs text-emerald-700 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          <span className="font-medium max-w-[100px] truncate">Локальный режим</span>
        </div>

        {/* Бейдж пользователя */}
        <div className="px-3 py-2 rounded-lg bg-white/95 backdrop-blur shadow-md border border-emerald-200 text-xs text-emerald-700 flex items-center gap-1.5">
          <UserIcon className="h-3.5 w-3.5" />
          <span className="font-medium max-w-[120px] truncate">
            {currentUser?.displayName || 'Локальный врач'}
          </span>
        </div>

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
          title="Управление пользователями (локально)"
        >
          <Users className="h-4 w-4" />
        </Button>

        <Button
          onClick={() => {
            if (confirm('Выйти из локального режима?')) {
              logout()
            }
          }}
          variant="outline"
          size="sm"
          className="bg-white/95 backdrop-blur shadow-md border-rose-200 text-rose-700 hover:bg-rose-50 h-10 w-10 p-0"
          title="Выйти"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <UserManagement open={showUserManagement} onOpenChange={setShowUserManagement} />
      <AiSettingsModal open={showAiSettings} onOpenChange={setShowAiSettings} />
    </>
  )
}
