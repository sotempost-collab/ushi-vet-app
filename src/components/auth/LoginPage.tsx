'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PawPrint, LogIn, Eye, EyeOff, AlertCircle, Info, RefreshCw, Zap } from 'lucide-react'

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const initializeDefault = useAuthStore((s) => s.initializeDefault)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showHint, setShowHint] = useState(true) // по умолчанию открыто — чтобы пользователь сразу видел admin/admin

  // При первом открытии инициализируем admin по умолчанию
  useEffect(() => {
    initializeDefault()
  }, [initializeDefault])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    // Если поля пустые (например, paste не сработал) — пробуем admin/admin
    const u = username.trim() || 'admin'
    const p = password || 'admin'
    setLoading(true)
    setTimeout(() => {
      const result = login(u, p)
      if (!result.success) {
        setError(result.error || 'Ошибка входа. Попробуйте сбросить данные аккаунта.')
        setLoading(false)
      }
      // если success — AuthGuard сам переключит
    }, 200)
  }

  const handleDemoFill = () => {
    setUsername('admin')
    setPassword('admin')
    setError('')
  }

  // 🆕 Быстрый вход одной кнопкой — обходит проблему paste/onChange
  const handleQuickAdminLogin = () => {
    setError('')
    setLoading(true)
    setUsername('admin')
    setPassword('admin')
    setTimeout(() => {
      const result = login('admin', 'admin')
      if (!result.success) {
        setError(
          result.error +
          ' Нажмите «Сбросить данные аккаунта» ниже — это вернёт пароль admin/admin по умолчанию.',
        )
        setLoading(false)
      }
    }, 200)
  }

  // 🆕 Сброс данных аккаунта — удаляет всех пользователей и создаёт admin/admin заново
  const handleResetAccount = () => {
    if (
      !confirm(
        'Сбросить данные аккаунта? Будут удалены все пользователи и создан единственный admin с паролем admin.',
      )
    ) {
      return
    }
    // Очищаем localStorage напрямую
    localStorage.removeItem('ushihvost-auth-storage')
    // Также очищаем vet-storage, чтобы избежать конфликтов
    localStorage.removeItem('ushihvost-vet-storage')
    // Принудительно перезагружаем — initializeDefault создаст admin/admin заново
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50 p-4 safe-area-top">
      <div className="w-full max-w-md space-y-6">
        {/* Логотип */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/30">
            <PawPrint className="h-12 w-12 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-emerald-800">Ассистент УшиХвост</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Войдите для доступа к ветеринарному приложению
            </p>
          </div>
        </div>

        {/* Форма входа */}
        <Card className="border-emerald-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <LogIn className="h-5 w-5" />
              Вход в систему
            </CardTitle>
            <CardDescription>
              Введите ваши учётные данные для продолжения
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs">Логин</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  autoFocus
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">Пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-wrap">{error}</span>
                </div>
              )}

              {/* Кнопка Войти — больше не disabled, валидация в handleSubmit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Проверка…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Войти
                  </>
                )}
              </Button>

              {/* 🆕 Быстрый вход admin/admin одной кнопкой */}
              <Button
                type="button"
                onClick={handleQuickAdminLogin}
                disabled={loading}
                variant="outline"
                className="w-full h-11 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <Zap className="h-4 w-4 mr-2" />
                Быстрый вход: admin / admin
              </Button>
            </form>

            {/* Подсказка с admin/admin — теперь открыта по умолчанию */}
            <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
              <div className="font-medium flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                Учётная запись по умолчанию:
              </div>
              <div className="font-mono bg-amber-100 p-1.5 rounded text-center text-sm">
                Логин: <strong>admin</strong> · Пароль: <strong>admin</strong>
              </div>
              <button
                type="button"
                onClick={handleDemoFill}
                className="text-emerald-700 hover:text-emerald-900 underline"
              >
                Заполнить форму автоматически
              </button>
            </div>

            {/* 🆕 Сброс данных аккаунта */}
            <div className="mt-3 pt-3 border-t border-amber-200">
              <div className="text-xs text-muted-foreground mb-2">
                Не входит? Возможно, пароль был изменён ранее. Сбросьте данные аккаунта, чтобы вернуть
                пароль по умолчанию (admin/admin).
              </div>
              <button
                type="button"
                onClick={handleResetAccount}
                className="text-xs text-rose-700 hover:text-rose-900 underline flex items-center gap-1 mx-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Сбросить данные аккаунта
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          🐾 Данные аккаунтов хранятся локально на этом устройстве.
          <br />
          Для командной работы нужен общий сервер — пока работает на одном устройстве.
        </p>
      </div>
    </div>
  )
}
