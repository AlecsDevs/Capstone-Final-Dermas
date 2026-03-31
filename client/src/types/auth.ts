export interface User {
  id: number
  username: string
  email?: string
  address?: string | null
  phone_number?: string | null
  role: 'admin' | 'staff'
  created_at: string
}

export interface SessionInfo {
  device_name: string
  ip_address: string
  user_agent?: string
}

export interface LoginCredentials {
  username: string
  password: string
  rememberMe?: boolean
}

export interface AuthResponse {
  token: string
  user: User
  session?: SessionInfo
}