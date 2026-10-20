import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'vet'
}

export interface Clinic {
  id: string
  name: string
  plan: string
  visitLimit: number
}

interface AuthState {
  users: User[]
  currentUser: User | null
  currentClinic: Clinic | null
  isAuthenticated: boolean
  token: string | null
  
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  initializeDefault: () => void
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUser: null,
      currentClinic: null,
      isAuthenticated: false,
      token: null,

      initializeDefault: () => {
        // Ничего не делаем — пользователи в PostgreSQL, не в localStorage
      },

      restoreSession: async () => {
        const token = get().token
        if (!token) return
        
        try {
          const resp = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (resp.ok) {
            const data = await resp.json()
            if (data.success) {
              set({
                currentUser: data.user,
                currentClinic: data.clinic,
                isAuthenticated: true,
              })
            } else {
              set({ currentUser: null, currentClinic: null, isAuthenticated: false, token: null })
            }
          }
        } catch {
          set({ currentUser: null, currentClinic: null, isAuthenticated: false, token: null })
        }
      },

      login: async (username: string, password: string) => {
        try {
          const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          })
          const data = await resp.json()
          
          if (!resp.ok || !data.success) {
            return { success: false, error: data.error || 'Ошибка входа' }
          }

          set({
            currentUser: data.user,
            currentClinic: data.clinic,
            isAuthenticated: true,
            token: data.token,
          })
          return { success: true }
        } catch (e: any) {
          return { success: false, error: 'Ошибка сети: ' + e.message }
        }
      },

      logout: async () => {
        const token = get().token
        if (token) {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
            })
          } catch {}
        }
        set({ currentUser: null, currentClinic: null, isAuthenticated: false, token: null })
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
