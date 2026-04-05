import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { ModalWarning, ModalConfirm, ModalForm, ModalLogoutAllSessions } from '../../components/modals'
import '../../style/user-management.css'
import type {
  ActionTab,
  ApiUser,
  CreateUserResponse,
  EditUserForm,
  PasswordForm,
  PasswordVisibilityKey,
  StaffForm,
  UserLogs,
  UserRow,
} from '../../types/userManagement'

const INITIAL_FORM: StaffForm = {
  username: '',
  email: '',
  address: '',
  phone: '',
  password: '',
  confirmPassword: '',
}

const INITIAL_PASSWORD_FORM: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const INITIAL_USER_LOGS: UserLogs = {
  1: ['Logged in from main office at 08:16 AM', 'Updated staff profile: staff-jane'],
  2: ['Logged in from command center at 07:45 AM'],
  3: ['Logged in from mobile device at 06:55 AM', 'Submitted emergency report #ER-321'],
  4: ['Account deactivated by admin'],
}

const mapApiUserToRow = (user: ApiUser): UserRow => ({
  id: user.id,
  username: user.username,
  email: user.email,
  address: user.address ?? '',
  phone: user.phone_number ?? '',
  role: user.role,
  status: user.status === 'inactive' ? 'Inactive' : 'Active',
  dateAdded: user.created_at,
  lastLoginAt: null,
})

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export default function UserManagement() {
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [userLogs, setUserLogs] = useState<UserLogs>(INITIAL_USER_LOGS)
  const [searchStaff, setSearchStaff] = useState('')
  const [searchAdmin, setSearchAdmin] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [submittingStaff, setSubmittingStaff] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showActionPanel, setShowActionPanel] = useState(false)
  const [actionTab, setActionTab] = useState<ActionTab>('profile')
  const [staffForm, setStaffForm] = useState<StaffForm>(INITIAL_FORM)
  const [editUserForm, setEditUserForm] = useState<EditUserForm>({
    username: '',
    email: '',
    address: '',
    phone: '',
  })
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(INITIAL_PASSWORD_FORM)
  const [showPassword, setShowPassword] = useState<Record<PasswordVisibilityKey, boolean>>({
    staffPassword: false,
    staffConfirmPassword: false,
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  })
  const [formError, setFormError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [selectedActionUserId, setSelectedActionUserId] = useState<number | null>(null)
  const [statusModalMessage, setStatusModalMessage] = useState('')
  const [showLogoutDevicesPrompt, setShowLogoutDevicesPrompt] = useState(false)
  const [pendingLogoutUser, setPendingLogoutUser] = useState<UserRow | null>(null)
  const [logoutPromptMode, setLogoutPromptMode] = useState<'profile' | 'password'>('profile')
  const [logoutPromptLoading, setLogoutPromptLoading] = useState(false)
  const [showReloginNotice, setShowReloginNotice] = useState(false)
  const [reloginEmail, setReloginEmail] = useState('')
  const [reloginReason, setReloginReason] = useState<'sessions-logged-out' | 'password-changed' | 'account-changed'>('sessions-logged-out')
  const [pendingProfileEditUser, setPendingProfileEditUser] = useState<UserRow | null>(null)
  const [showProfileEditLogoutConfirm, setShowProfileEditLogoutConfirm] = useState(false)

  const staffUsers = useMemo(() => {
    const keyword = searchStaff.trim().toLowerCase()
    return users.filter((user) => {
      if (user.role !== 'staff') return false
      if (!keyword) return true
      return [user.username, user.email, user.address, user.phone].some((field) =>
        field.toLowerCase().includes(keyword)
      )
    })
  }, [users, searchStaff])

  const adminUsers = useMemo(() => {
    const keyword = searchAdmin.trim().toLowerCase()
    return users.filter((user) => {
      if (user.role !== 'admin') return false
      if (!keyword) return true
      return [user.username, user.email, user.address, user.phone].some((field) =>
        field.toLowerCase().includes(keyword)
      )
    })
  }, [users, searchAdmin])

  const selectedActionUser = users.find((item) => item.id === selectedActionUserId) ?? null
  const selectedActionLogs = selectedActionUserId ? userLogs[selectedActionUserId] ?? [] : []

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true)
      setUsersError('')
      try {
        const res = await api.get<ApiUser[]>('/users')
        setUsers(res.data.map(mapApiUserToRow))
      } catch {
        setUsersError('Failed to load users.')
      } finally {
        setLoadingUsers(false)
      }
    }

    loadUsers()
  }, [])

  const addUserLog = (userId: number, action: string) => {
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    const line = `${timestamp} - ${action}`
    setUserLogs((prev) => ({
      ...prev,
      [userId]: [line, ...(prev[userId] ?? [])],
    }))
  }

  const closeAddStaffModal = () => {
    setShowAddStaff(false)
    setFormError('')
    setSubmittingStaff(false)
    setStaffForm(INITIAL_FORM)
  }

  const openActionModal = (id: number) => {
    setFormError('')
    setPasswordError('')
    setPasswordSuccess('')
    setPasswordForm(INITIAL_PASSWORD_FORM)
    setSelectedActionUserId(id)
    setShowActionPanel(true)
    setActionTab('profile')
    const pickedUser = users.find((item) => item.id === id)
    if (pickedUser) {
      setEditUserForm({
        username: pickedUser.username,
        email: pickedUser.email,
        address: pickedUser.address,
        phone: pickedUser.phone,
      })
    }
  }

  const closeActionModal = () => {
    setFormError('')
    setPasswordError('')
    setPasswordSuccess('')
    setPasswordForm(INITIAL_PASSWORD_FORM)
    setLogoutPromptLoading(false)
    setShowActionPanel(false)
    setSelectedActionUserId(null)
  }

  const clearStoredToken = () => {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
  }

  const handleReloginNow = () => {
    setShowReloginNotice(false)
    clearStoredToken()
    const email = encodeURIComponent(reloginEmail)
    window.location.href = `/login?reason=${reloginReason}&email=${email}`
  }

  const triggerSelfRelogin = (reason: 'sessions-logged-out' | 'password-changed' | 'account-changed', email: string) => {
    setReloginReason(reason)
    setReloginEmail(email)
    setShowReloginNotice(true)
  }

  const handleConfirmProfileEditLogout = async () => {
    if (!pendingProfileEditUser) return
    setLogoutPromptLoading(true)

    try {
      await api.post(`/users/${pendingProfileEditUser.id}/logout-all-devices`)
      addUserLog(pendingProfileEditUser.id, 'All active devices logged out after profile edit')
      if (authUser?.id === pendingProfileEditUser.id) {
        triggerSelfRelogin('account-changed', pendingProfileEditUser.email)
        setShowProfileEditLogoutConfirm(false)
        setPendingProfileEditUser(null)
        setLogoutPromptLoading(false)
        return
      }
    } catch {
      // Continue even if logout fails
    }

    setShowProfileEditLogoutConfirm(false)
    setPendingProfileEditUser(null)
    setLogoutPromptLoading(false)
  }

  const updateFormField = <K extends keyof StaffForm>(key: K, value: StaffForm[K]) => {
    setStaffForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateEditField = <K extends keyof EditUserForm>(key: K, value: EditUserForm[K]) => {
    setEditUserForm((prev) => ({ ...prev, [key]: value }))
  }

  const updatePasswordField = <K extends keyof PasswordForm>(key: K, value: PasswordForm[K]) => {
    setPasswordForm((prev) => ({ ...prev, [key]: value }))
  }

  const togglePasswordVisibility = (key: PasswordVisibilityKey) => {
    setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSaveStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

      if (staffForm.password !== staffForm.confirmPassword) {
        setFormError('Passwords do not match.')
        return
      }

      const usernameExists = users.some(
        (user) => user.username.toLowerCase() === staffForm.username.trim().toLowerCase()
      )

      if (usernameExists) {
        setFormError('Username already exists.')
        return
      }

    setSubmittingStaff(true)

    try {
      const res = await api.post<CreateUserResponse>('/users', {
        username: staffForm.username.trim(),
        email: staffForm.email.trim(),
        address: staffForm.address.trim() || null,
        phone_number: staffForm.phone.trim() || null,
        password: staffForm.password,
        role: 'staff',
      })

      const newStaff = mapApiUserToRow(res.data.user)
      setUsers((prev) => [newStaff, ...prev])
      addUserLog(newStaff.id, 'Staff account created by admin')
      closeAddStaffModal()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to add staff account.'
      setFormError(msg)
    } finally {
      setSubmittingStaff(false)
    }
  }

  const handleSaveUserEdits = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedActionUser) return

    const duplicateName = users.some(
      (user) => user.id !== selectedActionUser.id && user.username.toLowerCase() === editUserForm.username.trim().toLowerCase()
    )

    if (duplicateName) {
      setFormError('Username already exists.')
      return
    }

    const payload = {
      username: editUserForm.username.trim(),
      email: editUserForm.email.trim(),
      address: editUserForm.address.trim() || null,
      phone_number: editUserForm.phone.trim() || null,
    }

    const previousUserSnapshot = { ...selectedActionUser }
    const updatedUser = {
      ...selectedActionUser,
      username: editUserForm.username.trim(),
      email: editUserForm.email.trim(),
      address: editUserForm.address.trim(),
      phone: editUserForm.phone.trim(),
    }

    setUsers((prev) => prev.map((user) => (user.id === selectedActionUser.id ? updatedUser : user)))

    try {
      await api.patch(`/users/${selectedActionUser.id}`, payload)
    } catch (err: unknown) {
      setUsers((prev) => prev.map((user) => (user.id === selectedActionUser.id ? previousUserSnapshot : user)))
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save profile changes.'
      setFormError(msg)
      return
    }

    addUserLog(selectedActionUser.id, 'Profile information edited by admin')
    setFormError('')
    closeActionModal()

    // Show confirmation before logging out
    setPendingProfileEditUser(updatedUser)
    setShowProfileEditLogoutConfirm(true)
  }

  const handleConfirmLogoutDevices = async () => {
    if (!pendingLogoutUser) return
    setLogoutPromptLoading(true)

    if (logoutPromptMode === 'password') {
      try {
        await api.post(`/users/${pendingLogoutUser.id}/change-password`, {
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
          new_password_confirmation: passwordForm.confirmPassword,
          logout_all_devices: true,
        })
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update password.'
        setPasswordError(msg)
        setShowLogoutDevicesPrompt(false)
        setShowActionPanel(true)
        setLogoutPromptLoading(false)
        return
      }

      addUserLog(pendingLogoutUser.id, 'Password updated and all sessions logged out')
      setPasswordSuccess('Password changed. All active sessions were logged out.')
      setPasswordForm(INITIAL_PASSWORD_FORM)
      setShowLogoutDevicesPrompt(false)
      setPendingLogoutUser(null)
      setLogoutPromptLoading(false)

      if (authUser?.id === pendingLogoutUser.id) {
        triggerSelfRelogin('password-changed', pendingLogoutUser.email)
        return
      }

      setStatusModalMessage(`Password changed and all active sessions were logged out for ${pendingLogoutUser.email}.`)
      setPendingLogoutUser(null)
      return
    }

    try {
      await api.post(`/users/${pendingLogoutUser.id}/logout-all-devices`)
      addUserLog(pendingLogoutUser.id, 'All active devices logged out after profile edit')
      setShowLogoutDevicesPrompt(false)
      setPendingLogoutUser(null)
      setLogoutPromptLoading(false)

      if (authUser?.id === pendingLogoutUser.id) {
        triggerSelfRelogin('sessions-logged-out', pendingLogoutUser.email)
        return
      }

      setStatusModalMessage(`All active sessions were logged out for ${pendingLogoutUser.email}.`)
      setPendingLogoutUser(null)
    } catch {
      setFormError('Failed to logout all devices for this account.')
      setLogoutPromptLoading(false)
    }
  }

  const handleToggleStatus = async (user: UserRow) => {
    const nextStatus: UserRow['status'] = user.status === 'Active' ? 'Inactive' : 'Active'
    const previousStatus = user.status

    setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item)))

    try {
      await api.patch(`/users/${user.id}/status`, {
        status: nextStatus === 'Active' ? 'active' : 'inactive',
      })
    } catch {
      setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, status: previousStatus } : item)))
      setFormError('Failed to update account status.')
      return
    }
    addUserLog(user.id, `Account set to ${nextStatus}`)

    if (nextStatus === 'Inactive') {
      setStatusModalMessage('Account is deactivated/suspended.')
    } else {
      setStatusModalMessage('Account is activated.')
    }

    if (selectedActionUserId === user.id) {
      closeActionModal()
    }
  }

  const handleDeleteUser = async (user: UserRow) => {
    if (user.role === 'admin') return
    const confirmed = window.confirm(`Delete ${user.username}? This action cannot be undone.`)
    if (!confirmed) return

    const previousUsers = users
    const previousLogs = userLogs
    setUsers((prev) => prev.filter((item) => item.id !== user.id))
    setUserLogs((prev) => {
      const clone = { ...prev }
      delete clone[user.id]
      return clone
    })

    try {
      await api.delete(`/users/${user.id}`)
    } catch {
      setUsers(previousUsers)
      setUserLogs(previousLogs)
      setFormError('Failed to delete user from server.')
      return
    }

    if (selectedActionUserId === user.id) {
      closeActionModal()
    }
    setFormError('')
  }

  const handleChangePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedActionUser) return

    setPasswordError('')
    setPasswordSuccess('')

    if (passwordForm.currentPassword.trim().length < 6) {
      setPasswordError('Current (old) password must be at least 6 characters.')
      return
    }

    if (passwordForm.newPassword.trim().length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.')
      return
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password should be different from current password.')
      return
    }

    setLogoutPromptMode('password')
    setShowActionPanel(false)
    setPendingLogoutUser({ ...selectedActionUser })
    setLogoutPromptLoading(false)
    setShowLogoutDevicesPrompt(true)
  }

  return (
    <div className="um-page">
      <h1 className="um-title">User Management</h1>

      <section className="um-card">
        <div className="um-card-header">
          <h2 className="um-section-title">Manage Staff</h2>
          <div className="um-actions">
            <button className="um-add-btn" onClick={() => setShowAddStaff(true)} type="button">
              <i className="bi bi-plus-circle me-1" />Add Staff
            </button>
            <div className="um-search-wrap">
              <i className="bi bi-search" />
              <input
                type="text"
                placeholder="Search Staff"
                value={searchStaff}
                onChange={(event) => setSearchStaff(event.target.value)}
              />
            </div>
          </div>
        </div>

        {usersError && <p className="um-error mx-3 mt-2">{usersError}</p>}
        {loadingUsers && <p className="text-muted small mx-3 mt-2 mb-0">Loading users...</p>}

        <div className="table-responsive">
          <table className="table um-table um-table-mobile-cards align-middle mb-0">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Date Added</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No staff records found.
                  </td>
                </tr>
              ) : (
                staffUsers.map((user) => (
                  <tr key={user.id}>
                    <td data-label="Username">{user.username}</td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Address">{user.address || '-'}</td>
                    <td data-label="Phone">{user.phone || '-'}</td>
                    <td data-label="Date Added">{formatDate(user.dateAdded)}</td>
                    <td data-label="Status">
                      <span
                        className={
                          user.status === 'Active' ? 'um-status um-status-active' : 'um-status um-status-inactive'
                        }
                      >
                        {user.status}
                      </span>
                    </td>
                    <td data-label="Actions" className="um-actions-cell">
                      <div className="um-table-actions">
                        <button type="button" className="um-settings-btn" onClick={() => openActionModal(user.id)}>
                          <i className="bi bi-gear-fill" />
                          <span className="um-settings-label">Manage</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="um-card mt-4">
        <div className="um-card-header">
          <h2 className="um-section-title">Admin Accounts</h2>
          <div className="um-actions">
            <span className="um-note">Add Admin is disabled by UI policy</span>
            <div className="um-search-wrap">
              <i className="bi bi-search" />
              <input
                type="text"
                placeholder="Search Admin"
                value={searchAdmin}
                onChange={(event) => setSearchAdmin(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table um-table um-table-mobile-cards align-middle mb-0">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Date Added</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No admin records found.
                  </td>
                </tr>
              ) : (
                adminUsers.map((user) => (
                  <tr key={user.id}>
                    <td data-label="Username">{user.username}</td>
                    <td data-label="Email">{user.email}</td>
                    <td data-label="Address">{user.address || '-'}</td>
                    <td data-label="Phone">{user.phone || '-'}</td>
                    <td data-label="Date Added">{formatDate(user.dateAdded)}</td>
                    <td data-label="Status">
                      <span
                        className={
                          user.status === 'Active' ? 'um-status um-status-active' : 'um-status um-status-inactive'
                        }
                      >
                        {user.status}
                      </span>
                    </td>
                    <td data-label="Actions" className="um-actions-cell">
                      <div className="um-table-actions">
                        <button type="button" className="um-settings-btn" onClick={() => openActionModal(user.id)}>
                          <i className="bi bi-gear-fill" />
                          <span className="um-settings-label">Manage</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAddStaff && (
        <ModalForm
          isOpen={showAddStaff}
          icon="bi-person-plus"
          title="Add New Staff"
          subtitle="Fill all required fields to create a new staff account."
          onClose={closeAddStaffModal}
          onSubmit={handleSaveStaff}
          isSubmitting={submittingStaff}
          error={formError}
        >
          <div className="um-field-grid">
            <label className="um-field">
              <span>Username <strong>*</strong></span>
              <div className="um-input-wrap">
                <i className="bi bi-person" />
                <input
                  required
                  type="text"
                  value={staffForm.username}
                  onChange={(event) => updateFormField('username', event.target.value)}
                />
              </div>
            </label>

            <label className="um-field">
              <span>Email <strong>*</strong></span>
              <div className="um-input-wrap">
                <i className="bi bi-envelope" />
                <input
                  required
                  type="email"
                  value={staffForm.email}
                  onChange={(event) => updateFormField('email', event.target.value)}
                />
              </div>
            </label>

            <label className="um-field">
              <span>Address</span>
              <div className="um-input-wrap">
                <i className="bi bi-geo-alt" />
                <input
                  type="text"
                  value={staffForm.address}
                  onChange={(event) => updateFormField('address', event.target.value)}
                />
              </div>
            </label>

            <label className="um-field">
              <span>Phone</span>
              <div className="um-input-wrap">
                <i className="bi bi-telephone" />
                <input
                  type="text"
                  value={staffForm.phone}
                  onChange={(event) => updateFormField('phone', event.target.value)}
                />
              </div>
            </label>

            <label className="um-field">
              <span>Password <strong>*</strong></span>
              <div className="um-input-wrap">
                <i className="bi bi-lock" />
                <input
                  required
                  minLength={6}
                  type={showPassword.staffPassword ? 'text' : 'password'}
                  value={staffForm.password}
                  onChange={(event) => updateFormField('password', event.target.value)}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="text"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="um-eye-btn"
                  onClick={() => togglePasswordVisibility('staffPassword')}
                  aria-label={showPassword.staffPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi ${showPassword.staffPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
            </label>

            <label className="um-field">
              <span>Confirm Password <strong>*</strong></span>
              <div className="um-input-wrap">
                <i className="bi bi-shield-check" />
                <input
                  required
                  minLength={6}
                  type={showPassword.staffConfirmPassword ? 'text' : 'password'}
                  value={staffForm.confirmPassword}
                  onChange={(event) => updateFormField('confirmPassword', event.target.value)}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="text"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="um-eye-btn"
                  onClick={() => togglePasswordVisibility('staffConfirmPassword')}
                  aria-label={showPassword.staffConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`bi ${showPassword.staffConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                </button>
              </div>
            </label>
          </div>
        </ModalForm>
      )}

      {showActionPanel && selectedActionUser && (
        <>
          <div className="um-mini-backdrop" onClick={closeActionModal} />
          <section className="um-mini-modal" role="dialog" aria-modal="true" aria-label="Account quick actions">
            <aside className="um-mini-nav">
              <h4>{selectedActionUser.username}</h4>
              <button
                type="button"
                className={`um-mini-nav-btn${actionTab === 'profile' ? ' active' : ''}`}
                onClick={() => setActionTab('profile')}
              >
                <i className="bi bi-person-vcard" />Profile Edit
              </button>
              <button
                type="button"
                className={`um-mini-nav-btn${actionTab === 'account' ? ' active' : ''}`}
                onClick={() => setActionTab('account')}
              >
                <i className="bi bi-shield-check" />Account Center
              </button>
              <button
                type="button"
                className={`um-mini-nav-btn${actionTab === 'logs' ? ' active' : ''}`}
                onClick={() => setActionTab('logs')}
              >
                <i className="bi bi-journal-text" />Activity Logs
              </button>
            </aside>

            <div className="um-mini-content">
              <div className="um-mini-header">
                <div>
                  <h4>
                    <i className="bi bi-sliders me-2" />{actionTab === 'profile' ? 'Profile Edit' : actionTab === 'account' ? 'Account Center' : 'Activity Logs'}
                  </h4>
                  <p>{selectedActionUser.role === 'admin' ? 'Admin account' : 'Staff account'}</p>
                </div>
                <button type="button" className="um-close-btn" onClick={closeActionModal} aria-label="Close">
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              {actionTab === 'profile' && (
                <form className="um-mini-section" onSubmit={handleSaveUserEdits}>
                  <div className="um-mini-edit-grid">
                    <label className="um-field">
                      <span>Username</span>
                      <div className="um-input-wrap">
                        <i className="bi bi-person" />
                        <input
                          type="text"
                          value={editUserForm.username}
                          onChange={(event) => updateEditField('username', event.target.value)}
                          required
                        />
                      </div>
                    </label>

                    <label className="um-field">
                      <span>Email</span>
                      <div className="um-input-wrap">
                        <i className="bi bi-envelope" />
                        <input
                          type="email"
                          value={editUserForm.email}
                          onChange={(event) => updateEditField('email', event.target.value)}
                          required
                        />
                      </div>
                    </label>

                    <label className="um-field">
                      <span>Address</span>
                      <div className="um-input-wrap">
                        <i className="bi bi-geo-alt" />
                        <input
                          type="text"
                          value={editUserForm.address}
                          onChange={(event) => updateEditField('address', event.target.value)}
                        />
                      </div>
                    </label>

                    <label className="um-field">
                      <span>Phone</span>
                      <div className="um-input-wrap">
                        <i className="bi bi-telephone" />
                        <input
                          type="text"
                          value={editUserForm.phone}
                          onChange={(event) => updateEditField('phone', event.target.value)}
                        />
                      </div>
                    </label>

                    <label className="um-field">
                      <span>Date Added</span>
                      <div className="um-input-wrap um-input-wrap-readonly">
                        <i className="bi bi-calendar2" />
                        <input type="text" value={formatDate(selectedActionUser.dateAdded)} readOnly />
                      </div>
                    </label>

                  </div>

                  {formError && <p className="um-error">{formError}</p>}

                  <div className="um-mini-actions">
                    <button type="submit" className="um-mini-action">
                      <i className="bi bi-save" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              )}

              {actionTab === 'account' && (
                <div className="um-mini-section">
                  <div className="um-mini-actions">
                    {selectedActionUser.role !== 'admin' && (
                      <button type="button" className="um-mini-action" onClick={() => void handleToggleStatus(selectedActionUser)}>
                        <i className="bi bi-power" />
                        <span>{selectedActionUser.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}</span>
                      </button>
                    )}

                    {selectedActionUser.role !== 'admin' && (
                      <button type="button" className="um-mini-action um-mini-action-danger" onClick={() => void handleDeleteUser(selectedActionUser)}>
                        <i className="bi bi-trash" />
                        <span>Delete Account</span>
                      </button>
                    )}
                  </div>

                  <form className="um-password-panel" onSubmit={handleChangePassword}>
                    <p className="um-password-title">Change Password</p>

                    <label className="um-field">
                      <span>Current (Old) Password</span>
                      <div className="um-input-wrap">
                        <i className="bi bi-lock" />
                        <input
                          type={showPassword.currentPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                          required
                          autoComplete="current-password"
                          autoCapitalize="none"
                          autoCorrect="off"
                          inputMode="text"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="um-eye-btn"
                          onClick={() => togglePasswordVisibility('currentPassword')}
                          aria-label={showPassword.currentPassword ? 'Hide password' : 'Show password'}
                        >
                          <i className={`bi ${showPassword.currentPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                        </button>
                      </div>
                    </label>

                    <div className="um-mini-edit-grid">
                      <label className="um-field">
                        <span>New Password</span>
                        <div className="um-input-wrap">
                          <i className="bi bi-key" />
                          <input
                            type={showPassword.newPassword ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                            required
                            autoComplete="new-password"
                            autoCapitalize="none"
                            autoCorrect="off"
                            inputMode="text"
                            spellCheck={false}
                          />
                          <button
                            type="button"
                            className="um-eye-btn"
                            onClick={() => togglePasswordVisibility('newPassword')}
                            aria-label={showPassword.newPassword ? 'Hide password' : 'Show password'}
                          >
                            <i className={`bi ${showPassword.newPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                          </button>
                        </div>
                      </label>

                      <label className="um-field">
                        <span>Confirm New Password</span>
                        <div className="um-input-wrap">
                          <i className="bi bi-shield-check" />
                          <input
                            type={showPassword.confirmNewPassword ? 'text' : 'password'}
                            value={passwordForm.confirmPassword}
                            onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                            required
                            autoComplete="new-password"
                            autoCapitalize="none"
                            autoCorrect="off"
                            inputMode="text"
                            spellCheck={false}
                          />
                          <button
                            type="button"
                            className="um-eye-btn"
                            onClick={() => togglePasswordVisibility('confirmNewPassword')}
                            aria-label={showPassword.confirmNewPassword ? 'Hide password' : 'Show password'}
                          >
                            <i className={`bi ${showPassword.confirmNewPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                          </button>
                        </div>
                      </label>
                    </div>

                    {passwordError && <p className="um-error">{passwordError}</p>}
                    {passwordSuccess && <p className="um-success">{passwordSuccess}</p>}

                    <div className="um-mini-actions">
                      <button type="submit" className="um-mini-action">
                        <i className="bi bi-arrow-repeat" />
                        <span>Update Password</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {actionTab === 'logs' && (
                <div className="um-mini-section">
                  <div className="um-log-list">
                    {selectedActionLogs.length === 0 ? (
                      <p className="um-log-empty">No logs available yet.</p>
                    ) : (
                      selectedActionLogs.map((entry, index) => (
                        <div key={`${entry}-${index}`} className="um-log-item">
                          <i className="bi bi-clock-history" />
                          <span>{entry}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {statusModalMessage && (
        <ModalWarning
          isOpen={Boolean(statusModalMessage)}
          title="Account Status"
          message={statusModalMessage}
          onClose={() => setStatusModalMessage('')}
        />
      )}

      {showLogoutDevicesPrompt && pendingLogoutUser && (
        <ModalConfirm
          isOpen={showLogoutDevicesPrompt}
          title={logoutPromptMode === 'password' ? 'Confirm Password Update' : 'Profile Updated'}
          message={
            logoutPromptMode === 'password'
              ? `Change password and logout all active devices for ${pendingLogoutUser.email}?`
              : `Logout all active devices for ${pendingLogoutUser.email}?`
          }
          icon="bi-shield-lock"
          confirmText="Logout All Devices"
          isLoading={logoutPromptLoading}
          onConfirm={() => void handleConfirmLogoutDevices()}
          onCancel={() => {
            if (!logoutPromptLoading) {
              setShowLogoutDevicesPrompt(false)
              setPendingLogoutUser(null)
              if (logoutPromptMode === 'password') {
                setShowActionPanel(true)
              }
            }
          }}
        />
      )}

      <ModalLogoutAllSessions
        isOpen={showProfileEditLogoutConfirm}
        user={pendingProfileEditUser}
        isLoading={logoutPromptLoading}
        onConfirm={handleConfirmProfileEditLogout}
        onCancel={() => {
          setShowProfileEditLogoutConfirm(false)
          setPendingProfileEditUser(null)
        }}
      />

      {showReloginNotice && (
        <ModalWarning
          isOpen={showReloginNotice}
          title="Account Changed"
          message={`Your account was changed${reloginEmail ? ` (${reloginEmail})` : ''}. Please re-login. You will be logged out now.`}
          icon="bi-shield-lock"
          actionText="OK, Logout Now"
          onClose={handleReloginNow}
        />
      )}
    </div>
  )
}
