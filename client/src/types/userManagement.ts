export type UserRole = 'admin' | 'staff'

export interface UserRow {
  id: number
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
  username: string
  email: string
  address: string
  phone: string
  password: string
  confirmPassword: string
}

export interface EditUserForm {
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
  username: string
  email: string
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
