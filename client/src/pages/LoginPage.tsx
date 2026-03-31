import React, { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import '../style/login.css'
import avatarImg from '../assets/Mdrrmo_logo.png'
import loginBgVideo from '../assets/login-bg.mp4'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [deactivatedModalOpen, setDeactivatedModalOpen] = useState(false)
  const [logoutDevicesModalOpen, setLogoutDevicesModalOpen] = useState(false)
  const [logoutEmail, setLogoutEmail] = useState('')
  const [logoutReason, setLogoutReason] = useState<'sessions-logged-out' | 'password-changed' | 'account-changed'>('sessions-logged-out')
  const { login, user, loading: authLoading } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('reason') === 'deactivated') {
      setDeactivatedModalOpen(true)
    }
    const reason = params.get('reason')
    if (reason === 'sessions-logged-out' || reason === 'password-changed' || reason === 'account-changed') {
      setLogoutEmail(params.get('email') ?? '')
      setLogoutReason(reason as 'sessions-logged-out' | 'password-changed' | 'account-changed')
      setLogoutDevicesModalOpen(true)
    }
  }, [location.search])

  // Still verifying token – render nothing to avoid flash
  if (authLoading) return null

  // Already logged in – skip login page
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/staff/dashboard'} replace />
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ username, password, rememberMe })

    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid username or password.'
      if (msg.toLowerCase().includes('deactivated') || msg.toLowerCase().includes('suspend')) {
        setDeactivatedModalOpen(true)
      } else {
        setError(msg)
      }

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page d-flex vh-100 w-100 m-0">
      {/* Left panel */}
      <div className="left-container d-flex align-items-center justify-content-center">
        <video className="left-bg-video" autoPlay muted loop playsInline>
          <source src={loginBgVideo} type="video/mp4" />
        </video>
        <div className="text-center px-4">
          <h1 className="display-4 text-white mb-3 fw-bold">
            MDRRMO
            <br />
            <span className="login-portal-title">Login Portal</span>
          </h1>
          <p className="text-white-50 fs-5 fw-light login-tagline">
            Secure access to disaster management and emergency report system
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="right-container d-flex align-items-center justify-content-center">
        <div className="login-form">
          <div className="text-center mb-4">
            <img src={avatarImg} alt="Avatar"   className="img-fluid rounded-circle mb-3 w-30" />
            <h2 className="h4 text-dark mb-1 fw-semibold">Welcome Back</h2>
            <p className="text-muted small">Please sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group mb-3">
              <span className="input-group-text">
                <i className="bi bi-person-fill" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="input-group mb-3">
              <span className="input-group-text">
                <i className="bi bi-lock-fill" />
              </span>
              <input
                type="password"
                className="form-control"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="alert alert-danger py-2 small mb-3" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-1" />
                {error}
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="form-check">
                <input
                  disabled={loading}
                  className="form-check-input"
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="form-check-label text-muted small" htmlFor="rememberMe">
                  Remember me
                </label>
              </div>
              <a href="#" 
              onClick={(e) =>{
                if(loading){
                  e.preventDefault();
                }
              }}
              className="link-primary-custom  ">Forgot password?</a>
            </div>

            <button type="submit" className="btn btn-primary btn-login" disabled={loading }>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>

      {deactivatedModalOpen && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-semibold text-danger">
                    <i className="bi bi-shield-exclamation me-2" />Account Deactivated
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setDeactivatedModalOpen(false)
                      navigate('/login', { replace: true })
                    }}
                  />
                </div>
                <div className="modal-body text-muted">
                  Your account is deactivated. Please contact admin.
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setDeactivatedModalOpen(false)
                      navigate('/login', { replace: true })
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {logoutDevicesModalOpen && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-semibold text-primary">
                    <i className="bi bi-shield-lock me-2" />Re-login Required
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setLogoutDevicesModalOpen(false)
                      navigate('/login', { replace: true })
                    }}
                  />
                </div>
                <div className="modal-body text-muted">
                  {logoutReason === 'account-changed'
                    ? `Your account was updated${logoutEmail ? ` (${logoutEmail})` : ''}. Please re-login.`
                    : `Your account was changed${logoutEmail ? ` (${logoutEmail})` : ''}. Please re-login.`}
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setLogoutDevicesModalOpen(false)
                      navigate('/login', { replace: true })
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </div>
  )
}

