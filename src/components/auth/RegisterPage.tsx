'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PawPrint, Building2, UserPlus, AlertCircle } from 'lucide-react'

export function RegisterPage({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const router = useRouter()
  const [clinicSlug, setClinicSlug] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminDisplayName, setAdminDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!clinicSlug || !clinicName || !adminUsername || !adminPassword) {
      setError('Заполните slug, название клиники, логин и пароль администратора')
      return
    }
    if (!/^[a-z0-9-]+$/.test(clinicSlug.toLowerCase().trim())) {
      setError('Slug клиники: только строчные латинские буквы, цифры и дефис')
      return
    }
    if (adminPassword.length < 4) {
      setError('Пароль должен быть не короче 4 символов')
      return
    }
    setLoading(true)
    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicSlug, clinicName, address, phone, adminUsername, adminPassword, adminDisplayName }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error || 'Ошибка регистрации')
      } else {
        setSuccess(true)
        setTimeout(() => onSwitchToLogin(), 2000)
      }
    } catch (e: any) {
      setError('Ошибка сети: ' + e.message)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50 p-4">
        <Card className="max-w-md w-full border-emerald-200 shadow-lg">
          <CardContent className="pt-6 text-center space-y-3">
            <PawPrint className="h-12 w-12 text-emerald-600 mx-auto" />
            <h2 className="text-xl font-bold text-emerald-800">Клиника зарегистрирована!</h2>
            <p className="text-sm text-muted-foreground">Сейчас вы будете перенаправлены на страницу входа</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg">
            <PawPrint className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-emerald-800">Регистрация клиники</h1>
          <p className="text-sm text-muted-foreground">Создайте аккаунт для вашей ветеринарной клиники. Slug — короткое имя для входа.</p>
        </div>

        <Card className="border-emerald-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <Building2 className="h-5 w-5" />
              Данные клиники
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Slug клиники * (для входа, напр.: acme-vet)</Label>
                <Input value={clinicSlug} onChange={(e) => setClinicSlug(e.target.value.toLowerCase())} placeholder="acme-vet" className="h-10" />
                <p className="text-xs text-muted-foreground">Только строчные буквы, цифры и дефис. Используется при входе.</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Название клиники *</Label>
                <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Напр.: ВетКлиника №1" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Адрес</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Напр.: г. Москва, ул. Ленина 1" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Телефон</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 123-45-67" className="h-10" />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Label className="text-xs font-semibold flex items-center gap-1 mb-2">
                  <UserPlus className="h-3 w-3" />
                  Администратор (главный врач)
                </Label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ФИО администратора</Label>
                <Input value={adminDisplayName} onChange={(e) => setAdminDisplayName(e.target.value)} placeholder="Иванов И.И." className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Логин *</Label>
                <Input value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} placeholder="admin" className="h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Пароль * (мин. 4 символа)</Label>
                <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••" className="h-10" />
              </div>

              {error && (
                <div className="p-2 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? 'Регистрация...' : 'Зарегистрировать клинику'}
              </Button>

              <div className="text-center pt-2">
                <button type="button" onClick={onSwitchToLogin} className="text-xs text-emerald-700 hover:text-emerald-900 underline">
                  Уже есть аккаунт? Войти
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
