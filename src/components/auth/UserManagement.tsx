'use client'

import { useState, useEffect } from 'react'
import { useAuthStore, type User } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Users, UserPlus, Trash2, Key, Eye, EyeOff, AlertCircle, Shield, CheckCircle2, Lock,
} from 'lucide-react'

export function UserManagement({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const users = useAuthStore((s) => s.users)
  const currentUser = useAuthStore((s) => s.currentUser)
  const addUser = useAuthStore((s) => s.addUser)
  const removeUser = useAuthStore((s) => s.removeUser)
  const changePassword = useAuthStore((s) => s.changePassword)
  const initializeDefault = useAuthStore((s) => s.initializeDefault)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'vet'>('vet')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const [passwordChangeFor, setPasswordChangeFor] = useState<User | null>(null)
  const [newPwd, setNewPwd] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')

  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    initializeDefault()
  }, [initializeDefault])

  // Только админ может управлять пользователями
  const isAdmin = currentUser?.role === 'admin'

  const handleAdd = () => {
    setAddError('')
    setAddSuccess('')
    if (!newUsername.trim() || !newPassword.trim()) {
      setAddError('Логин и пароль обязательны')
      return
    }
    if (newPassword.length < 4) {
      setAddError('Пароль должен быть минимум 4 символа')
      return
    }
    const result = addUser({
      username: newUsername,
      password: newPassword,
      displayName: newDisplayName || newUsername,
      role: newRole,
      createdAt: '',
    })
    if (!result.success) {
      setAddError(result.error || 'Ошибка')
    } else {
      setAddSuccess(`Пользователь "${newUsername}" добавлен ✓`)
      setNewUsername('')
      setNewPassword('')
      setNewDisplayName('')
      setNewRole('vet')
      setShowNewPassword(false)
      setTimeout(() => {
        setShowAddDialog(false)
        setAddSuccess('')
      }, 1500)
    }
  }

  const handleChangePassword = () => {
    if (!passwordChangeFor) return
    setPwdError('')
    setPwdSuccess('')
    if (newPwd.length < 4) {
      setPwdError('Пароль должен быть минимум 4 символа')
      return
    }
    const result = changePassword(passwordChangeFor.username, newPwd)
    if (!result.success) {
      setPwdError(result.error || 'Ошибка')
    } else {
      setPwdSuccess('Пароль изменён ✓')
      setNewPwd('')
      setShowNewPwd(false)
      setTimeout(() => {
        setPasswordChangeFor(null)
        setPwdSuccess('')
      }, 1500)
    }
  }

  const handleDelete = () => {
    if (!confirmDelete) return
    setDeleteError('')
    const result = removeUser(confirmDelete.username)
    if (!result.success) {
      setDeleteError(result.error || 'Ошибка')
    } else {
      setConfirmDelete(null)
      setDeleteError('')
    }
  }

  if (!isAdmin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Доступ запрещён</DialogTitle>
            <DialogDescription>
              Управление пользователями доступно только администратору.
              <br />
              Текущий пользователь: {currentUser?.displayName || currentUser?.username}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Управление пользователями
            </DialogTitle>
            <DialogDescription>
              Добавляйте новых врачей, меняйте пароли и удаляйте аккаунты.
              Текущий: {currentUser?.displayName || currentUser?.username} ({currentUser?.role})
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {/* Кнопка добавить */}
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Добавить врача
            </Button>

            {/* Список пользователей */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Пользователи ({users.length}):
              </Label>
              {users.map((user) => (
                <div
                  key={user.username}
                  className={`p-3 rounded-md border flex items-start justify-between gap-2 ${
                    user.username === 'admin'
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-card border-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                      {user.username === 'admin' && <Shield className="h-4 w-4 text-emerald-600" />}
                      {user.displayName}
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          user.role === 'admin'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : 'bg-sky-100 text-sky-700 border-sky-300'
                        }`}
                      >
                        {user.role === 'admin' ? 'Админ' : 'Врач'}
                      </Badge>
                      {user.username === currentUser?.username && (
                        <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                          Вы
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Логин: <span className="font-mono">{user.username}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Создан: {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      onClick={() => {
                        setPasswordChangeFor(user)
                        setNewPwd('')
                        setPwdError('')
                        setPwdSuccess('')
                      }}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                    >
                      <Key className="h-3 w-3 mr-1" />
                      Пароль
                    </Button>
                    {user.username !== 'admin' && (
                      <Button
                        onClick={() => {
                          setConfirmDelete(user)
                          setDeleteError('')
                        }}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Удалить
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Подсказка безопасности */}
            <div className="p-3 rounded-md bg-sky-50 border border-sky-200 text-xs text-sky-700 flex items-start gap-2">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Безопасность:</span> пароли хранятся в виде
                хэша в localStorage браузера. Для командной работы (несколько устройств)
                нужен общий backend с базой данных — обсудим отдельно.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог добавления пользователя */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open)
        if (!open) {
          setAddError('')
          setAddSuccess('')
          setNewUsername('')
          setNewPassword('')
          setNewDisplayName('')
          setNewRole('vet')
          setShowNewPassword(false)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
              Новый пользователь
            </DialogTitle>
            <DialogDescription>
              Заполните данные нового врача. После создания он сможет войти
              со своим логином и паролем.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">ФИО врача (отображаемое имя)</Label>
              <Input
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Напр.: Иванова М.П."
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Логин *</Label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Напр.: dr-ivanova"
                className="h-9"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Пароль * (минимум 4 символа)</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Напр.: parol123"
                  className="h-9 pr-9"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Роль</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewRole('vet')}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                    newRole === 'vet'
                      ? 'bg-sky-100 border-sky-300 text-sky-700'
                      : 'bg-card border-slate-200 text-muted-foreground'
                  }`}
                >
                  Врач
                </button>
                <button
                  type="button"
                  onClick={() => setNewRole('admin')}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                    newRole === 'admin'
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                      : 'bg-card border-slate-200 text-muted-foreground'
                  }`}
                >
                  Админ
                </button>
              </div>
            </div>

            {addError && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}
            {addSuccess && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{addSuccess}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Создать пользователя
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог смены пароля */}
      <Dialog open={!!passwordChangeFor} onOpenChange={(open) => {
        if (!open) {
          setPasswordChangeFor(null)
          setNewPwd('')
          setPwdError('')
          setPwdSuccess('')
          setShowNewPwd(false)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-emerald-600" />
              Смена пароля
            </DialogTitle>
            <DialogDescription>
              Пользователь: <strong>{passwordChangeFor?.displayName}</strong> ({passwordChangeFor?.username})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Новый пароль (минимум 4 символа)</Label>
              <div className="relative">
                <Input
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="••••••"
                  className="h-9 pr-9"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {pwdError && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{pwdError}</span>
              </div>
            )}
            {pwdSuccess && (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{pwdSuccess}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordChangeFor(null)
                setNewPwd('')
                setPwdError('')
                setPwdSuccess('')
                setShowNewPwd(false)
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleChangePassword}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!newPwd}
            >
              <Key className="h-4 w-4 mr-1.5" />
              Изменить пароль
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => {
        if (!open) {
          setConfirmDelete(null)
          setDeleteError('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить пользователя?</DialogTitle>
            <DialogDescription>
              Пользователь <strong>{confirmDelete?.displayName}</strong> ({confirmDelete?.username})
              будет удалён. Это действие необратимо.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
