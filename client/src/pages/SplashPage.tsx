import { useCallback, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import '../style/splash.css'
import { useAuth } from '../context/AuthContext'

export default function SplashPage() {
  const navigate          = useNavigate()
  const { user, loading } = useAuth()

  const go = useCallback(() => {
    const el = document.getElementById('startup-screen')
    if (el) {
      el.style.transition = 'opacity 0.5s ease-out'
      el.style.opacity    = '0'
    }
    setTimeout(() => navigate('/login'), 500)
  }, [navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') go()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  // Still verifying token – render nothing to avoid flash
  if (loading) return null

  // Already logged in – go straight to dashboard, no splash
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/staff/dashboard'} replace />
  }

  return (
    <div
      id="startup-screen"
      className="splash-screen"
      onClick={go}
      role="button"
      tabIndex={0}
    >
      <div className="blue-overlay" />
      <div className="splash-content container text-center">
        <h1 className="fw-bold mb-4">
          MDRRMO
          <br />
          <span style={{ fontWeight: 500, fontSize: '0.7em', opacity: 0.95 }}>
            MANAGEMENT AND ANALYSIS OF
            <br />
            DISASTER AND EMERGENCY 
                <br />
            REPORTS
          </span>
        </h1>
        <p className="tap-text">
          <span style={{ fontSize: '0.8em', opacity: 0.8 }}>✨</span>
          &nbsp;Tap anywhere to continue&nbsp;
          <span style={{ fontSize: '0.8em', opacity: 0.8 }}>✨</span>
        </p>
      </div>
    </div>
  )
}
