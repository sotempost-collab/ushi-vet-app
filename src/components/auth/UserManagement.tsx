'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Users, UserPlus, Trash2, Key, Eye, EyeOff, AlertCircle, Shield, Lock } from 'lucide-react'

interface ClinicUser {
  id: string
  username: string
  displayName: string
  role: string
  createdAt: string
}

export function UserManagement({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const currentClinic = useAuthStore((s) => s.currentClinic)
  const token = useAuthStore((s) => s.token)
  const [users, setUsers] = useState<ClinicUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '', role: 'vet' })
  const [newPassword, setNewPassword] = useState('')
  const [changePass, setChangePass] = useState({ oldPassword: '', newPassword: '' })
  const [showChangePass, setShowChangePass] = useState(false)

  const authHeaders = { 'Authorization': `Bearer ${token || ''}` }

  const loadUsers = async () => {
    if (!token) return
    try {
      const resp = await fetch('/api/users', { headers: authHeaders })
      const data = await resp.json()
      if (resp.ok) setUsers(data.users || [])
    } catch (e) { console.error('Load users error:', e) }
  }

  useEffect(() => {
    if (open && currentUser?.role === 'admin') loadUsers()
    if (open) { setError(''); setLoading(false) }
  }, [open, currentUser, token])

  const handleAddUser = async () => {
    setError('')
    if (!token) {
      setError('Локальный режим: пользователи не сохраняются. Подключите БД для управления пользователями.')
      return
    }
    if (!newUser.username || !newUser.password) { setError('Логин и пароль обязательны'); return }
    setLoading(true)
    try {
      const resp = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(newUser),
      })
      const data = await resp.json()
      if (!resp.ok) { setError(data.error); return }
      setShowAdd(false)
      setNewUser({ username: '', password: '', displayName: '', role: 'vet' })
      loadUsers()
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Удалить пользователя?')) return
    try {
      await fetch(`/api/users?id=${userId}`, { method: 'DELETE', headers: authHeaders })
      loadUsers()
    } catch (e: any) { setError(e.message) }
  }

  const handleResetPassword = async () => {
    setError('')
    if (!newPassword || newPassword.length < 4) { setError('Пароль не короче 4 символов'); return }
    setLoading(true)
    try {
      const resp = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ userId: resetUserId, newPassword }),
      })
      const data = await resp.json()
      if (!resp.ok) { setError(data.error); return }
      setResetUserId(null)
      setNewPassword('')
      alert('Пароль изменён!')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const handleChangePassword = async () => {
    setError('')
    if (!token) {
      setError('Локальный режим: смена пароля недоступна. Подключите БД.')
      return
    }
    if (!changePass.oldPassword || !changePass.newPassword) { setError('Заполните оба поля'); return }
    if (changePass.newPassword.length < 4) { setError('Новый пароль не короче 4 символов'); return }
    setLoading(true)
    try {
      const resp = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(changePass),
      })
      const data = await resp.json()
      if (!resp.ok) { setError(data.error); return }
      setShowChangePass(false)
      setChangePass({ oldPassword: '', newPassword: '' })
      alert('Пароль изменён!')
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const isAdmin = currentUser?.role === 'admin'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            Управление пользователями
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Сменить свой пароль — для всех */}
          <Button onClick={() => setShowChangePass(true)} variant="outline" className="w-full">
            <Key className="h-4 w-4 mr-2" />
            Сменить мой пароль
          </Button>

          {/* Список пользователей — только для админа */}
          {isAdmin && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Пользователи клиники «{currentClinic?.name || currentClinic?.slug || '—'}» ({users.length})
                </Label>
                <Button size="sm" onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Добавить
                </Button>
              </div>

              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                    <Shield className={`h-4 w-4 ${u.role === 'admin' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.displayName}</div>
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    </div>
                    <Badge variant="outline" className={u.role === 'admin' ? 'text-emerald-700 border-emerald-300' : 'text-muted-foreground'}>
                      {u.role === 'admin' ? 'Админ' : 'Врач'}
                    </Badge>
                    {u.id !== currentUser?.id && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setResetUserId(u.id)} title="Сбросить пароль">
                          <Lock className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(u.id)} className="text-rose-600 hover:text-rose-700" title="Удалить">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {error && (
            <div className="p-2 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Диалог: добавить пользователя */}
        {showAdd && (
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Новый пользователь</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Input placeholder="Логин" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
                <Input placeholder="ФИО" value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} />
                <Input type="password" placeholder="Пароль" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                <Button onClick={handleAddUser} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {loading ? 'Добавление...' : 'Добавить'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Диалог: сброс пароля */}
        {resetUserId && (
          <Dialog open={!!resetUserId} onOpenChange={(v) => !v && setResetUserId(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Сбросить пароль</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Input type="password" placeholder="Новый пароль" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <Button onClick={handleResetPassword} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {loading ? 'Сохранение...' : 'Изменить пароль'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Диалог: сменить свой пароль */}
        {showChangePass && (
          <Dialog open={showChangePass} onOpenChange={setShowChangePass}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Сменить пароль</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Input type="password" placeholder="Старый пароль" value={changePass.oldPassword} onChange={(e) => setChangePass({ ...changePass, oldPassword: e.target.value })} />
                <Input type="password" placeholder="Новый пароль" value={changePass.newPassword} onChange={(e) => setChangePass({ ...changePass, newPassword: e.target.value })} />
                <Button onClick={handleChangePassword} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {loading ? 'Сохранение...' : 'Изменить'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
