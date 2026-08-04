import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { login as loginRequest } from '../api/auth'
import { setAuthToken, setUnauthorizedHandler } from '../api/client'
import type { User } from '../types'

const STORAGE_KEY = 'gym_auth'

interface StoredAuth {
  token: string
  user: User
}

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function loadStored(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredAuth
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = loadStored()
    if (stored) {
      setAuthToken(stored.token)
      setUser(stored.user)
      setToken(stored.token)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem(STORAGE_KEY)
      setAuthToken(null)
      setUser(null)
      setToken(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  async function login(username: string, password: string) {
    const result = await loginRequest(username, password)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: result.access_token, user: result.user }))
    setAuthToken(result.access_token)
    setUser(result.user)
    setToken(result.access_token)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setAuthToken(null)
    setUser(null)
    setToken(null)
  }

  return <AuthContext.Provider value={{ user, token, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function isBranchManager(user: User | null) {
  return user?.role === 'Branch Manager'
}

export function canApprove(user: User | null) {
  return user?.role === 'Head Office' || user?.role === 'CEO'
}

const ROLE_PAGES: Record<string, string[]> = {
  'Branch Manager': ['dashboard', 'scanner', 'members', 'renewals', 'promotions'],
}

export function allowedPages(user: User | null): string[] | null {
  if (!user) return null
  return ROLE_PAGES[user.role] ?? null
}
