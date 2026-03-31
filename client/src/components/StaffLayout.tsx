import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import '../style/sidebar.css'
import { useSessionWatch } from '../hooks/useSessionWatch'

export const StaffLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('darkMode') === 'true'
  })
  const { otherDeviceJoined, dismiss } = useSessionWatch()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  return (
    <div className={darkMode ? 'layout dark-mode' : 'layout'}>
      {/* Other-device login warning */}
      {otherDeviceJoined && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
        >
          <div className="session-watch-card rounded-3 shadow-lg p-4" style={{ maxWidth: 420, width: '90%' }}>
            <div className="d-flex align-items-center mb-3">
              <i className="bi bi-shield-exclamation text-warning fs-3 me-3" />
              <h5 className="mb-0 fw-semibold">Account Logged In Elsewhere</h5>
            </div>
            <p className="session-watch-text mb-1">
              Your account has just been <strong>logged in on another device or browser tab</strong>.
            </p>
            <p className="session-watch-text session-watch-text-muted small mb-4">
              This is just a notice — you have not been logged out. If this wasn't you, please change your password immediately.
            </p>
            <div className="d-flex justify-content-end">
              <button className="btn btn-warning" onClick={dismiss}>
                OK, Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {sidebarOpen && (
        <div className="sidebar-overlay d-lg-none" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar role="staff" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="layout-body">
        <TopBar
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
