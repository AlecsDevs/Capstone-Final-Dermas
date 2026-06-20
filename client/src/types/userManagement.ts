export type UserRole = 'admin' | 'staff'

export interface UserRow {
  id: number
  fullName: string
  username: string
  email: string
  address: string
  phone: string
  role: UserRole
  status: 'Active' | 'Inactive'
  dateAdded: string
  lastLoginAt: string | null
}

export interface UserLogs {
  [userId: number]: string[]
}

export interface StaffForm {
  fullName: string
  username: string
  email: string
  address: string
  phone: string
  password: string
  confirmPassword: string
}

export interface EditUserForm {
  fullName: string
  username: string
  email: string
  address: string
  phone: string
}

export interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export type ActionTab = 'profile' | 'account' | 'logs'

export type PasswordVisibilityKey =
  | 'staffPassword'
  | 'staffConfirmPassword'
  | 'currentPassword'
  | 'newPassword'
  | 'confirmNewPassword'

export interface ApiUser {
  id: number
  full_name: string | null
  username: string
  email: string | null
  address: string | null
  phone_number: string | null
  role: UserRole
  status: 'active' | 'inactive'
  created_at: string
}

export interface CreateUserResponse {
  message: string
  user: ApiUser
}

export interface ActivityLogEntry {
  id: number
  user_id: number | null
  action: 'login' | 'create_user' | 'create_report' | 'submit_report' | 'profile_update' | 'status_change' | 'password_change' | string
  description: string | null
  ip_address: string | null
  user_agent: string | null
  device_type: 'Desktop' | 'Mobile' | 'Tablet' | string | null
  browser: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  user: { id: number; full_name: string; username: string; role: string } | null
}
