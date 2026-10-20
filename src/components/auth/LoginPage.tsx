'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  PawPrint,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  Info,
  Building2,
  Loader2,
} from 'lucide-react'

interface ClinicOption {
  slug: string
  name: string
}

export function LoginPage({
  onSwitchToRegister,
}: {
  onSwitchToRegister?: () => void
}) {
  const login = useAuthStore((s) => s.login)

  const [clinicSlug, setClinicSlug] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [clinics, setClinics] = useState<ClinicOption[]>([])
  const [clinicsLoading, setClinicsLoading] = useState(true)

  // Список клиник для дропдауна.
  useEffect(() => {
    fetch('/api/clinics')
      .then((r) => r.json())
      .then((data) => setClinics(data.clinics || []))
      .catch(() => setClinics([]))
      .finally(() => setClinicsLoading(false))
  }, [])

  // Если клиника одна — подставляем автоматически.
  useEffect(() => {
    if (!clinicsLoading && clinics.length === 1 && !clinicSlug) {
      setClinicSlug(clinics[0].slug)
    }
  }, [clinicsLoading, clinics, clinicSlug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const slug = clinicSlug.trim()
    const u = username.trim()
    const p = password

    if (!slug || !u || !p) {
      setError('Заполните все поля')
      return
    }

    setLoading(true)
    const result = await login(slug, u, p)
    if (!result.success) {
      setError(result.error || 'Ошибка входа')
      setLoading(false)
    }
  }

  const handleDemoFill = () => {
    if (clinics.some((c) => c.slug === 'default')) {
      setClinicSlug('default')
    } else if (clinics.length > 0) {
      setClinicSlug(clinics[0].slug)
    }
    setUsername('admin')
    setPassword('admin')
    setError('')
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
              Войдите в клинику для доступа к ветеринарному приложению
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
              Укажите клинику, логин и пароль. Логин уникален только в пределах клиники.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Поле клиники — новое */}
              <div className="space-y-1.5">
                <Label htmlFor="clinicSlug" className="text-xs flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  Клиника
                </Label>
                <Input
                  id="clinicSlug"
                  type="text"
                  list="clinics-list"
                  value={clinicSlug}
                  onChange={(e) => setClinicSlug(e.target.value)}
                  placeholder={clinicsLoading ? 'Загрузка…' : 'например, default'}
                  autoComplete="organization"
                  className="h-11"
                  disabled={clinicsLoading}
                />
                <datalist id="clinics-list">
                  {clinics.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </datalist>
                {clinics.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Доступно клиник: {clinics.length}.{' '}
                    {clinics.slice(0, 3).map((c) => c.slug).join(', ')}
                    {clinics.length > 3 ? '…' : ''}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs">
                  Логин
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">
                  Пароль
                </Label>
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-wrap">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Проверка…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Войти
                  </>
                )}
              </Button>
            </form>

            {/* Подсказка с admin/admin */}
            <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
              <div className="font-medium flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                Учётная запись по умолчанию (для клиники <code>default</code>):
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

            <p className="mt-3 text-xs text-muted-foreground text-center">
              Чтобы добавить новую клинику, запустите{' '}
              <code>npm run seed:clinic</code> на сервере
              {onSwitchToRegister ? ' или ' : '.'}
              {onSwitchToRegister && (
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="text-emerald-700 hover:text-emerald-900 underline ml-1"
                >
                  зарегистрировать новую клинику →
                </button>
              )}
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          🐾 Данные пользователей хранятся в общей базе данных клиник.
          <br />
          Логин уникален в пределах одной клиники — admin может быть в каждой.
        </p>
      </div>
    </div>
  )
}
