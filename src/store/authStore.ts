import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  username: string
  password: string // в реальном проекте храним hash, но для локального приложения это нормально
  displayName: string // ФИО врача
  role: 'admin' | 'vet'
  createdAt: string
}

interface AuthState {
  // Список пользователей
  users: User[]
  // Текущий авторизованный пользователь
  currentUser: User | null
  // Активная сессия (просто флаг, что вошёл)
  isAuthenticated: boolean

  // Действия
  login: (username: string, password: string) => { success: boolean; error?: string }
  logout: () => void
  addUser: (user: User) => { success: boolean; error?: string }
  removeUser: (username: string) => { success: boolean; error?: string }
  changePassword: (username: string, newPassword: string) => { success: boolean; error?: string }
  // Инициализация — создаёт admin по умолчанию, если нет пользователей
  initializeDefault: () => void
}

// Простой hash-функция (не криптостойкая, но защищает от случайного просмотра)
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return 'h' + Math.abs(hash).toString(36)
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUser: null,
      isAuthenticated: false,

      initializeDefault: () => {
        const state = get()
        // Если вообще нет пользователей — создаём admin/A7225162
        if (state.users.length === 0) {
          const defaultAdmin: User = {
            username: 'admin',
            password: simpleHash('A7225162'),
            displayName: 'Главный врач (admin)',
            role: 'admin',
            createdAt: new Date().toISOString(),
          }
          set({ users: [defaultAdmin] })
          return
        }
        // Если пользователи есть, но admin отсутствует — добавляем admin/A7225162
        const hasAdmin = state.users.some((u) => u.username.toLowerCase() === 'admin')
        if (!hasAdmin) {
          const defaultAdmin: User = {
            username: 'admin',
            password: simpleHash('A7225162'),
            displayName: 'Главный врач (admin)',
            role: 'admin',
            createdAt: new Date().toISOString(),
          }
          set({ users: [...state.users, defaultAdmin] })
        }
      },

      login: (username, password) => {
        const state = get()
        const user = state.users.find(
          (u) => u.username.toLowerCase() === username.toLowerCase().trim(),
        )
        if (!user) {
          return { success: false, error: 'Пользователь не найден' }
        }
        if (user.password !== simpleHash(password)) {
          return { success: false, error: 'Неверный пароль' }
        }
        set({ currentUser: user, isAuthenticated: true })
        return { success: true }
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false })
      },

      addUser: (user) => {
        const state = get()
        // Проверка: не существует ли уже
        const exists = state.users.find(
          (u) => u.username.toLowerCase() === user.username.toLowerCase().trim(),
        )
        if (exists) {
          return { success: false, error: 'Пользователь с таким логином уже существует' }
        }
        if (!user.username.trim() || !user.password.trim()) {
          return { success: false, error: 'Логин и пароль обязательны' }
        }
        const newUser: User = {
          ...user,
          username: user.username.trim(),
          password: simpleHash(user.password),
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ users: [...s.users, newUser] }))
        return { success: true }
      },

      removeUser: (username) => {
        const state = get()
        const user = state.users.find(
          (u) => u.username.toLowerCase() === username.toLowerCase().trim(),
        )
        if (!user) {
          return { success: false, error: 'Пользователь не найден' }
        }
        if (user.username === 'admin') {
          return { success: false, error: 'Нельзя удалить администратора по умолчанию' }
        }
        set((s) => ({
          users: s.users.filter((u) => u.username !== user.username),
          // Если удаляем текущего — выходим
          currentUser:
            s.currentUser?.username === user.username ? null : s.currentUser,
          isAuthenticated:
            s.currentUser?.username === user.username ? false : s.isAuthenticated,
        }))
        return { success: true }
      },

      changePassword: (username, newPassword) => {
        const state = get()
        const user = state.users.find(
          (u) => u.username.toLowerCase() === username.toLowerCase().trim(),
        )
        if (!user) {
          return { success: false, error: 'Пользователь не найден' }
        }
        if (!newPassword.trim()) {
          return { success: false, error: 'Пароль не может быть пустым' }
        }
        set((s) => ({
          users: s.users.map((u) =>
            u.username === user.username
              ? { ...u, password: simpleHash(newPassword) }
              : u,
          ),
          // Обновим current user если это он
          currentUser:
            s.currentUser?.username === user.username
              ? { ...s.currentUser, password: simpleHash(newPassword) }
              : s.currentUser,
        }))
        return { success: true }
      },
    }),
    {
      name: 'ushihvost-auth-storage',
    },
  ),
)

// Экспортируем хелпер для использования в компонентах
export function getInitialCredentials(): { username: string; password: string } {
  return { username: 'admin', password: 'admin' }
}
