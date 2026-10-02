'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { LoginPage } from '@/components/auth/LoginPage'
import { UserManagement } from '@/components/auth/UserManagement'
import { Button } from '@/components/ui/button'
import { Users, LogOut, User as UserIcon } from 'lucide-react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentUser = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)
  const initializeDefault = useAuthStore((s) => s.initializeDefault)
  const [showUserManagement, setShowUserManagement] = useState(false)
  // ⚠️ В статическом экспорте persist middleware гидратирует localStorage синхронно
  // при создании store. Но React SSR рендерит до этого.
  // Решение: используем hasHydrated + polling fallback.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let attempts = 0
    const checkHydration = () => {
      attempts++
      if (useAuthStore.persist.hasHydrated()) {
        setHydrated(true)
        return
      }
      if (attempts < 20) {
        setTimeout(checkHydration, 50)
      } else {
        // Fallback — через 1 секунду всё равно показываем UI
        setHydrated(true)
      }
    }
    checkHydration()
  }, [])

  // Инициализация admin по умолчанию при первом запуске
  useEffect(() => {
    initializeDefault()
  }, [initializeDefault])

  // Пока не гидратированы — показываем loader
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

  // Если не авторизован — показываем страницу входа
  if (!isAuthenticated || !currentUser) {
    return <LoginPage />
  }

  // Иначе — показываем приложение + кнопки управления в шапке
  return (
    <>
      {children}

      <div className="fixed bottom-4 right-4 z-50 flex gap-2 pb-[env(safe-area-inset-bottom)]">
        <div className="px-3 py-2 rounded-lg bg-white/95 backdrop-blur shadow-md border border-emerald-200 text-xs text-emerald-700 flex items-center gap-1.5">
          <UserIcon className="h-3.5 w-3.5" />
          <span className="font-medium max-w-[120px] truncate">
            {currentUser.displayName}
          </span>
        </div>

        {currentUser.role === 'admin' && (
          <Button
            onClick={() => setShowUserManagement(true)}
            variant="outline"
            size="sm"
            className="bg-white/95 backdrop-blur shadow-md border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-10 w-10 p-0"
            title="Управление пользователями"
          >
            <Users className="h-4 w-4" />
          </Button>
        )}

        <Button
          onClick={() => {
            if (confirm('Выйти из системы?')) {
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

      <UserManagement
        open={showUserManagement}
        onOpenChange={setShowUserManagement}
      />
    </>
  )
}
