import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import api from '../api/axios'
import type { User, LoginCredentials } from '../types/auth'

const TOKEN_KEY = 'token'
const REMEMBER_TOKEN_KEY = 'remember_token'
const DEVICE_NAME_KEY = 'device_name'

const getStoredToken = () => {
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(REMEMBER_TOKEN_KEY)
}

const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REMEMBER_TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(DEVICE_NAME_KEY)
  sessionStorage.removeItem(DEVICE_NAME_KEY)
}

const storeToken = (token: string, rememberMe: boolean) => {
  // Always keep the active token in this tab so different tabs can hold different accounts.
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.setItem(TOKEN_KEY, token)

  // Persist only when requested, without forcing other tabs to switch accounts.
  if (rememberMe) {
    localStorage.setItem(REMEMBER_TOKEN_KEY, token)
  }
}

interface AuthContextType {
  user    : User | null
  loading : boolean
  login   : (credentials: LoginCredentials) => Promise<void>
  logout  : () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check token on page load
  useEffect(() => {
    const token = getStoredToken()
    if (token) {
      api.get('/me')
        .then(res => setUser(res.data))
        .catch(() => {
          clearStoredToken()
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async ({ username, password, rememberMe = false }: LoginCredentials) => {
    const res = await api.post('/login', { username, password })
    storeToken(res.data.token, rememberMe)
    setUser(res.data.user)
  }

  const logout = async () => {
    try {
      await api.post('/logout')
    } finally {
      clearStoredToken()
      setUser(null)
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}