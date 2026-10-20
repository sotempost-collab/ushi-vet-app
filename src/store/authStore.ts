// Мультитенант auth-store: серверная авторизация с указанием клиники.
//
// Логин: login(clinicSlug, username, password) → POST /api/auth/login →
//   { success, token, user, clinic, expiresAt }.
// Хранится в localStorage только { token, currentUser, currentClinic, isAuthenticated }.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'vet' | 'receptionist'
}

export interface Clinic {
  id: string
  slug: string // ← короткое имя для входа и URL
  name: string
  plan: string
  visitLimit: number
}

interface AuthState {
  token: string | null
  currentUser: User | null
  currentClinic: Clinic | null
  isAuthenticated: boolean

  login: (
    clinicSlug: string,
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      currentUser: null,
      currentClinic: null,
      isAuthenticated: false,

      login: async (clinicSlug, username, password) => {
        try {
          const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clinicSlug, username, password }),
          })
          const data = await resp.json()

          if (!resp.ok || !data.success) {
            return { success: false, error: data.error || 'Ошибка входа' }
          }

          set({
            token: data.token,
            currentUser: {
              id: data.user.id,
              username: data.user.username,
              displayName: data.user.displayName,
              role: data.user.role,
            },
            currentClinic: {
              id: data.clinic.id,
              slug: data.clinic.slug,
              name: data.clinic.name,
              plan: data.clinic.plan,
              visitLimit: data.clinic.visitLimit,
            },
            isAuthenticated: true,
          })
          return { success: true }
        } catch (e: any) {
          return {
            success: false,
            error:
              'Не удалось подключиться к серверу. Проверьте, что приложение запущено с поддержкой API-роутов.',
          }
        }
      },

      restoreSession: async () => {
        const token = get().token
        if (!token) return

        try {
          const resp = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (resp.ok) {
            const data = await resp.json()
            if (data.success) {
              set({
                currentUser: data.user,
                currentClinic: data.clinic,
                isAuthenticated: true,
              })
              return
            }
          }
          set({
            currentUser: null,
            currentClinic: null,
            isAuthenticated: false,
            token: null,
          })
        } catch {
          set({
            currentUser: null,
            currentClinic: null,
            isAuthenticated: false,
            token: null,
          })
        }
      },

      logout: async () => {
        const token = get().token
        if (token) {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            })
          } catch {}
        }
        set({
          token: null,
          currentUser: null,
          currentClinic: null,
          isAuthenticated: false,
        })
      },

      clearSession: () => {
        set({
          token: null,
          currentUser: null,
          currentClinic: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'ushihvost-auth-storage',
      partialize: (state) => ({
        token: state.token,
        currentUser: state.currentUser,
        currentClinic: state.currentClinic,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
